import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  OFFER_FORM_FIELD_NAMES,
  buildManualOffer,
  describeKnownPrice,
  emptyOfferForm,
  formFieldsFromConfirmed,
  previewPriceText,
} from '../../src/ui/popup/form.js';
import { DRAFT_FIELD_NAMES } from '../../src/storage/types.js';

function idFactory(start = 1): () => string {
  let next = start;
  return () => `00000000-0000-4000-8000-${(next++).toString(16).padStart(12, '0')}`;
}

function completeFields(): ReturnType<typeof emptyOfferForm> {
  return {
    ...emptyOfferForm(),
    brand: 'Fictional Northstar',
    model: 'Aster One S',
    mpnMode: 'known',
    mpn: 'SYN-ASTER-S',
    size: 'small_medium',
    handedness: 'ambidextrous',
    color: 'Graphite',
    region: 'PK test region',
    receiverOrPack: 'Bluetooth and USB receiver; single mouse',
    retailer: 'Fictional Cedar Shop',
    sellerMode: 'known',
    seller: 'Fictional Cedar Seller',
    url: 'https://cedar.example.invalid/products/aster-one-s?utm_source=test#ignored',
    itemPrice: 'Rs 7,000',
    condition: 'new',
    warrantyMode: 'details',
    warrantyProvider: 'Fictional Northstar',
    warrantyKind: 'manufacturer',
    warrantyMonths: '12',
    warrantyScope: 'Parts and labor',
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
}

function options(start = 1) {
  return {
    createId: idFactory(start),
    now: () => new Date('2026-10-08T07:00:00.000Z'),
  };
}

test('empty and partial offer forms report field-linked issues without creating records', () => {
  const empty = buildManualOffer(emptyOfferForm(), options());
  assert.equal(empty.ok, false);
  if (empty.ok) return;
  assert.deepEqual(
    [...new Set(empty.issues.map(issue => issue.field))],
    ['brand', 'model', 'retailer', 'url', 'itemPrice'],
  );

  const partial = buildManualOffer({ ...emptyOfferForm(), brand: 'Northstar', model: 'Aster' }, options());
  assert.equal(partial.ok, false);
  if (partial.ok) return;
  assert.ok(partial.issues.some(issue => issue.field === 'retailer'));
  assert.ok(partial.issues.some(issue => issue.field === 'url'));
  assert.ok(partial.issues.some(issue => issue.field === 'itemPrice'));
});

test('complete manual form creates linked validated records and an immutable observation snapshot', () => {
  const result = buildManualOffer(completeFields(), options());
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.needsDetails, false);
  assert.equal(result.confirmed.offer.id, result.observation.offerId);
  assert.equal(result.confirmed.variant.id, result.observation.identitySnapshot.id);
  assert.equal(result.confirmed.access.id, result.observation.accessRecordId);
  assert.equal(result.observation.sourceKind, 'manual');
  assert.equal(result.observation.checkedAt, null);
  assert.equal(result.observation.parserVersion, null);
  assert.equal(result.observation.price.item.amountMinor, 700_000);
  assert.equal(result.observation.price.shipping.state, 'known');
  assert.equal(result.sanitizedFields.url, 'https://cedar.example.invalid/products/aster-one-s');
  assert.equal(describeKnownPrice(result.observation.price), 'PKR 7,300 delivered under entered conditions');
});

test('unknowns remain explicit and prevent a complete delivered-price conclusion', () => {
  const fields = completeFields();
  fields.mpnMode = 'unknown';
  fields.size = 'unknown';
  fields.handedness = 'unknown';
  fields.sellerMode = 'unknown';
  fields.warrantyMode = 'unknown';
  fields.shippingMode = 'unknown';
  fields.taxMode = 'unknown';
  fields.feesComplete = '';
  fields.codFeeMode = 'unknown';
  fields.discountMode = 'unknown';
  fields.locationScope = '';
  fields.paymentContext = '';
  fields.eligibility = 'unknown';
  fields.stock = 'unknown';

  const result = buildManualOffer(fields, options());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.needsDetails, true);
  assert.equal(result.confirmed.variant.mpn.state, 'unknown');
  assert.equal(result.confirmed.seller.label.state, 'unknown');
  assert.equal(result.confirmed.offer.warranty.state, 'unknown');
  assert.match(describeKnownPrice(result.observation.price), /^PKR/);
  assert.match(describeKnownPrice(result.observation.price), /delivery/);
});

test('invalid money, unsafe URLs, and incomplete conditional eligibility are rejected', () => {
  const invalidMoney = completeFields();
  invalidMoney.itemPrice = '7,000.005';
  const moneyResult = buildManualOffer(invalidMoney, options());
  assert.equal(moneyResult.ok, false);
  if (!moneyResult.ok) assert.ok(moneyResult.issues.some(issue => issue.field === 'itemPrice'));

  const unsafeUrl = completeFields();
  unsafeUrl.url = 'https://shop.example.invalid/checkout/payment';
  const urlResult = buildManualOffer(unsafeUrl, options());
  assert.equal(urlResult.ok, false);
  if (!urlResult.ok) assert.ok(urlResult.issues.some(issue => issue.field === 'url'));

  const conditional = completeFields();
  conditional.eligibility = 'conditional';
  conditional.eligibilityDetails = '';
  const conditionalResult = buildManualOffer(conditional, options());
  assert.equal(conditionalResult.ok, false);
  if (!conditionalResult.ok) {
    assert.ok(conditionalResult.issues.some(issue => issue.field === 'eligibilityDetails'));
  }
});

test('editing identity creates a new revision while a price-only observation keeps the series', () => {
  const first = buildManualOffer(completeFields(), options(1));
  assert.equal(first.ok, true);
  if (!first.ok) return;

  const priceEdit = formFieldsFromConfirmed(first.confirmed, first.observation);
  priceEdit.itemPrice = '6,900';
  const second = buildManualOffer(priceEdit, { ...options(100), existing: first.confirmed });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.confirmed.variant.identityRevision, 1);
  assert.equal(second.confirmed.offer.contextRevision, 1);
  assert.equal(second.confirmed.offer.id, first.confirmed.offer.id);
  assert.notEqual(second.observation.operationId, first.observation.operationId);

  const identityEdit = formFieldsFromConfirmed(second.confirmed, second.observation);
  identityEdit.model = 'Aster One L';
  const third = buildManualOffer(identityEdit, { ...options(200), existing: second.confirmed });
  assert.equal(third.ok, true);
  if (!third.ok) return;
  assert.equal(third.confirmed.variant.identityRevision, 2);
  assert.equal(third.confirmed.offer.contextRevision, 2);
  assert.equal(third.observation.variantRevision, 2);
});


test('a known COD fee without the completeness confirmation keeps the delivered total unknown', () => {
  const fields = completeFields();
  fields.feesComplete = '';
  fields.codFeeMode = 'amount';
  fields.codFeeAmount = '150';
  const incomplete = buildManualOffer(fields, options());
  assert.equal(incomplete.ok, true);
  if (!incomplete.ok) return;
  assert.equal(incomplete.observation.price.mandatoryFees.state, 'known');
  assert.match(describeKnownPrice(incomplete.observation.price), /mandatory fees not entered/);

  fields.feesComplete = 'yes';
  const complete = buildManualOffer(fields, options());
  assert.equal(complete.ok, true);
  if (!complete.ok) return;
  assert.equal(describeKnownPrice(complete.observation.price), 'PKR 7,450 delivered under entered conditions');
  const restored = formFieldsFromConfirmed(complete.confirmed, complete.observation);
  assert.equal(restored.feesComplete, 'yes');
  assert.equal(restored.codFeeMode, 'amount');
  assert.equal(restored.codFeeAmount, '150.00');
});

test('hidden seller and part-number text is ignored unless the user chose to enter it', () => {
  const fields = completeFields();
  fields.sellerMode = 'unknown';
  fields.mpnMode = 'unknown';
  const result = buildManualOffer(fields, options());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.confirmed.seller.label.state, 'unknown');
  assert.equal(result.confirmed.variant.mpn.state, 'unknown');
});

test('form field names, draft field names and the price preview stay aligned', () => {
  assert.deepEqual([...OFFER_FORM_FIELD_NAMES], [...DRAFT_FIELD_NAMES]);
  assert.deepEqual(Object.keys(emptyOfferForm()).sort(), [...DRAFT_FIELD_NAMES].sort());
  assert.match(previewPriceText(emptyOfferForm()), /Enter an item price/);
  assert.match(previewPriceText({ ...emptyOfferForm(), itemPrice: '7,000.005' }), /no more than 2 decimal places/);
  assert.equal(previewPriceText(completeFields()), 'PKR 7,300 delivered under entered conditions');
});

test('a correction keeps the original observation time and links the replaced entry', () => {
  const first = buildManualOffer(completeFields(), options(1));
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const fields = formFieldsFromConfirmed(first.confirmed, first.observation);
  fields.itemPrice = '6,900';
  const corrected = buildManualOffer(fields, {
    ...options(300),
    existing: first.confirmed,
    observedAt: new Date('2026-10-07T07:00:00.000Z'),
    replacesObservationId: first.observation.id,
  });
  assert.equal(corrected.ok, true);
  if (!corrected.ok) return;
  assert.equal(corrected.observation.observedAt, '2026-10-07T07:00:00.000Z');
  assert.equal(corrected.observation.receivedAt, '2026-10-08T07:00:00.000Z');
  assert.equal(corrected.observation.replacesObservationId, first.observation.id);
  assert.deepEqual(corrected.confirmed, first.confirmed, 'a price-only correction keeps the same revisions');
});
