import { summarizePriceComponents } from './money.js';
import type {
  Eligibility,
  Evidence,
  Money,
  Offer,
  PriceComponents,
  Product,
  Retailer,
  Seller,
  SourceKind,
  Stock,
  Variant,
  Warranty,
} from './types.js';

export type ComparisonDecision = 'same' | 'different' | 'insufficient_evidence';
export type BenchmarkClass = 'comparable' | 'mismatch' | 'insufficient_evidence';
export type PriceBasis = 'item' | 'delivered';

export interface ComparableOfferSnapshot {
  product: Product;
  variant: Variant;
  retailer: Retailer;
  seller: Seller;
  offer: Offer;
  price: PriceComponents;
  stock: Stock;
  sourceKind: SourceKind;
}

export interface ComparisonResult {
  identity: ComparisonDecision;
  coreTerms: ComparisonDecision;
  classification: BenchmarkClass;
  priceBasis: PriceBasis;
  rankingEligible: boolean;
  provisional: boolean;
  leftAmount: Money | null;
  rightAmount: Money | null;
  reasons: string[];
}

interface DecisionAccumulator {
  different: boolean;
  insufficient: boolean;
}

function normalized(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function compareRequiredText(
  label: string,
  left: string,
  right: string,
  state: DecisionAccumulator,
  reasons: string[],
): void {
  if (normalized(left) !== normalized(right)) {
    state.different = true;
    reasons.push(`${label} differs`);
  }
}

function compareEvidence<T>(
  label: string,
  left: Evidence<T>,
  right: Evidence<T>,
  equal: (leftValue: T, rightValue: T) => boolean,
  state: DecisionAccumulator,
  reasons: string[],
): void {
  if (left.state === 'unknown' || right.state === 'unknown') {
    state.insufficient = true;
    reasons.push(`${label} is missing evidence`);
    return;
  }
  if (!equal(left.value, right.value)) {
    state.different = true;
    reasons.push(`${label} differs`);
  }
}

function textEqual(left: string, right: string): boolean {
  return normalized(left) === normalized(right);
}

function evidenceKnownEqual<T>(
  left: Evidence<T>,
  right: Evidence<T>,
  equal: (leftValue: T, rightValue: T) => boolean,
): boolean {
  return left.state === 'known' && right.state === 'known' && equal(left.value, right.value);
}

function evidenceKnownDifferent<T>(
  left: Evidence<T>,
  right: Evidence<T>,
  equal: (leftValue: T, rightValue: T) => boolean,
): boolean {
  return left.state === 'known' && right.state === 'known' && !equal(left.value, right.value);
}

function finalDecision(state: DecisionAccumulator): ComparisonDecision {
  if (state.different) return 'different';
  if (state.insufficient) return 'insufficient_evidence';
  return 'same';
}

function compareIdentity(
  left: ComparableOfferSnapshot,
  right: ComparableOfferSnapshot,
  reasons: string[],
): ComparisonDecision {
  const state: DecisionAccumulator = { different: false, insufficient: false };
  compareRequiredText('brand', left.product.brand, right.product.brand, state, reasons);
  compareRequiredText('model family', left.product.modelFamily, right.product.modelFamily, state, reasons);
  compareRequiredText('model', left.variant.model, right.variant.model, state, reasons);

  if (left.variant.identityStatus === 'ambiguous' || right.variant.identityStatus === 'ambiguous') {
    state.insufficient = true;
    reasons.push('identity is marked ambiguous');
  }

  const mpnEqual = evidenceKnownEqual(left.variant.mpn, right.variant.mpn, textEqual);
  const gtinEqual = evidenceKnownEqual(left.variant.gtin, right.variant.gtin, textEqual);
  if (evidenceKnownDifferent(left.variant.mpn, right.variant.mpn, textEqual)) {
    state.different = true;
    reasons.push('manufacturer part number differs');
  }
  if (evidenceKnownDifferent(left.variant.gtin, right.variant.gtin, textEqual)) {
    state.different = true;
    reasons.push('GTIN differs');
  }
  if (!mpnEqual && !gtinEqual) {
    state.insufficient = true;
    reasons.push('no shared evidenced manufacturer identifier');
  }

  compareEvidence('size', left.variant.size, right.variant.size, (a, b) => a === b, state, reasons);
  compareEvidence('handedness', left.variant.handedness, right.variant.handedness, (a, b) => a === b, state, reasons);
  compareEvidence('color', left.variant.color, right.variant.color, textEqual, state, reasons);
  compareEvidence('region', left.variant.region, right.variant.region, textEqual, state, reasons);
  compareEvidence('receiver or pack', left.variant.receiverOrPack, right.variant.receiverOrPack, textEqual, state, reasons);
  return finalDecision(state);
}

function warrantyEqual(left: Warranty, right: Warranty): boolean {
  if (
    !textEqual(left.provider, right.provider) ||
    left.kind !== right.kind ||
    left.months !== right.months
  ) {
    return false;
  }
  if (left.scope.state === 'unknown' || right.scope.state === 'unknown') return false;
  return textEqual(left.scope.value, right.scope.value);
}

function normalizedDetails(details: readonly string[]): string[] {
  return [...new Set(details.map(normalized))].sort();
}

function eligibilityEqual(
  left: Eligibility,
  right: Eligibility,
  leftDetails: readonly string[],
  rightDetails: readonly string[],
): boolean {
  if (left !== right) return false;
  return JSON.stringify(normalizedDetails(leftDetails)) === JSON.stringify(normalizedDetails(rightDetails));
}

function compareCoreTerms(
  left: ComparableOfferSnapshot,
  right: ComparableOfferSnapshot,
  reasons: string[],
): ComparisonDecision {
  const state: DecisionAccumulator = { different: false, insufficient: false };
  if (left.seller.label.state === 'unknown' || right.seller.label.state === 'unknown') {
    state.insufficient = true;
    reasons.push('seller identity is missing evidence');
  }
  compareEvidence('condition', left.offer.condition, right.offer.condition, (a, b) => a === b, state, reasons);

  if (left.offer.warranty.state === 'unknown' || right.offer.warranty.state === 'unknown') {
    state.insufficient = true;
    reasons.push('warranty is missing evidence');
  } else if (
    left.offer.warranty.value.scope.state === 'unknown' ||
    right.offer.warranty.value.scope.state === 'unknown'
  ) {
    state.insufficient = true;
    reasons.push('warranty scope is missing evidence');
  } else if (!warrantyEqual(left.offer.warranty.value, right.offer.warranty.value)) {
    state.different = true;
    reasons.push('warranty differs');
  }

  if (left.offer.eligibility === 'unknown' || right.offer.eligibility === 'unknown') {
    state.insufficient = true;
    reasons.push('price eligibility is unknown');
  } else if (!eligibilityEqual(
    left.offer.eligibility,
    right.offer.eligibility,
    left.offer.eligibilityDetails,
    right.offer.eligibilityDetails,
  )) {
    state.different = true;
    reasons.push('price eligibility differs');
  }
  return finalDecision(state);
}

export function deriveBenchmarkClass(
  identity: ComparisonDecision,
  coreTerms: ComparisonDecision,
): BenchmarkClass {
  if (identity === 'different' || coreTerms === 'different') return 'mismatch';
  if (identity === 'same' && coreTerms === 'same') return 'comparable';
  return 'insufficient_evidence';
}

function comparableDeliveredContext(left: PriceComponents, right: PriceComponents): boolean {
  return (
    left.locationScope.state === 'known' &&
    right.locationScope.state === 'known' &&
    textEqual(left.locationScope.value, right.locationScope.value) &&
    left.paymentContext.state === 'known' &&
    right.paymentContext.state === 'known' &&
    left.paymentContext.value === right.paymentContext.value
  );
}

function isProvisional(sourceKind: SourceKind): boolean {
  return sourceKind === 'manual' || sourceKind === 'synthetic';
}

export function compareOffers(
  left: ComparableOfferSnapshot,
  right: ComparableOfferSnapshot,
  priceBasis: PriceBasis = 'delivered',
): ComparisonResult {
  const reasons: string[] = [];
  const identity = compareIdentity(left, right, reasons);
  const coreTerms = compareCoreTerms(left, right, reasons);
  const classification = deriveBenchmarkClass(identity, coreTerms);
  const leftPrice = summarizePriceComponents(left.price);
  const rightPrice = summarizePriceComponents(right.price);
  const leftAmount = priceBasis === 'item' ? leftPrice.item : leftPrice.deliveredTotal;
  const rightAmount = priceBasis === 'item' ? rightPrice.item : rightPrice.deliveredTotal;

  if (left.stock !== 'in_stock' || right.stock !== 'in_stock') reasons.push('both offers are not evidenced in stock');
  if (left.offer.eligibility !== 'public' || right.offer.eligibility !== 'public') {
    reasons.push('both prices are not generally available');
  }
  if (priceBasis === 'delivered' && (leftAmount === null || rightAmount === null)) {
    reasons.push('delivered price components are incomplete');
  }
  if (priceBasis === 'delivered' && !comparableDeliveredContext(left.price, right.price)) {
    reasons.push('delivery location or payment context differs');
  }

  const rankingEligible =
    classification === 'comparable' &&
    left.stock === 'in_stock' &&
    right.stock === 'in_stock' &&
    left.offer.eligibility === 'public' &&
    right.offer.eligibility === 'public' &&
    leftAmount !== null &&
    rightAmount !== null &&
    (priceBasis === 'item' || comparableDeliveredContext(left.price, right.price));

  return {
    identity,
    coreTerms,
    classification,
    priceBasis,
    rankingEligible,
    provisional: isProvisional(left.sourceKind) || isProvisional(right.sourceKind),
    leftAmount,
    rightAmount,
    reasons: [...new Set(reasons)],
  };
}
