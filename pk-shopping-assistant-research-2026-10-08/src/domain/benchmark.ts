import { compareOffers } from './comparison.js';
import type { BenchmarkClass, ComparableOfferSnapshot } from './comparison.js';
import { MAX_MONEY_AMOUNT_MINOR } from './limits.js';
import type {
  Condition,
  Eligibility,
  Evidence,
  Handedness,
  IdentityStatus,
  MouseSize,
  Stock,
  WarrantyKind,
} from './types.js';

export interface BenchmarkWarrantyFacts {
  provider: string;
  kind: WarrantyKind;
  months: number;
  scope: string | null;
}

export interface BenchmarkOfferFacts {
  brand: string;
  modelFamily: string;
  model: string;
  mpn: string | null;
  gtin: string | null;
  size: MouseSize | null;
  handedness: Handedness | null;
  color: string | null;
  region: string | null;
  receiverOrPack: string | null;
  identityStatus: IdentityStatus;
  seller: string | null;
  condition: Condition | null;
  warranty: BenchmarkWarrantyFacts | null;
  eligibility: Eligibility;
  eligibilityDetails: string[];
  stock: Stock;
  itemMinor: number;
  shippingMinor: number | null;
}

export interface BenchmarkPair {
  id: string;
  modelFamily: string;
  provenance: 'synthetic_owned';
  expected: BenchmarkClass;
  criticalConflict: boolean;
  rationale: string;
  left: BenchmarkOfferFacts;
  right: BenchmarkOfferFacts;
}

export interface BenchmarkMetrics {
  population: 'synthetic';
  total: number;
  confusionMatrix: Record<BenchmarkClass, Record<BenchmarkClass, number>>;
  predictedComparableCorrect: number;
  predictedComparableDenominator: number;
  comparableRecallCorrect: number;
  comparableRecallDenominator: number;
  classifiedCount: number;
  abstentionCount: number;
  criticalFalsePositives: string[];
  misclassified: Array<{ id: string; expected: BenchmarkClass; predicted: BenchmarkClass }>;
  rankingEligibleCount: number;
}

const FACT_KEYS = [
  'brand', 'modelFamily', 'model', 'mpn', 'gtin', 'size', 'handedness', 'color', 'region',
  'receiverOrPack', 'identityStatus', 'seller', 'condition', 'warranty', 'eligibility',
  'eligibilityDetails', 'stock', 'itemMinor', 'shippingMinor',
] as const;
const PAIR_KEYS = ['id', 'modelFamily', 'provenance', 'expected', 'criticalConflict', 'rationale', 'left', 'right'] as const;
const WARRANTY_KEYS = ['provider', 'kind', 'months', 'scope'] as const;
const CLASSES: readonly BenchmarkClass[] = ['comparable', 'mismatch', 'insufficient_evidence'];

function object(value: unknown, label: string, keys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  if (Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${label} must be an ordinary JSON object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} has unexpected or missing fields`);
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string, nullable = false): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 180) throw new Error(`${label} must be bounded text`);
  return value;
}

function oneOf<T extends string>(value: unknown, label: string, allowed: readonly T[], nullable = false): T | null {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error(`${label} has an unsupported value`);
  return value as T;
}

function money(value: unknown, label: string, nullable = false): number | null {
  if (nullable && value === null) return null;
  if (!Number.isSafeInteger(value) || (value as number) < (nullable ? 0 : 1) || (value as number) > MAX_MONEY_AMOUNT_MINOR) {
    throw new Error(`${label} must be valid PKR minor units`);
  }
  return value as number;
}

function parseWarranty(value: unknown, label: string): BenchmarkWarrantyFacts | null {
  if (value === null) return null;
  const candidate = object(value, label, WARRANTY_KEYS);
  const months = candidate.months;
  if (!Number.isSafeInteger(months) || (months as number) < 0 || (months as number) > 1_200) throw new Error(`${label}.months is invalid`);
  return {
    provider: string(candidate.provider, `${label}.provider`) as string,
    kind: oneOf(candidate.kind, `${label}.kind`, ['manufacturer', 'seller'] as const) as WarrantyKind,
    months: months as number,
    scope: string(candidate.scope, `${label}.scope`, true),
  };
}

function parseFacts(value: unknown, label: string): BenchmarkOfferFacts {
  const candidate = object(value, label, FACT_KEYS);
  if (!Array.isArray(candidate.eligibilityDetails) || candidate.eligibilityDetails.length > 10) {
    throw new Error(`${label}.eligibilityDetails must be a bounded array`);
  }
  return {
    brand: string(candidate.brand, `${label}.brand`) as string,
    modelFamily: string(candidate.modelFamily, `${label}.modelFamily`) as string,
    model: string(candidate.model, `${label}.model`) as string,
    mpn: string(candidate.mpn, `${label}.mpn`, true),
    gtin: string(candidate.gtin, `${label}.gtin`, true),
    size: oneOf(candidate.size, `${label}.size`, ['small_medium', 'large'] as const, true),
    handedness: oneOf(candidate.handedness, `${label}.handedness`, ['right', 'left', 'ambidextrous'] as const, true),
    color: string(candidate.color, `${label}.color`, true),
    region: string(candidate.region, `${label}.region`, true),
    receiverOrPack: string(candidate.receiverOrPack, `${label}.receiverOrPack`, true),
    identityStatus: oneOf(candidate.identityStatus, `${label}.identityStatus`, ['user_entered', 'reviewed_exact', 'ambiguous'] as const) as IdentityStatus,
    seller: string(candidate.seller, `${label}.seller`, true),
    condition: oneOf(candidate.condition, `${label}.condition`, ['new', 'refurbished', 'used'] as const, true),
    warranty: parseWarranty(candidate.warranty, `${label}.warranty`),
    eligibility: oneOf(candidate.eligibility, `${label}.eligibility`, ['public', 'conditional', 'personalized', 'unknown'] as const) as Eligibility,
    eligibilityDetails: candidate.eligibilityDetails.map((entry, index) => string(entry, `${label}.eligibilityDetails[${index}]`) as string),
    stock: oneOf(candidate.stock, `${label}.stock`, ['in_stock', 'out_of_stock', 'preorder', 'unknown'] as const) as Stock,
    itemMinor: money(candidate.itemMinor, `${label}.itemMinor`) as number,
    shippingMinor: money(candidate.shippingMinor, `${label}.shippingMinor`, true),
  };
}

export function parseBenchmarkJsonl(content: string, sourceLabel: string): BenchmarkPair[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  const ids = new Set<string>();
  return lines.map((line, index) => {
    let raw: unknown;
    try {
      raw = JSON.parse(line) as unknown;
    } catch {
      throw new Error(`${sourceLabel}:${index + 1} is not valid JSON`);
    }
    const candidate = object(raw, `${sourceLabel}:${index + 1}`, PAIR_KEYS);
    const id = string(candidate.id, `${sourceLabel}:${index + 1}.id`) as string;
    if (ids.has(id)) throw new Error(`${sourceLabel} contains duplicate ID ${id}`);
    ids.add(id);
    const expected = oneOf(candidate.expected, `${id}.expected`, CLASSES) as BenchmarkClass;
    if (candidate.provenance !== 'synthetic_owned') throw new Error(`${id} must be labeled synthetic_owned`);
    if (typeof candidate.criticalConflict !== 'boolean') throw new Error(`${id}.criticalConflict must be boolean`);
    if ((expected === 'mismatch') !== candidate.criticalConflict) throw new Error(`${id} criticalConflict must identify material mismatches only`);
    const left = parseFacts(candidate.left, `${id}.left`);
    const right = parseFacts(candidate.right, `${id}.right`);
    const modelFamily = string(candidate.modelFamily, `${id}.modelFamily`) as string;
    if (left.modelFamily !== modelFamily || right.modelFamily !== modelFamily) throw new Error(`${id} family fields disagree`);
    return {
      id,
      modelFamily,
      provenance: 'synthetic_owned',
      expected,
      criticalConflict: candidate.criticalConflict,
      rationale: string(candidate.rationale, `${id}.rationale`) as string,
      left,
      right,
    };
  });
}

function known<T>(value: T, sourceRef: string): Evidence<T> {
  return { state: 'known', value, basis: 'Owned synthetic benchmark fact', sourceRef };
}

function optional<T>(value: T | null, label: string, sourceRef: string): Evidence<T> {
  return value === null ? { state: 'unknown', reason: `${label} intentionally omitted in synthetic case` } : known(value, sourceRef);
}

function stableUuid(seed: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (const character of seed) {
    first = Math.imul(first ^ character.charCodeAt(0), 0x01000193) >>> 0;
    second = Math.imul(second ^ character.charCodeAt(0), 0x85ebca6b) >>> 0;
  }
  const suffix = `${first.toString(16).padStart(8, '0')}${(second & 0xffff).toString(16).padStart(4, '0')}`;
  return `00000000-0000-4000-8000-${suffix}`;
}

function toSnapshot(pairId: string, side: 'left' | 'right', facts: BenchmarkOfferFacts): ComparableOfferSnapshot {
  const sourceRef = `synthetic-benchmark:${pairId}:${side}`;
  const productId = stableUuid(`${pairId}:${side}:product`);
  const variantId = stableUuid(`${pairId}:${side}:variant`);
  const retailerId = stableUuid(`${pairId}:${side}:retailer`);
  const sellerId = stableUuid(`${pairId}:${side}:seller`);
  return {
    product: { id: productId, category: 'wireless_mouse', brand: facts.brand, modelFamily: facts.modelFamily },
    variant: {
      id: variantId,
      productId,
      model: facts.model,
      mpn: optional(facts.mpn, 'MPN', sourceRef),
      gtin: optional(facts.gtin, 'GTIN', sourceRef),
      size: optional(facts.size, 'size', sourceRef),
      handedness: optional(facts.handedness, 'handedness', sourceRef),
      color: optional(facts.color, 'color', sourceRef),
      region: optional(facts.region, 'region', sourceRef),
      receiverOrPack: optional(facts.receiverOrPack, 'receiver or pack', sourceRef),
      identityStatus: facts.identityStatus,
      identityRevision: 1,
    },
    retailer: {
      id: retailerId,
      label: `Fictional ${side === 'left' ? 'Cedar' : 'Willow'} Shop`,
      canonicalHost: `${side}-${pairId}.example.invalid`,
    },
    seller: {
      id: sellerId,
      retailerId,
      label: optional(facts.seller, 'seller', sourceRef),
      retailerSellerId: null,
    },
    offer: {
      id: stableUuid(`${pairId}:${side}:offer`),
      retailerId,
      sellerId,
      variantId,
      retailerListingId: null,
      retailerSku: null,
      selectedOptionIds: {},
      canonicalUrl: `https://${side}-${pairId}.example.invalid/products/synthetic-mouse`,
      condition: optional(facts.condition, 'condition', sourceRef),
      warranty: facts.warranty === null ? { state: 'unknown', reason: 'Warranty intentionally omitted in synthetic case' } : known({
        provider: facts.warranty.provider,
        kind: facts.warranty.kind,
        months: facts.warranty.months,
        scope: optional(facts.warranty.scope, 'warranty scope', sourceRef),
        termsRef: null,
      }, sourceRef),
      eligibility: facts.eligibility,
      eligibilityDetails: [...facts.eligibilityDetails],
      contextRevision: 1,
    },
    price: {
      item: { amountMinor: facts.itemMinor, currency: 'PKR', minorUnit: 2 },
      shipping: optional(
        facts.shippingMinor === null ? null : { amountMinor: facts.shippingMinor, currency: 'PKR', minorUnit: 2 },
        'shipping',
        sourceRef,
      ),
      tax: known({ includedInItem: true, additional: { amountMinor: 0, currency: 'PKR', minorUnit: 2 } }, sourceRef),
      mandatoryFees: known({ items: [], complete: true }, sourceRef),
      additionalDiscount: known({ amount: { amountMinor: 0, currency: 'PKR', minorUnit: 2 }, alreadyIncluded: false, conditions: [] }, sourceRef),
      locationScope: known('Karachi', sourceRef),
      paymentContext: known('standard', sourceRef),
    },
    stock: facts.stock,
    sourceKind: 'synthetic',
  };
}

export function evaluateBenchmark(pairs: readonly BenchmarkPair[]): BenchmarkMetrics {
  const matrix = Object.fromEntries(CLASSES.map(expected => [
    expected,
    Object.fromEntries(CLASSES.map(predicted => [predicted, 0])) as Record<BenchmarkClass, number>,
  ])) as Record<BenchmarkClass, Record<BenchmarkClass, number>>;
  const metrics: BenchmarkMetrics = {
    population: 'synthetic',
    total: pairs.length,
    confusionMatrix: matrix,
    predictedComparableCorrect: 0,
    predictedComparableDenominator: 0,
    comparableRecallCorrect: 0,
    comparableRecallDenominator: 0,
    classifiedCount: 0,
    abstentionCount: 0,
    criticalFalsePositives: [],
    misclassified: [],
    rankingEligibleCount: 0,
  };
  for (const pair of pairs) {
    const result = compareOffers(toSnapshot(pair.id, 'left', pair.left), toSnapshot(pair.id, 'right', pair.right), 'delivered');
    const predicted = result.classification;
    matrix[pair.expected][predicted] += 1;
    if (predicted === 'comparable') {
      metrics.predictedComparableDenominator += 1;
      if (pair.expected === 'comparable') metrics.predictedComparableCorrect += 1;
    }
    if (pair.expected === 'comparable') {
      metrics.comparableRecallDenominator += 1;
      if (predicted === 'comparable') metrics.comparableRecallCorrect += 1;
    }
    if (predicted === 'insufficient_evidence') metrics.abstentionCount += 1;
    else metrics.classifiedCount += 1;
    if (result.rankingEligible) metrics.rankingEligibleCount += 1;
    if (predicted !== pair.expected) metrics.misclassified.push({ id: pair.id, expected: pair.expected, predicted });
    if (predicted === 'comparable' && pair.expected === 'mismatch' && pair.criticalConflict) {
      metrics.criticalFalsePositives.push(pair.id);
    }
  }
  return metrics;
}
