import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { OfferEnvelopeV1 } from '../../src/storage/types.js';
import type { OfferFormFields } from '../../src/ui/popup/form.js';
import {
  attentionItems,
  attentionSummary,
  comparisonView,
  formatRecordedAt,
  historyView,
  priceConclusion,
  recordStateText,
} from '../../src/ui/popup/view-model.js';
import type { SavedOffer } from '../../src/ui/popup/view-model.js';
import { FIXED_NOW, idFactory, syntheticSave } from '../storage/helpers.js';

const COMPLETE: Partial<OfferFormFields> = {
  size: 'small_medium',
  handedness: 'right',
  color: 'Graphite',
  region: 'PK test region',
  receiverOrPack: 'USB receiver; single mouse',
  warrantyScope: 'Parts and labor',
  mpnMode: 'known',
  mpn: 'SYN-1',
  sellerMode: 'known',
  seller: 'Fictional Seller',
  condition: 'new',
  warrantyMode: 'details',
  warrantyProvider: 'Fictional Northstar',
  warrantyMonths: '12',
  shippingMode: 'amount',
  shippingAmount: '300',
  taxMode: 'included',
  feesComplete: 'yes',
  codFeeMode: 'none',
  discountMode: 'none',
  locationScope: 'Karachi',
  paymentContext: 'standard',
  eligibility: 'public',
  stock: 'in_stock',
};

function saved(start: number, overrides: Partial<OfferFormFields> = {}): SavedOffer {
  const input = syntheticSave(idFactory(start), overrides);
  const envelope: OfferEnvelopeV1 = {
    schemaVersion: 1,
    offerId: input.confirmed.offer.id,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    localPurposeVersion: 1,
    confirmed: input.confirmed,
    draft: null,
    observations: [input.observation],
    operationIds: [input.operationId],
  };
  return envelope as SavedOffer;
}

test('unknown details stay visible and keep the record in the details-needed state', () => {
  const minimal = saved(10);
  const items = attentionItems(minimal);
  assert.ok(items.includes('Manufacturer part number not entered.'));
  assert.ok(items.includes('Delivery cost not entered.'));
  assert.ok(items.includes('Availability not confirmed.'));
  assert.equal(recordStateText(minimal), 'Saved — details needed.');
  const grouped = attentionSummary(minimal);
  assert.ok(grouped.length <= 4);
  assert.match(grouped[0] ?? '', /^Identity not entered: part number, size, handedness, color, region, receiver or pack\.$/);
  assert.match(priceConclusion(minimal.observations[0]!.price), /^PKR 7,000 \+ delivery, tax/);

  const complete = saved(100, COMPLETE);
  assert.deepEqual(attentionItems(complete), []);
  assert.deepEqual(attentionSummary(complete), []);
  assert.equal(recordStateText(complete), 'Ready for provisional comparison.');
});

test('recorded times display in Pakistan time without claiming a check', () => {
  assert.equal(formatRecordedAt('2026-10-08T07:00:00.000Z'), '8 Oct 2026, 12:00 PKT');
  assert.equal(formatRecordedAt('not a time'), 'Time unavailable');
});

test('comparison withholds a lowest price when evidence is insufficient or offers differ', () => {
  const incomplete = comparisonView([saved(10), saved(100, COMPLETE)]);
  assert.match(incomplete.summary, /needs more entered details/);
  assert.doesNotMatch(incomplete.summary, /Lowest/);

  const different = comparisonView([saved(200, COMPLETE), saved(300, { ...COMPLETE, model: 'Aster One L', size: 'large' })]);
  assert.match(different.summary, /not the same mouse/);
  assert.match(different.differences[0] ?? '', /^Offer A and Offer B are different: .*model differs/);

  assert.match(incomplete.differences[0] ?? '', /cannot be confirmed .* Missing: .*part number.*size/);

  const outOfStock = comparisonView([saved(400, COMPLETE), saved(500, { ...COMPLETE, itemPrice: '6,500', stock: 'out_of_stock' })]);
  assert.doesNotMatch(outOfStock.summary, /Lowest/);
  assert.match(outOfStock.differences[0] ?? '', /prices cannot be ranked: availability is not confirmed/);
});

test('a provisional lowest amount is named only when all compared offers are ranking-eligible', () => {
  const view = comparisonView([
    saved(10, COMPLETE),
    saved(100, { ...COMPLETE, itemPrice: '6,850' }),
    saved(200, { ...COMPLETE, itemPrice: '7,100' }),
  ]);
  assert.match(view.summary, /^Lowest known delivered amount: Offer B, PKR 7,150 under entered conditions\. Provisional/);
  assert.equal(view.offers.length, 3);
  assert.equal(view.differences.length, 3);
  assert.equal(view.offers[1]?.deliveryFees, 'PKR 300 / none confirmed');
  assert.ok(view.differences.every(line => line.endsWith('match on the entered identity and terms.')));
});

test('history lists real entries only and marks earlier-revision observations', () => {
  const offer = saved(10, COMPLETE);
  const first = offer.observations[0]!;
  const earlier = { ...first, id: idFactory(900)(), operationId: idFactory(901)(), observedAt: '2026-10-05T07:00:00.000Z', variantRevision: 0 };
  offer.observations.push(earlier);
  const view = historyView(offer, new Date(FIXED_NOW));
  assert.equal(view.entries.length, 2);
  assert.equal(view.entries[0]?.earlier, false);
  assert.equal(view.entries[1]?.earlier, true);
  assert.match(view.summary, /2 observations saved/);
  assert.match(view.summary, /Not enough comparable observations/);
  assert.match(view.summary, /1 recorded under earlier identity/);
  assert.doesNotMatch(view.summary, /lowest ever/i);
});
