import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { classifyUtcTimestamp, deduplicateOperations, summarizeHistory } from '../../src/domain/history.js';
import { ACTIVE_HISTORY_WINDOW_MS } from '../../src/domain/limits.js';
import { completePrice, makeObservation, testUuid, unknown } from './helpers.js';

const query = {
  offerId: testUuid(5),
  variantRevision: 1,
  offerContextRevision: 1,
  priceBasis: 'delivered' as const,
  locationScope: 'Karachi',
  paymentContext: 'standard' as const,
};

test('the active window is inclusive and future observations are never clamped', () => {
  const now = Date.parse('2026-10-08T12:00:00.000Z');
  const boundary = new Date(now - ACTIVE_HISTORY_WINDOW_MS).toISOString();
  assert.equal(classifyUtcTimestamp(boundary, now).relation, 'active');
  assert.equal(classifyUtcTimestamp(new Date(now - ACTIVE_HISTORY_WINDOW_MS - 1).toISOString(), now).relation, 'older');

  const nearFuture = classifyUtcTimestamp(new Date(now + 5 * 60_000).toISOString(), now);
  assert.equal(nearFuture.relation, 'future');
  assert.equal(nearFuture.clockError, false);
  const farFuture = classifyUtcTimestamp(new Date(now + 5 * 60_000 + 1).toISOString(), now);
  assert.equal(farFuture.relation, 'future');
  assert.equal(farFuture.clockError, true);
  assert.equal(classifyUtcTimestamp('2026-02-30T12:00:00Z', now).relation, 'invalid');
  assert.equal(classifyUtcTimestamp('2026-10-08T17:00:00+05:00', now).relation, 'invalid', 'timestamps must be stored as UTC Z text');
});

test('duplicate operation IDs are idempotent and retain the earliest received representation', () => {
  const operationId = testUuid(9_001);
  const earlier = makeObservation(1, '2026-10-01T10:00:00.000Z', { operationId });
  const retry = makeObservation(2, '2026-10-01T10:01:00.000Z', { operationId });
  const unique = deduplicateOperations([retry, earlier]);
  assert.equal(unique.length, 1);
  assert.equal(unique[0]?.id, earlier.id);
});

test('history uses the latest comparable point per Karachi calendar day and marks gaps', () => {
  const first = makeObservation(1, '2026-10-01T18:00:00.000Z', { price: completePrice(700_000) }); // 23:00 PKT
  const second = makeObservation(2, '2026-10-01T20:00:00.000Z', { price: completePrice(690_000) }); // 01:00 next day
  const laterSameDay = makeObservation(3, '2026-10-02T15:00:00.000Z', { price: completePrice(680_000) }); // 20:00 same PKT day
  const afterGap = makeObservation(4, '2026-10-04T20:00:00.000Z', { price: completePrice(675_000) });
  const summary = summarizeHistory([first, second, laterSameDay, afterGap], query, Date.parse('2026-10-08T12:00:00.000Z'));

  assert.equal(summary.rawCount, 4);
  assert.equal(summary.dailyCount, 3);
  assert.deepEqual(summary.samples.map(sample => sample.date), ['2026-10-01', '2026-10-02', '2026-10-05']);
  assert.equal(summary.samples[1]?.amount.amountMinor, 710_000, 'latest accepted observation wins within the Karachi day');
  assert.deepEqual(summary.gaps, [{ afterDate: '2026-10-02', beforeDate: '2026-10-05', missingDays: 2 }]);
});

test('history excludes old, future, corrected, wrong-series, duplicate, and incomplete delivered points', () => {
  const now = Date.parse('2026-10-08T12:00:00.000Z');
  const valid = makeObservation(1, '2026-10-01T10:00:00.000Z');
  const duplicate = makeObservation(2, '2026-10-01T10:01:00.000Z', { operationId: valid.operationId });
  const old = makeObservation(3, new Date(now - ACTIVE_HISTORY_WINDOW_MS - 1).toISOString());
  const future = makeObservation(4, new Date(now + 60_000).toISOString());
  const clockError = makeObservation(5, new Date(now + 300_001).toISOString());
  const corrected = makeObservation(6, '2026-10-02T10:00:00.000Z', { status: 'corrected' });
  const wrongRevision = makeObservation(7, '2026-10-03T10:00:00.000Z', { variantRevision: 2 });
  const incompletePrice = completePrice();
  incompletePrice.shipping = unknown('Not entered');
  const incomplete = makeObservation(8, '2026-10-04T10:00:00.000Z', { price: incompletePrice });

  const summary = summarizeHistory(
    [valid, duplicate, old, future, clockError, corrected, wrongRevision, incomplete],
    query,
    now,
  );
  assert.equal(summary.rawCount, 1);
  assert.equal(summary.duplicateOperationCount, 1);
  assert.equal(summary.olderCount, 1);
  assert.equal(summary.futureCount, 2);
  assert.equal(summary.clockErrorCount, 1);
  assert.equal(summary.excludedStatusCount, 1);
  assert.equal(summary.excludedContextCount, 1);
  assert.equal(summary.incompletePriceCount, 1);

  const itemSummary = summarizeHistory([incomplete], { ...query, priceBasis: 'item' }, now);
  assert.equal(itemSummary.rawCount, 1, 'unknown shipping does not erase a valid item-price observation');
});
