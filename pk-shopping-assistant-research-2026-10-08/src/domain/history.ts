import { ACTIVE_HISTORY_WINDOW_MS, FUTURE_CLOCK_ERROR_MS } from './limits.js';
import { summarizePriceComponents } from './money.js';
import type { Money, Observation, PaymentContext, UtcIso } from './types.js';

const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export type TimestampRelation = 'active' | 'older' | 'future' | 'invalid';

export interface TimestampClassification {
  relation: TimestampRelation;
  epochMs: number | null;
  clockError: boolean;
}

export interface HistoryQuery {
  offerId: string;
  variantRevision: number;
  offerContextRevision: number;
  priceBasis: 'item' | 'delivered';
  locationScope: string | null;
  paymentContext: PaymentContext | null;
}

export interface DailyHistorySample {
  date: string;
  observationId: string;
  observedAt: UtcIso;
  amount: Money;
}

export interface HistoryGap {
  afterDate: string;
  beforeDate: string;
  missingDays: number;
}

export interface HistorySummary {
  rawCount: number;
  dailyCount: number;
  firstObservedAt: UtcIso | null;
  lastObservedAt: UtcIso | null;
  samples: DailyHistorySample[];
  gaps: HistoryGap[];
  duplicateOperationCount: number;
  olderCount: number;
  futureCount: number;
  invalidTimestampCount: number;
  clockErrorCount: number;
  excludedStatusCount: number;
  excludedContextCount: number;
  incompletePriceCount: number;
}

function nowEpoch(clock: Date | number): number {
  const value = typeof clock === 'number' ? clock : clock.getTime();
  if (!Number.isFinite(value)) throw new RangeError('now must be a valid instant');
  return value;
}

/** Accepts UTC instants only and classifies the inclusive rolling 90-day window. */
export function classifyUtcTimestamp(value: unknown, now: Date | number): TimestampClassification {
  const nowMs = nowEpoch(now);
  if (typeof value !== 'string' || !UTC_ISO_PATTERN.test(value)) {
    return { relation: 'invalid', epochMs: null, clockError: false };
  }
  const epochMs = Date.parse(value);
  if (!Number.isFinite(epochMs) || new Date(epochMs).toISOString().slice(0, 19) !== value.slice(0, 19)) {
    return { relation: 'invalid', epochMs: null, clockError: false };
  }
  if (epochMs > nowMs) {
    return { relation: 'future', epochMs, clockError: epochMs - nowMs > FUTURE_CLOCK_ERROR_MS };
  }
  if (epochMs < nowMs - ACTIVE_HISTORY_WINDOW_MS) {
    return { relation: 'older', epochMs, clockError: false };
  }
  return { relation: 'active', epochMs, clockError: false };
}

/** Keeps the first received representation of each operation ID. Input is not changed. */
export function deduplicateOperations(observations: readonly Observation[]): Observation[] {
  const sorted = observations.map((observation, index) => ({ observation, index })).sort((left, right) => {
    const receivedOrder = Date.parse(left.observation.receivedAt) - Date.parse(right.observation.receivedAt);
    return Number.isFinite(receivedOrder) && receivedOrder !== 0 ? receivedOrder : left.index - right.index;
  });
  const seen = new Set<string>();
  const result: Observation[] = [];
  for (const { observation } of sorted) {
    if (seen.has(observation.operationId)) continue;
    seen.add(observation.operationId);
    result.push(observation);
  }
  return result;
}

function normalized(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function deliveredContextMatches(observation: Observation, query: HistoryQuery): boolean {
  if (query.locationScope === null || query.paymentContext === null) return false;
  const { locationScope, paymentContext } = observation.price;
  return locationScope.state === 'known'
    && paymentContext.state === 'known'
    && normalized(locationScope.value) === normalized(query.locationScope)
    && paymentContext.value === query.paymentContext;
}

function priceFor(observation: Observation, query: HistoryQuery): Money | null {
  if (query.priceBasis === 'item') {
    return summarizePriceComponents(observation.price).item;
  }
  if (!deliveredContextMatches(observation, query)) return null;
  return summarizePriceComponents(observation.price).deliveredTotal;
}

function karachiDateKey(epochMs: number): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(epochMs);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find(candidate => candidate.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function gapsBetween(samples: readonly DailyHistorySample[]): HistoryGap[] {
  const gaps: HistoryGap[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (previous === undefined || current === undefined) continue;
    const days = Math.round((Date.parse(`${current.date}T00:00:00Z`) - Date.parse(`${previous.date}T00:00:00Z`)) / 86_400_000);
    if (days > 1) gaps.push({ afterDate: previous.date, beforeDate: current.date, missingDays: days - 1 });
  }
  return gaps;
}

export function summarizeHistory(
  observations: readonly Observation[],
  query: HistoryQuery,
  now: Date | number,
): HistorySummary {
  const unique = deduplicateOperations(observations);
  const duplicateOperationCount = observations.length - unique.length;
  let olderCount = 0;
  let futureCount = 0;
  let invalidTimestampCount = 0;
  let clockErrorCount = 0;
  let excludedStatusCount = 0;
  let excludedContextCount = 0;
  let incompletePriceCount = 0;
  const points: Array<{ observation: Observation; epochMs: number; amount: Money }> = [];

  for (const observation of unique) {
    if (observation.status !== 'accepted') {
      excludedStatusCount += 1;
      continue;
    }
    if (
      observation.offerId !== query.offerId
      || observation.variantRevision !== query.variantRevision
      || observation.offerContextRevision !== query.offerContextRevision
    ) {
      excludedContextCount += 1;
      continue;
    }
    const time = classifyUtcTimestamp(observation.observedAt, now);
    if (time.relation === 'invalid') {
      invalidTimestampCount += 1;
      continue;
    }
    if (time.relation === 'older') {
      olderCount += 1;
      continue;
    }
    if (time.relation === 'future') {
      futureCount += 1;
      if (time.clockError) clockErrorCount += 1;
      continue;
    }
    const amount = priceFor(observation, query);
    if (amount === null) {
      incompletePriceCount += 1;
      continue;
    }
    points.push({ observation, epochMs: time.epochMs as number, amount });
  }

  points.sort((left, right) => left.epochMs - right.epochMs || left.observation.id.localeCompare(right.observation.id));
  const latestByDay = new Map<string, typeof points[number]>();
  for (const point of points) latestByDay.set(karachiDateKey(point.epochMs), point);
  const samples = [...latestByDay.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, point]) => ({
    date,
    observationId: point.observation.id,
    observedAt: point.observation.observedAt,
    amount: point.amount,
  }));

  return {
    rawCount: points.length,
    dailyCount: samples.length,
    firstObservedAt: points[0]?.observation.observedAt ?? null,
    lastObservedAt: points.at(-1)?.observation.observedAt ?? null,
    samples,
    gaps: gapsBetween(samples),
    duplicateOperationCount,
    olderCount,
    futureCount,
    invalidTimestampCount,
    clockErrorCount,
    excludedStatusCount,
    excludedContextCount,
    incompletePriceCount,
  };
}
