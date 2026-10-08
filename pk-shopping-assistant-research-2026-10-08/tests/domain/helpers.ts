import type {
  Evidence,
  Money,
  Observation,
  ObservationStatus,
  PriceComponents,
} from '../../src/domain/types.js';

export function testUuid(value: number): string {
  return `00000000-0000-4000-8000-${value.toString(16).padStart(12, '0')}`;
}

export function known<T>(value: T): Evidence<T> {
  return { state: 'known', value, basis: 'Synthetic test fact', sourceRef: 'synthetic:test' };
}

export function unknown<T>(reason: string): Evidence<T> {
  return { state: 'unknown', reason };
}

export function pkr(amountMinor: number): Money {
  return { amountMinor, currency: 'PKR', minorUnit: 2 };
}

export function completePrice(itemMinor = 700_000): PriceComponents {
  return {
    item: pkr(itemMinor),
    shipping: known(pkr(30_000)),
    tax: known({ includedInItem: true, additional: pkr(0) }),
    mandatoryFees: known({ items: [], complete: true }),
    additionalDiscount: known({ amount: pkr(0), alreadyIncluded: false, conditions: [] }),
    locationScope: known('Karachi'),
    paymentContext: known('standard'),
  };
}

export interface ObservationOptions {
  operationId?: string;
  offerId?: string;
  status?: ObservationStatus;
  variantRevision?: number;
  offerContextRevision?: number;
  price?: PriceComponents;
}

export function makeObservation(index: number, observedAt: string, options: ObservationOptions = {}): Observation {
  const productId = testUuid(1);
  const variantId = testUuid(2);
  const retailerId = testUuid(3);
  const sellerId = testUuid(4);
  const offerId = options.offerId ?? testUuid(5);
  const variantRevision = options.variantRevision ?? 1;
  const offerContextRevision = options.offerContextRevision ?? 1;
  return {
    id: testUuid(1_000 + index),
    operationId: options.operationId ?? testUuid(2_000 + index),
    offerId,
    variantRevision,
    offerContextRevision,
    productSnapshot: {
      id: productId,
      category: 'wireless_mouse',
      brand: 'Fictional Northstar',
      modelFamily: 'Aster One',
    },
    identitySnapshot: {
      id: variantId,
      productId,
      model: 'Aster One S',
      mpn: known('SYN-ASTER-S'),
      gtin: unknown('No synthetic GTIN'),
      size: known('small_medium'),
      handedness: known('ambidextrous'),
      color: known('Graphite'),
      region: known('PK test region'),
      receiverOrPack: known('Bluetooth and USB receiver; single mouse'),
      identityStatus: 'user_entered',
      identityRevision: variantRevision,
    },
    retailerSnapshot: {
      id: retailerId,
      label: 'Fictional Cedar Shop',
      canonicalHost: 'cedar.example.invalid',
    },
    sellerSnapshot: {
      id: sellerId,
      retailerId,
      label: known('Fictional Cedar Seller'),
      retailerSellerId: null,
    },
    offerContextSnapshot: {
      id: offerId,
      retailerId,
      sellerId,
      variantId,
      retailerListingId: null,
      retailerSku: null,
      selectedOptionIds: {},
      canonicalUrl: 'https://cedar.example.invalid/products/aster-one-s',
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
      contextRevision: offerContextRevision,
    },
    sourceKind: 'synthetic',
    accessRecordId: testUuid(6),
    observedAt,
    receivedAt: observedAt,
    checkedAt: null,
    sourceGeneratedAt: null,
    timeBasis: 'manual_entry',
    sourceRevision: null,
    parserVersion: null,
    price: options.price ?? completePrice(),
    stock: 'in_stock',
    status: options.status ?? 'accepted',
    replacesObservationId: null,
  };
}
