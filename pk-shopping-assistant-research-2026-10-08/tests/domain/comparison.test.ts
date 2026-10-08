import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { compareOffers, deriveBenchmarkClass } from '../../src/domain/comparison.js';
import type { ComparableOfferSnapshot } from '../../src/domain/comparison.js';
import type { Evidence, Money } from '../../src/domain/types.js';

function known<T>(value: T): Evidence<T> {
  return { state: 'known', value, basis: 'Synthetic test fact', sourceRef: 'synthetic:test' };
}

function unknown<T>(reason: string): Evidence<T> {
  return { state: 'unknown', reason };
}

function pkr(amountMinor: number): Money {
  return { amountMinor, currency: 'PKR', minorUnit: 2 };
}

function snapshot(id: string, sourceKind: 'manual' | 'synthetic' = 'manual'): ComparableOfferSnapshot {
  const variantId = `variant-${id}`;
  const retailerId = `retailer-${id}`;
  const sellerId = `seller-${id}`;
  return {
    product: {
      id: `product-${id}`,
      category: 'wireless_mouse',
      brand: 'Fictional Northstar',
      modelFamily: 'Aster One',
    },
    variant: {
      id: variantId,
      productId: `product-${id}`,
      model: 'Aster One S',
      mpn: known('SYN-ASTER-S-GRAPHITE'),
      gtin: unknown('No synthetic GTIN assigned'),
      size: known('small_medium'),
      handedness: known('ambidextrous'),
      color: known('Graphite'),
      region: known('PK test region'),
      receiverOrPack: known('Bluetooth and USB receiver; single mouse'),
      identityStatus: 'user_entered',
      identityRevision: 1,
    },
    retailer: {
      id: retailerId,
      label: `Fictional Shop ${id}`,
      canonicalHost: `${id}.example.invalid`,
    },
    seller: {
      id: sellerId,
      retailerId,
      label: known(`Fictional Seller ${id}`),
      retailerSellerId: null,
    },
    offer: {
      id: `offer-${id}`,
      retailerId,
      sellerId,
      variantId,
      retailerListingId: null,
      retailerSku: null,
      selectedOptionIds: {},
      canonicalUrl: `https://${id}.example.invalid/products/aster-one-s`,
      condition: known('new'),
      warranty: known({
        provider: 'Fictional Northstar',
        kind: 'manufacturer',
        months: 12,
        scope: known('Parts and labor'),
        termsRef: null,
      }),
      eligibility: 'public',
      eligibilityDetails: [],
      contextRevision: 1,
    },
    price: {
      item: pkr(700_000),
      shipping: known(pkr(30_000)),
      tax: known({ includedInItem: true, additional: pkr(0) }),
      mandatoryFees: known({ items: [], complete: true }),
      additionalDiscount: known({ amount: pkr(0), alreadyIncluded: false, conditions: [] }),
      locationScope: known('Karachi'),
      paymentContext: known('standard'),
    },
    stock: 'in_stock',
    sourceKind,
  };
}

test('exact evidenced variants and terms can be provisionally ranked', () => {
  const left = snapshot('left');
  const right = snapshot('right');
  right.price.item = pkr(680_000);
  right.offer.warranty = known({
    provider: 'Fictional Northstar',
    kind: 'manufacturer',
    months: 12,
    scope: known('Parts and labor'),
    termsRef: 'https://right.example.invalid/warranty',
  });

  const result = compareOffers(left, right, 'delivered');
  assert.equal(result.identity, 'same');
  assert.equal(result.coreTerms, 'same', 'different evidence URLs do not change equivalent warranty terms');
  assert.equal(result.classification, 'comparable');
  assert.equal(result.rankingEligible, true);
  assert.equal(result.provisional, true, 'manual evidence never becomes merchant-verified');
  assert.equal(result.leftAmount?.amountMinor, 730_000);
  assert.equal(result.rightAmount?.amountMinor, 710_000);
});

test('similar model names and critical intrinsic differences produce mismatches', () => {
  const cases: Array<[string, (right: ComparableOfferSnapshot) => void]> = [
    ['model', right => { right.variant.model = 'Aster One L'; }],
    ['part number', right => { right.variant.mpn = known('SYN-ASTER-L-GRAPHITE'); }],
    ['size', right => { right.variant.size = known('large'); }],
    ['handedness', right => { right.variant.handedness = known('left'); }],
    ['color', right => { right.variant.color = known('Pearl'); }],
    ['region', right => { right.variant.region = known('EU test region'); }],
    ['connectivity or pack', right => { right.variant.receiverOrPack = known('Bluetooth only; two-mouse pack'); }],
  ];

  for (const [label, mutate] of cases) {
    const right = snapshot(`right-${label.replaceAll(' ', '-')}`);
    mutate(right);
    const result = compareOffers(snapshot('left'), right);
    assert.equal(result.identity, 'different', label);
    assert.equal(result.classification, 'mismatch', label);
    assert.equal(result.rankingEligible, false, label);
  }
});

test('matching unknown values never establish an exact identity', () => {
  const left = snapshot('left');
  const right = snapshot('right');
  left.variant.mpn = unknown('Not printed');
  right.variant.mpn = unknown('Not printed');
  left.variant.gtin = unknown('Not supplied');
  right.variant.gtin = unknown('Not supplied');

  const result = compareOffers(left, right);
  assert.equal(result.identity, 'insufficient_evidence');
  assert.equal(result.classification, 'insufficient_evidence');
  assert.match(result.reasons.join('; '), /manufacturer identifier/);
});

test('condition, warranty, and eligibility are independent core-term gates', () => {
  const changedCondition = snapshot('condition');
  changedCondition.offer.condition = known('refurbished');
  assert.equal(compareOffers(snapshot('left'), changedCondition).coreTerms, 'different');

  const missingCondition = snapshot('missing-condition');
  missingCondition.offer.condition = unknown('Listing omitted condition');
  assert.equal(compareOffers(snapshot('left'), missingCondition).classification, 'insufficient_evidence');

  const sellerWarranty = snapshot('seller-warranty');
  sellerWarranty.offer.warranty = known({
    provider: 'Fictional Seller',
    kind: 'seller',
    months: 12,
    scope: known('Parts and labor'),
    termsRef: null,
  });
  assert.equal(compareOffers(snapshot('left'), sellerWarranty).classification, 'mismatch');

  const conditional = snapshot('conditional');
  conditional.offer.eligibility = 'conditional';
  conditional.offer.eligibilityDetails = ['Named card required'];
  assert.equal(compareOffers(snapshot('left'), conditional).classification, 'mismatch');
});

test('shipping and stock affect ranking without changing benchmark class', () => {
  const unknownShipping = snapshot('unknown-shipping');
  unknownShipping.price.shipping = unknown('Delivery was not entered');
  const delivered = compareOffers(snapshot('left'), unknownShipping, 'delivered');
  assert.equal(delivered.classification, 'comparable');
  assert.equal(delivered.rankingEligible, false);
  assert.equal(delivered.rightAmount, null);

  const item = compareOffers(snapshot('left'), unknownShipping, 'item');
  assert.equal(item.classification, 'comparable');
  assert.equal(item.rankingEligible, true, 'unknown shipping does not block an explicitly item-price comparison');

  const unavailable = snapshot('unavailable');
  unavailable.stock = 'out_of_stock';
  const unavailableResult = compareOffers(snapshot('left'), unavailable, 'item');
  assert.equal(unavailableResult.classification, 'comparable');
  assert.equal(unavailableResult.rankingEligible, false);
});

test('benchmark class never converts an evidence gap into a match', () => {
  assert.equal(deriveBenchmarkClass('same', 'same'), 'comparable');
  assert.equal(deriveBenchmarkClass('different', 'insufficient_evidence'), 'mismatch');
  assert.equal(deriveBenchmarkClass('same', 'insufficient_evidence'), 'insufficient_evidence');
});
