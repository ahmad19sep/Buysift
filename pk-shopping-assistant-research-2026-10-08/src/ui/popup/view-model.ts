import {
  ACTIVE_HISTORY_WINDOW_MS,
  compareOffers,
  deduplicateOperations,
  summarizeHistory,
  summarizePriceComponents,
} from '../../domain/index.js';
import type {
  ComparableOfferSnapshot,
  ComparisonResult,
  Money,
  Observation,
  PriceComponents,
} from '../../domain/index.js';
import type { ConfirmedOffer, OfferEnvelopeV1 } from '../../storage/types.js';
import { formatPkr } from './form.js';

/** A saved envelope that has a confirmed offer; draft-only envelopes are not notebook offers. */
export type SavedOffer = OfferEnvelopeV1 & { confirmed: ConfirmedOffer };

const SIZE_LABELS: Record<string, string> = { small_medium: 'Small/medium', large: 'Large' };
const HAND_LABELS: Record<string, string> = { right: 'Right hand', left: 'Left hand', ambidextrous: 'Ambidextrous' };
const CONDITION_LABELS: Record<string, string> = { new: 'New', refurbished: 'Refurbished', used: 'Used' };
const STOCK_LABELS: Record<string, string> = {
  in_stock: 'In stock, per your entry',
  out_of_stock: 'Not available in the recorded offer.',
  preorder: 'Preorder',
  unknown: 'Availability not confirmed.',
};
const PAYMENT_LABELS: Record<string, string> = {
  standard: 'standard payment',
  cod: 'cash on delivery',
  specified_card: 'specified card',
};
const MISSING_LABELS: Record<string, string> = {
  item: 'Item price',
  shipping: 'Delivery cost not entered.',
  tax: 'Tax treatment not entered.',
  mandatory_fees: 'Mandatory fees not confirmed complete.',
  additional_discount: 'Additional discount not confirmed.',
  location_scope: 'Delivery area not entered.',
  payment_context: 'Payment method not entered.',
};

export function isSavedOffer(envelope: OfferEnvelopeV1): envelope is SavedOffer {
  return envelope.confirmed !== null;
}

/** IDs of entries that a later correction replaced. They stay stored and visible but leave summaries. */
export function correctedIds(envelope: OfferEnvelopeV1): Set<string> {
  return new Set(envelope.observations.flatMap(observation =>
    observation.replacesObservationId === null ? [] : [observation.replacesObservationId]));
}

/** Entries that still count: every saved entry except ones replaced by a correction. */
export function activeObservations(envelope: OfferEnvelopeV1): Observation[] {
  const corrected = correctedIds(envelope);
  return envelope.observations.filter(observation => !corrected.has(observation.id));
}

/** The most recently observed active entry; ties keep the later saved entry. */
export function latestObservation(envelope: SavedOffer): Observation {
  const active = activeObservations(envelope);
  let latest = (active[0] ?? envelope.observations[0]) as Observation;
  for (const observation of active) {
    if (Date.parse(observation.observedAt) >= Date.parse(latest.observedAt)) latest = observation;
  }
  return latest;
}

/** A correction may change only price and availability, so the entry must use the current details. */
export function canCorrect(envelope: SavedOffer, observation: Observation): boolean {
  if (correctedIds(envelope).has(observation.id)) return false;
  const { product, variant, retailer, seller, offer } = envelope.confirmed;
  if (observation.variantRevision !== variant.identityRevision || observation.offerContextRevision !== offer.contextRevision) {
    return false;
  }
  return JSON.stringify([observation.productSnapshot, observation.identitySnapshot, observation.retailerSnapshot,
    observation.sellerSnapshot, observation.offerContextSnapshot])
    === JSON.stringify([product, variant, retailer, seller, offer]);
}

export function formatRecordedAt(iso: string): string {
  const epoch = Date.parse(iso);
  if (!Number.isFinite(epoch)) return 'Time unavailable';
  const text = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(epoch);
  return `${text} PKT`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function identityText(confirmed: ConfirmedOffer): string {
  const { variant, offer } = confirmed;
  return [
    `${confirmed.product.brand} ${variant.model}`,
    variant.size.state === 'known' ? SIZE_LABELS[variant.size.value] ?? variant.size.value : 'Size not entered',
    variant.handedness.state === 'known'
      ? HAND_LABELS[variant.handedness.value] ?? variant.handedness.value
      : 'Handedness not entered',
    variant.color.state === 'known' ? variant.color.value : 'Color not entered',
    offer.condition.state === 'known'
      ? CONDITION_LABELS[offer.condition.value] ?? offer.condition.value
      : 'Condition not entered',
  ].join(' · ');
}

export function warrantyText(confirmed: ConfirmedOffer): string {
  const warranty = confirmed.offer.warranty;
  if (warranty.state === 'unknown') return 'Provider not entered';
  const kind = warranty.value.kind === 'seller' ? 'Seller' : 'Manufacturer';
  return `${kind} (${warranty.value.provider}), ${warranty.value.months} months`;
}

export function termsText(confirmed: ConfirmedOffer): string {
  const seller = confirmed.seller.label.state === 'known' ? `Seller: ${confirmed.seller.label.value}` : 'Seller not entered';
  const eligibility = {
    public: 'Price available to anyone under the entered conditions',
    conditional: `This price requires ${confirmed.offer.eligibilityDetails.join('; ') || 'a stated condition'}`,
    personalized: 'Personalized price',
    unknown: 'Who can use this price is not entered',
  }[confirmed.offer.eligibility];
  return [`${confirmed.retailer.label}`, seller, `Warranty: ${warrantyText(confirmed)}`, eligibility].join(' · ');
}

function moneyOrNone(money: Money, noneLabel: string): string {
  return money.amountMinor === 0 ? noneLabel : formatPkr(money);
}

export function componentsText(price: PriceComponents): string {
  const delivery = price.shipping.state === 'known'
    ? `Delivery: ${moneyOrNone(price.shipping.value, 'free, explicitly confirmed')}`
    : 'Delivery: not entered';
  let tax = 'Tax: not entered';
  if (price.tax.state === 'known') {
    tax = price.tax.value.includedInItem
      ? 'Tax: included per your entry'
      : `Tax: ${formatPkr(price.tax.value.additional)} additional`;
  }
  let fees = 'Mandatory fees: not entered';
  if (price.mandatoryFees.state === 'known') {
    const cod = price.mandatoryFees.value.items.find(fee => fee.kind === 'cod');
    const codText = cod === undefined ? 'no COD fee' : `COD fee ${formatPkr(cod.amount)}`;
    fees = price.mandatoryFees.value.complete
      ? `Mandatory fees: ${codText}, list confirmed complete`
      : `Mandatory fees: ${codText}, list not confirmed complete`;
  }
  let discount = 'Additional discount: not confirmed';
  if (price.additionalDiscount.state === 'known') {
    const value = price.additionalDiscount.value;
    discount = value.amount.amountMinor === 0 && value.conditions.length === 0
      ? 'Additional discount: none'
      : `Additional discount: ${formatPkr(value.amount)}${value.conditions.length > 0 ? ` if ${value.conditions.join('; ')}` : ''}`;
  }
  const area = price.locationScope.state === 'known' ? `Area: ${price.locationScope.value}` : 'Area: not entered';
  const payment = price.paymentContext.state === 'known'
    ? `Payment: ${PAYMENT_LABELS[price.paymentContext.value] ?? price.paymentContext.value}`
    : 'Payment: not entered';
  return [delivery, tax, fees, discount, area, payment].join(' · ');
}

/** States the known amount without turning unknown components into zero. */
export function priceConclusion(price: PriceComponents): string {
  const summary = summarizePriceComponents(price);
  if (summary.deliveredTotal !== null) return `${formatPkr(summary.deliveredTotal)} delivered under entered conditions`;
  if (summary.item === null) return 'Not enough information yet';
  const missing = summary.missing.filter(entry => entry !== 'item');
  const words: Record<string, string> = {
    shipping: 'delivery',
    tax: 'tax',
    mandatory_fees: 'mandatory fees',
    additional_discount: 'additional discount',
    location_scope: 'delivery area',
    payment_context: 'payment method',
  };
  return `${formatPkr(summary.item)} + ${missing.map(entry => words[entry] ?? entry).join(', ')} not entered`;
}

export function attentionItems(envelope: SavedOffer): string[] {
  const { confirmed } = envelope;
  const observation = latestObservation(envelope);
  const items: string[] = [];
  // Mirrors the evidence the domain comparison requires before it can call two offers the same.
  const evidence = [
    confirmed.variant.mpn,
    confirmed.variant.size,
    confirmed.variant.handedness,
    confirmed.variant.color,
    confirmed.variant.region,
    confirmed.variant.receiverOrPack,
    confirmed.seller.label,
    confirmed.offer.condition,
    confirmed.offer.warranty,
  ];
  for (const entry of evidence) if (entry.state === 'unknown') items.push(entry.reason);
  const warranty = confirmed.offer.warranty;
  if (warranty.state === 'known' && warranty.value.scope.state === 'unknown') items.push(warranty.value.scope.reason);
  if (confirmed.offer.eligibility === 'unknown') items.push('Who can use this price is not entered.');
  const summary = summarizePriceComponents(observation.price);
  for (const missing of summary.missing) {
    const label = MISSING_LABELS[missing];
    if (label !== undefined && missing !== 'item') items.push(label);
  }
  if (observation.stock === 'unknown' || observation.stock === 'out_of_stock') {
    items.push(STOCK_LABELS[observation.stock] as string);
  }
  return items;
}

/** Groups missing details into at most four short lines instead of a warning wall. */
export function attentionSummary(envelope: SavedOffer): string[] {
  const { confirmed } = envelope;
  const observation = latestObservation(envelope);
  const lines: string[] = [];
  const missing = (entries: ReadonlyArray<[boolean, string]>): string[] =>
    entries.filter(([isMissing]) => isMissing).map(([, label]) => label);
  const { variant, offer, seller } = confirmed;
  const identity = missing([
    [variant.mpn.state === 'unknown', 'part number'],
    [variant.size.state === 'unknown', 'size'],
    [variant.handedness.state === 'unknown', 'handedness'],
    [variant.color.state === 'unknown', 'color'],
    [variant.region.state === 'unknown', 'region'],
    [variant.receiverOrPack.state === 'unknown', 'receiver or pack'],
  ]);
  if (identity.length > 0) lines.push(`Identity not entered: ${identity.join(', ')}.`);
  const terms = missing([
    [seller.label.state === 'unknown', 'seller'],
    [offer.condition.state === 'unknown', 'condition'],
    [offer.warranty.state === 'unknown', 'warranty provider'],
    [offer.warranty.state === 'known' && offer.warranty.value.scope.state === 'unknown', 'warranty scope'],
    [offer.eligibility === 'unknown', 'who can use this price'],
  ]);
  if (terms.length > 0) lines.push(`Offer terms not entered: ${terms.join(', ')}.`);
  const summary = summarizePriceComponents(observation.price);
  const words: Record<string, string> = {
    shipping: 'delivery cost',
    tax: 'tax',
    mandatory_fees: 'complete mandatory fees',
    additional_discount: 'additional discount',
    location_scope: 'delivery area',
    payment_context: 'payment method',
  };
  const price = summary.missing.filter(entry => entry !== 'item').map(entry => words[entry] ?? entry);
  if (price.length > 0) lines.push(`Price details not entered: ${price.join(', ')}.`);
  if (observation.stock === 'unknown' || observation.stock === 'out_of_stock') lines.push(stockText(observation));
  return lines;
}

export function recordStateText(envelope: SavedOffer): string {
  return attentionItems(envelope).length === 0 ? 'Ready for provisional comparison.' : 'Saved — details needed.';
}

export function stockText(observation: Observation): string {
  return STOCK_LABELS[observation.stock] ?? 'Availability not confirmed.';
}

export type HistoryEntryStatus =
  | 'daily_sample'
  | 'same_day'
  | 'corrected'
  | 'earlier_details'
  | 'older'
  | 'future'
  | 'duplicate';

export interface HistoryEntryView {
  observationId: string;
  text: string;
  status: HistoryEntryStatus;
  statusText: string;
  earlier: boolean;
  correctable: boolean;
}

export interface HistoryView {
  summary: string;
  facts: string[];
  entries: HistoryEntryView[];
}

const STATUS_TEXT: Record<HistoryEntryStatus, string> = {
  daily_sample: 'Counted as this day’s sample',
  same_day: 'Same day — a later entry is that day’s sample',
  corrected: 'Corrected by a later entry — kept, not counted',
  earlier_details: 'Earlier identity or terms — a separate series, not counted',
  older: 'Older than 90 days — still stored, not counted',
  future: 'Time is in the future — not counted',
  duplicate: 'Repeated save of the same entry — not counted',
};

function karachiDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric' })
    .format(Date.parse(iso));
}

function shortDate(dateKey: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' })
    .format(Date.parse(`${dateKey}T00:00:00Z`));
}

/**
 * The user's own entries only: no filled gaps, no trend from one point, no "lowest ever".
 * Summaries use active entries of the current identity/terms revision, item price basis,
 * the rolling 90-day window and one sample per Asia/Karachi day.
 */
export function historyView(envelope: SavedOffer, now: Date): HistoryView {
  const { variant, offer } = envelope.confirmed;
  const corrected = correctedIds(envelope);
  const active = activeObservations(envelope);
  const summary = summarizeHistory(active, {
    offerId: offer.id,
    variantRevision: variant.identityRevision,
    offerContextRevision: offer.contextRevision,
    priceBasis: 'item',
    locationScope: null,
    paymentContext: null,
  }, now);
  const sampleIds = new Set(summary.samples.map(sample => sample.observationId));
  const unique = new Set(deduplicateOperations(envelope.observations).map(observation => observation.id));
  const byId = new Map(envelope.observations.map(observation => [observation.id, observation]));
  const nowMs = now.getTime();

  const sorted = [...envelope.observations].sort((left, right) =>
    Date.parse(right.observedAt) - Date.parse(left.observedAt) || Date.parse(right.receivedAt) - Date.parse(left.receivedAt));
  const entries = sorted.map((observation): HistoryEntryView => {
    const earlier = observation.variantRevision !== variant.identityRevision
      || observation.offerContextRevision !== offer.contextRevision;
    const observedMs = Date.parse(observation.observedAt);
    let status: HistoryEntryStatus;
    if (!unique.has(observation.id)) status = 'duplicate';
    else if (corrected.has(observation.id)) status = 'corrected';
    else if (earlier) status = 'earlier_details';
    else if (observedMs > nowMs) status = 'future';
    else if (observedMs < nowMs - ACTIVE_HISTORY_WINDOW_MS) status = 'older';
    else if (sampleIds.has(observation.id)) status = 'daily_sample';
    else status = 'same_day';
    const replaced = observation.replacesObservationId === null ? undefined : byId.get(observation.replacesObservationId);
    const correction = replaced === undefined
      ? ''
      : ` · Correction of the ${formatRecordedAt(replaced.observedAt)} entry (was item ${formatPkr(replaced.price.item)}, saved ${formatRecordedAt(observation.receivedAt)})`;
    return {
      observationId: observation.id,
      text: `${formatRecordedAt(observation.observedAt)} · Item ${formatPkr(observation.price.item)} · ${priceConclusion(observation.price)} · ${stockText(observation)}${correction}`,
      status,
      statusText: STATUS_TEXT[status],
      earlier,
      correctable: canCorrect(envelope, observation),
    };
  });

  const count = envelope.observations.length;
  const facts: string[] = [];
  const first = [...envelope.observations].sort((left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt))[0];
  if (first !== undefined) facts.push(`First recorded: ${formatRecordedAt(first.observedAt)}`);
  if (summary.lastObservedAt !== null) facts.push(`Last counted entry: ${formatRecordedAt(summary.lastObservedAt)}`);
  facts.push(`Saved entries: ${count}${corrected.size > 0 ? ` (${corrected.size} corrected)` : ''}`);
  facts.push(`Counted daily samples: ${summary.dailyCount} (one per Pakistan day, last 90 days, current details)`);
  facts.push('Price basis: item price only, as you entered it');
  if (summary.dailyCount >= 3) {
    const lowest = summary.samples.reduce((min, sample) => sample.amount.amountMinor < min.amount.amountMinor ? sample : min);
    const firstSample = summary.samples[0] as typeof summary.samples[number];
    const lastSample = summary.samples[summary.samples.length - 1] as typeof summary.samples[number];
    facts.push(`Lowest in your ${summary.dailyCount} saved comparable daily samples (${shortDate(firstSample.date)}–${shortDate(lastSample.date)}): ${formatPkr(lowest.amount)} on ${karachiDate(lowest.observedAt)}`);
  }
  const gaps = summary.gaps.slice(-3);
  for (const gap of gaps) {
    facts.push(`No entry on ${gap.missingDays} day${gap.missingDays === 1 ? '' : 's'} between ${shortDate(gap.afterDate)} and ${shortDate(gap.beforeDate)} — nothing is assumed for those days`);
  }
  if (summary.gaps.length > gaps.length) facts.push(`${summary.gaps.length - gaps.length} earlier gaps are not listed`);

  let headline: string;
  if (count === 1) headline = '1 observation. One entry cannot show a trend.';
  else if (summary.dailyCount < 3) headline = `${count} observations. Not enough comparable observations to assess this price.`;
  else headline = `${count} observations across ${summary.dailyCount} days with the current details.`;
  return { summary: headline, facts, entries };
}

export function snapshotFor(envelope: SavedOffer): ComparableOfferSnapshot {
  const observation = latestObservation(envelope);
  const { product, variant, retailer, seller, offer } = envelope.confirmed;
  return { product, variant, retailer, seller, offer, price: observation.price, stock: observation.stock, sourceKind: 'manual' };
}

export interface ComparisonOfferView {
  heading: string;
  source: string;
  seller: string;
  regionPack: string;
  eligibility: string;
  recorded: string;
  modelSize: string;
  conditionColor: string;
  warranty: string;
  itemPrice: string;
  deliveryFees: string;
  knownAmount: string;
}

export interface ComparisonView {
  summary: string;
  differences: string[];
  offers: ComparisonOfferView[];
}

const OFFER_LETTERS = ['A', 'B', 'C'] as const;

const ELIGIBILITY_SHORT: Record<string, string> = {
  public: 'Anyone under the entered conditions',
  conditional: 'Requires a stated condition',
  personalized: 'Personalized price',
  unknown: 'Not entered',
};

function deliveryFeesText(price: PriceComponents): string {
  const delivery = price.shipping.state === 'known' ? moneyOrNone(price.shipping.value, 'Free') : 'Not entered';
  let fees = 'fees not entered';
  if (price.mandatoryFees.state === 'known') {
    const total = price.mandatoryFees.value.items.reduce((sum, fee) => sum + fee.amount.amountMinor, 0);
    const amount = total === 0 ? 'none' : formatPkr({ amountMinor: total, currency: 'PKR', minorUnit: 2 });
    fees = price.mandatoryFees.value.complete ? `${amount} confirmed` : `${amount}, list incomplete`;
  }
  return `${delivery} / ${fees}`;
}

const CONTEXT_DIFFERENCE = 'delivery location or payment context differs';

const MISSING_REASONS = new Set([
  'no shared evidenced manufacturer identifier',
  'price eligibility is unknown',
  'identity is marked ambiguous',
]);

function missingLabel(reason: string): string {
  if (reason === 'no shared evidenced manufacturer identifier') return 'a shared part number';
  if (reason === 'price eligibility is unknown') return 'who can use the price';
  if (reason === 'identity is marked ambiguous') return 'an unambiguous identity';
  return reason.replace(/ is missing evidence$/, '');
}

const PRICE_REASON_TEXT: Record<string, string> = {
  'both offers are not evidenced in stock': 'availability is not confirmed for both',
  'both prices are not generally available': 'a price is conditional, personalized or not entered',
  'delivered price components are incomplete': 'delivered price details are incomplete',
  [CONTEXT_DIFFERENCE]: 'delivery area or payment method differs or is not entered',
};

/** One short line per pair: identity and terms first, price-ranking blockers only after they match. */
function describePair(heading: string, result: ComparisonResult): string {
  const termDifferences = result.reasons.filter(reason => reason.endsWith(' differs') && reason !== CONTEXT_DIFFERENCE);
  if (result.classification === 'mismatch') return `${heading} are different: ${termDifferences.join(', ')}.`;
  if (result.classification === 'insufficient_evidence') {
    const missing = result.reasons
      .filter(reason => reason.endsWith('missing evidence') || MISSING_REASONS.has(reason))
      .map(missingLabel);
    return `${heading} cannot be confirmed as the same mouse and terms. Missing: ${missing.join(', ')}.`;
  }
  if (result.rankingEligible) return `${heading} match on the entered identity and terms.`;
  const blockers = result.reasons.map(reason => PRICE_REASON_TEXT[reason]).filter((text): text is string => text !== undefined);
  return `${heading} match on the entered identity and terms, but their prices cannot be ranked: ${blockers.join('; ')}.`;
}

/**
 * Compares two or three saved offers pairwise. Identity and terms are reported before
 * prices, and a lowest amount is named only when every pair is ranking-eligible.
 */
export function comparisonView(envelopes: readonly SavedOffer[]): ComparisonView {
  const labelled = envelopes.slice(0, 3).map((envelope, index) => ({
    envelope,
    letter: OFFER_LETTERS[index] as string,
    snapshot: snapshotFor(envelope),
  }));
  const pairs: Array<{ left: string; right: string; result: ComparisonResult }> = [];
  for (let left = 0; left < labelled.length; left += 1) {
    for (let right = left + 1; right < labelled.length; right += 1) {
      const a = labelled[left] as typeof labelled[number];
      const b = labelled[right] as typeof labelled[number];
      pairs.push({ left: a.letter, right: b.letter, result: compareOffers(a.snapshot, b.snapshot, 'delivered') });
    }
  }
  const differences = pairs.map(pair => describePair(`Offer ${pair.left} and Offer ${pair.right}`, pair.result));

  let summary: string;
  if (pairs.length === 0) {
    summary = 'Select two or three offers to compare.';
  } else if (pairs.some(pair => pair.result.classification === 'mismatch')) {
    summary = 'These are not the same mouse and terms. Treat them as alternatives; no savings claim can be made.';
  } else if (pairs.some(pair => pair.result.classification === 'insufficient_evidence')) {
    summary = 'A complete comparison needs more entered details. No savings claim can be made.';
  } else if (pairs.every(pair => pair.result.rankingEligible)) {
    const amounts = labelled.map(entry => ({
      letter: entry.letter,
      amount: summarizePriceComponents(entry.snapshot.price).deliveredTotal as Money,
    }));
    const lowest = Math.min(...amounts.map(entry => entry.amount.amountMinor));
    const winners = amounts.filter(entry => entry.amount.amountMinor === lowest);
    const lowestMoney = (winners[0] as typeof winners[number]).amount;
    summary = winners.length === amounts.length
      ? `All selected offers have the same known delivered amount: ${formatPkr(lowestMoney)}. Provisional, based on your entries.`
      : `Lowest known delivered amount: Offer ${winners.map(entry => entry.letter).join(' and Offer ')}, ${formatPkr(lowestMoney)} under entered conditions. Provisional, based on your entries; check the shop before deciding.`;
  } else {
    summary = 'The entered identity and terms match, but these prices cannot be ranked yet. No savings claim can be made.';
  }

  const offers = labelled.map(entry => {
    const { confirmed } = entry.envelope;
    const price = entry.snapshot.price;
    const summaryPrice = summarizePriceComponents(price);
    const size = confirmed.variant.size.state === 'known'
      ? SIZE_LABELS[confirmed.variant.size.value] ?? confirmed.variant.size.value
      : 'size not entered';
    const condition = confirmed.offer.condition.state === 'known'
      ? CONDITION_LABELS[confirmed.offer.condition.value] ?? confirmed.offer.condition.value
      : 'Condition not entered';
    const color = confirmed.variant.color.state === 'known' ? confirmed.variant.color.value : 'color not entered';
    const observation = latestObservation(entry.envelope);
    const region = confirmed.variant.region.state === 'known' ? confirmed.variant.region.value : 'region not entered';
    const pack = confirmed.variant.receiverOrPack.state === 'known'
      ? confirmed.variant.receiverOrPack.value
      : 'receiver/pack not entered';
    return {
      heading: `Offer ${entry.letter} · ${confirmed.retailer.label}`,
      source: 'Entered by you · provisional',
      seller: confirmed.seller.label.state === 'known' ? confirmed.seller.label.value : 'Seller not entered',
      regionPack: `${region} / ${pack}`,
      eligibility: confirmed.offer.eligibility === 'conditional' && confirmed.offer.eligibilityDetails.length > 0
        ? `Requires: ${confirmed.offer.eligibilityDetails.join('; ')}`
        : ELIGIBILITY_SHORT[confirmed.offer.eligibility] ?? 'Not entered',
      recorded: `${formatRecordedAt(observation.observedAt)} · not automatically checked`,
      modelSize: `${confirmed.product.brand} ${confirmed.variant.model} / ${size}`,
      conditionColor: `${condition} / ${color}`,
      warranty: warrantyText(confirmed),
      itemPrice: summaryPrice.item === null ? 'Not entered' : formatPkr(summaryPrice.item),
      deliveryFees: deliveryFeesText(price),
      knownAmount: `${priceConclusion(price)} · ${stockText(observation)}`,
    };
  });
  return { summary, differences, offers };
}
