import { MAX_MONEY_AMOUNT_MINOR } from './limits.js';
import { summarizePriceComponents } from './money.js';
import {
  LOCAL_ALLOWED_USES,
  LOCAL_PURPOSE_DECLARATION_VERSION,
  localSourceMatchesAccess,
} from './provenance.js';
import type {
  AccessMethod,
  AccessRecord,
  AccessState,
  AdditionalDiscount,
  AllowedUse,
  Condition,
  Eligibility,
  Evidence,
  FeeKind,
  Handedness,
  IdentityStatus,
  MandatoryFee,
  MandatoryFees,
  Money,
  MouseSize,
  Observation,
  ObservationStatus,
  Offer,
  PaymentContext,
  PriceComponents,
  Product,
  Retailer,
  Seller,
  SourceKind,
  Stock,
  TaxComponents,
  TimeBasis,
  UtcIso,
  Variant,
  Warranty,
  WarrantyKind,
} from './types.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;

export interface ValidationIssue {
  path: string;
  message: string;
}

export class ValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(issues.map(issue => `${issue.path}: ${issue.message}`).join('; '));
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export interface ProductUrlPolicy {
  identityQueryParameters?: readonly string[];
}

function fail(path: string, message: string): never {
  throw new ValidationError([{ path, message }]);
}

function record(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(path, 'must not inherit an untrusted prototype');
  if (Object.getOwnPropertySymbols(value).length !== 0) fail(path, 'symbol keys are not allowed');
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${path}.${key}`, 'unexpected field');
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, 'field is required');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, maximum = 180, allowEmpty = false): string {
  if (typeof value !== 'string') fail(path, 'must be text');
  if ((!allowEmpty && value.trim().length === 0) || value.length > maximum) {
    fail(path, `must contain ${allowEmpty ? 'at most' : '1 to'} ${maximum} characters`);
  }
  if (CONTROL_PATTERN.test(value)) fail(path, 'must not contain control characters');
  return value;
}

function nullableText(value: unknown, path: string, maximum = 180): string | null {
  return value === null ? null : text(value, path, maximum);
}

function uuid(value: unknown, path: string): string {
  const result = text(value, path, 36);
  if (!UUID_PATTERN.test(result)) fail(path, 'must be a canonical UUID');
  return result.toLowerCase();
}

function integer(value: unknown, path: string, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    fail(path, `must be a safe integer from ${minimum} through ${maximum}`);
  }
  return value as number;
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, 'must be a boolean');
  return value;
}

function enumeration<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) fail(path, `must be one of: ${allowed.join(', ')}`);
  return value as T;
}

function stringArray(value: unknown, path: string, maximumItems = 30): string[] {
  if (!Array.isArray(value) || value.length > maximumItems) fail(path, `must be an array with at most ${maximumItems} entries`);
  return value.map((entry, index) => text(entry, `${path}[${index}]`));
}

function enumArray<T extends string>(value: unknown, path: string, allowed: readonly T[], maximumItems = 30): T[] {
  if (!Array.isArray(value) || value.length > maximumItems) fail(path, `must be an array with at most ${maximumItems} entries`);
  return value.map((entry, index) => enumeration(entry, `${path}[${index}]`, allowed));
}

function nullableInteger(value: unknown, path: string): number | null {
  return value === null ? null : integer(value, path);
}

function utc(value: unknown, path: string): UtcIso {
  const result = text(value, path, 30);
  const epoch = Date.parse(result);
  if (!UTC_ISO_PATTERN.test(result) || !Number.isFinite(epoch) || new Date(epoch).toISOString().slice(0, 19) !== result.slice(0, 19)) {
    fail(path, 'must be a valid ISO-8601 UTC instant ending in Z');
  }
  return result;
}

function nullableUtc(value: unknown, path: string): UtcIso | null {
  return value === null ? null : utc(value, path);
}

function evidence<T>(value: unknown, path: string, parseValue: (input: unknown, path: string) => T): Evidence<T> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be structured evidence');
  const state = (value as Record<string, unknown>).state;
  if (state === 'known') {
    const candidate = record(value, path, ['state', 'value', 'basis', 'sourceRef']);
    return {
      state: 'known',
      value: parseValue(candidate.value, `${path}.value`),
      basis: text(candidate.basis, `${path}.basis`),
      sourceRef: text(candidate.sourceRef, `${path}.sourceRef`, 200),
    };
  }
  if (state === 'unknown') {
    const candidate = record(value, path, ['state', 'reason']);
    return { state: 'unknown', reason: text(candidate.reason, `${path}.reason`) };
  }
  fail(`${path}.state`, 'must be known or unknown');
}

export function validateMoney(value: unknown, path = 'money', positive = false): Money {
  const candidate = record(value, path, ['amountMinor', 'currency', 'minorUnit']);
  const amountMinor = integer(candidate.amountMinor, `${path}.amountMinor`, positive ? 1 : 0, MAX_MONEY_AMOUNT_MINOR);
  if (candidate.currency !== 'PKR') fail(`${path}.currency`, 'only PKR is supported');
  if (candidate.minorUnit !== 2) fail(`${path}.minorUnit`, 'must be 2 for PKR');
  return { amountMinor, currency: 'PKR', minorUnit: 2 };
}

export function validateProduct(value: unknown, path = 'product'): Product {
  const candidate = record(value, path, ['id', 'category', 'brand', 'modelFamily']);
  if (candidate.category !== 'wireless_mouse') fail(`${path}.category`, 'must be wireless_mouse');
  return {
    id: uuid(candidate.id, `${path}.id`),
    category: 'wireless_mouse',
    brand: text(candidate.brand, `${path}.brand`),
    modelFamily: text(candidate.modelFamily, `${path}.modelFamily`, 100),
  };
}

const MOUSE_SIZES: readonly MouseSize[] = ['small_medium', 'large'];
const HANDEDNESS: readonly Handedness[] = ['right', 'left', 'ambidextrous'];
const IDENTITY_STATUSES: readonly IdentityStatus[] = ['user_entered', 'reviewed_exact', 'ambiguous'];

export function validateVariant(value: unknown, path = 'variant'): Variant {
  const candidate = record(value, path, [
    'id', 'productId', 'model', 'mpn', 'gtin', 'size', 'handedness', 'color', 'region',
    'receiverOrPack', 'identityStatus', 'identityRevision',
  ]);
  return {
    id: uuid(candidate.id, `${path}.id`),
    productId: uuid(candidate.productId, `${path}.productId`),
    model: text(candidate.model, `${path}.model`, 100),
    mpn: evidence(candidate.mpn, `${path}.mpn`, (entry, entryPath) => text(entry, entryPath, 100)),
    gtin: evidence(candidate.gtin, `${path}.gtin`, (entry, entryPath) => text(entry, entryPath, 100)),
    size: evidence(candidate.size, `${path}.size`, (entry, entryPath) => enumeration(entry, entryPath, MOUSE_SIZES)),
    handedness: evidence(candidate.handedness, `${path}.handedness`, (entry, entryPath) => enumeration(entry, entryPath, HANDEDNESS)),
    color: evidence(candidate.color, `${path}.color`, text),
    region: evidence(candidate.region, `${path}.region`, text),
    receiverOrPack: evidence(candidate.receiverOrPack, `${path}.receiverOrPack`, text),
    identityStatus: enumeration(candidate.identityStatus, `${path}.identityStatus`, IDENTITY_STATUSES),
    identityRevision: integer(candidate.identityRevision, `${path}.identityRevision`, 1),
  };
}

function validHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) return false;
  const unbracketed = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (unbracketed === '::1' || unbracketed === '::' || unbracketed.startsWith('fc') || unbracketed.startsWith('fd') || unbracketed.startsWith('fe8') || unbracketed.startsWith('fe9') || unbracketed.startsWith('fea') || unbracketed.startsWith('feb')) return false;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(unbracketed);
  if (ipv4 !== null) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some(octet => octet > 255)) return false;
    const [first = 0, second = 0] = octets;
    if (first === 0 || first === 10 || first === 127 || first >= 224 || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)) return false;
  }
  return hostname.includes('.') || hostname.endsWith('.invalid');
}

export function sanitizeProductUrl(input: unknown, policy: ProductUrlPolicy = {}): string {
  const raw = text(input, 'canonicalUrl', 2048);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    fail('canonicalUrl', 'must be an absolute URL');
  }
  if (parsed.protocol !== 'https:') fail('canonicalUrl', 'must use HTTPS');
  if (parsed.username !== '' || parsed.password !== '') fail('canonicalUrl', 'must not contain credentials');
  if (!validHostname(parsed.hostname)) fail('canonicalUrl', 'must not target a local or private host');
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    fail('canonicalUrl', 'contains malformed path encoding');
  }
  if (/(?:^|\/)(?:account|accounts|login|sign-in|signin|cart|checkout|payment|payments|wallet|orders?)(?:\/|$)/i.test(decodedPath)) {
    fail('canonicalUrl', 'must reference a public product path, not an account or checkout path');
  }
  const allowed = new Set((policy.identityQueryParameters ?? []).map(parameter => {
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(parameter)) fail('identityQueryParameters', 'contains an invalid parameter name');
    return parameter;
  }));
  for (const key of [...parsed.searchParams.keys()]) {
    if (!allowed.has(key)) parsed.searchParams.delete(key);
  }
  parsed.hash = '';
  const result = parsed.toString();
  if (result.length > 2048) fail('canonicalUrl', 'sanitized URL exceeds 2,048 characters');
  return result;
}

export function validateRetailer(value: unknown, path = 'retailer'): Retailer {
  const candidate = record(value, path, ['id', 'label', 'canonicalHost']);
  const canonicalHost = nullableText(candidate.canonicalHost, `${path}.canonicalHost`, 253);
  if (canonicalHost !== null && (!validHostname(canonicalHost) || canonicalHost.includes('/') || canonicalHost.includes(':'))) {
    fail(`${path}.canonicalHost`, 'must be a public hostname without scheme, path, or port');
  }
  return { id: uuid(candidate.id, `${path}.id`), label: text(candidate.label, `${path}.label`), canonicalHost };
}

export function validateSeller(value: unknown, path = 'seller'): Seller {
  const candidate = record(value, path, ['id', 'retailerId', 'label', 'retailerSellerId']);
  return {
    id: uuid(candidate.id, `${path}.id`),
    retailerId: uuid(candidate.retailerId, `${path}.retailerId`),
    label: evidence(candidate.label, `${path}.label`, text),
    retailerSellerId: nullableText(candidate.retailerSellerId, `${path}.retailerSellerId`, 100),
  };
}

const CONDITIONS: readonly Condition[] = ['new', 'refurbished', 'used'];
const WARRANTY_KINDS: readonly WarrantyKind[] = ['manufacturer', 'seller'];
const ELIGIBILITIES: readonly Eligibility[] = ['public', 'conditional', 'personalized', 'unknown'];

function validateWarranty(value: unknown, path: string): Warranty {
  const candidate = record(value, path, ['provider', 'kind', 'months', 'scope', 'termsRef']);
  return {
    provider: text(candidate.provider, `${path}.provider`),
    kind: enumeration(candidate.kind, `${path}.kind`, WARRANTY_KINDS),
    months: integer(candidate.months, `${path}.months`, 0, 1_200),
    scope: evidence(candidate.scope, `${path}.scope`, text),
    termsRef: nullableText(candidate.termsRef, `${path}.termsRef`, 2048),
  };
}

function selectedOptions(value: unknown, path: string): Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(path, 'must not inherit an untrusted prototype');
  const entries = Object.entries(value);
  if (entries.length > 30) fail(path, 'must contain at most 30 selected options');
  const result = Object.create(null) as Record<string, string>;
  for (const [key, entry] of entries) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') fail(`${path}.${key}`, 'unsafe key');
    const safeKey = text(key, `${path} key`, 100);
    result[safeKey] = text(entry, `${path}.${key}`, 180);
  }
  return result;
}

export function validateOffer(value: unknown, policy: ProductUrlPolicy = {}, path = 'offer'): Offer {
  const candidate = record(value, path, [
    'id', 'retailerId', 'sellerId', 'variantId', 'retailerListingId', 'retailerSku',
    'selectedOptionIds', 'canonicalUrl', 'condition', 'warranty', 'eligibility',
    'eligibilityDetails', 'contextRevision',
  ]);
  const eligibility = enumeration(candidate.eligibility, `${path}.eligibility`, ELIGIBILITIES);
  const eligibilityDetails = stringArray(candidate.eligibilityDetails, `${path}.eligibilityDetails`);
  if ((eligibility === 'conditional' || eligibility === 'personalized') && eligibilityDetails.length === 0) {
    fail(`${path}.eligibilityDetails`, 'conditional or personalized prices need their conditions');
  }
  return {
    id: uuid(candidate.id, `${path}.id`),
    retailerId: uuid(candidate.retailerId, `${path}.retailerId`),
    sellerId: uuid(candidate.sellerId, `${path}.sellerId`),
    variantId: uuid(candidate.variantId, `${path}.variantId`),
    retailerListingId: nullableText(candidate.retailerListingId, `${path}.retailerListingId`, 100),
    retailerSku: nullableText(candidate.retailerSku, `${path}.retailerSku`, 100),
    selectedOptionIds: selectedOptions(candidate.selectedOptionIds, `${path}.selectedOptionIds`),
    canonicalUrl: sanitizeProductUrl(candidate.canonicalUrl, policy),
    condition: evidence(candidate.condition, `${path}.condition`, (entry, entryPath) => enumeration(entry, entryPath, CONDITIONS)),
    warranty: evidence(candidate.warranty, `${path}.warranty`, validateWarranty),
    eligibility,
    eligibilityDetails,
    contextRevision: integer(candidate.contextRevision, `${path}.contextRevision`, 1),
  };
}

const FEE_KINDS: readonly FeeKind[] = ['cod', 'payment', 'handling', 'other'];
const PAYMENT_CONTEXTS: readonly PaymentContext[] = ['standard', 'cod', 'specified_card'];

function validateTax(value: unknown, path: string): TaxComponents {
  const candidate = record(value, path, ['includedInItem', 'additional']);
  const includedInItem = booleanValue(candidate.includedInItem, `${path}.includedInItem`);
  const additional = validateMoney(candidate.additional, `${path}.additional`);
  if (includedInItem && additional.amountMinor !== 0) fail(path, 'included tax must have zero additional amount');
  return { includedInItem, additional };
}

function validateFee(value: unknown, path: string): MandatoryFee {
  const candidate = record(value, path, ['kind', 'label', 'amount']);
  return {
    kind: enumeration(candidate.kind, `${path}.kind`, FEE_KINDS),
    label: text(candidate.label, `${path}.label`),
    amount: validateMoney(candidate.amount, `${path}.amount`),
  };
}

function validateFees(value: unknown, path: string): MandatoryFees {
  const candidate = record(value, path, ['items', 'complete']);
  if (!Array.isArray(candidate.items) || candidate.items.length > 30) fail(`${path}.items`, 'must be a bounded array');
  return {
    items: candidate.items.map((item, index) => validateFee(item, `${path}.items[${index}]`)),
    complete: booleanValue(candidate.complete, `${path}.complete`),
  };
}

function validateDiscount(value: unknown, path: string): AdditionalDiscount {
  const candidate = record(value, path, ['amount', 'alreadyIncluded', 'conditions']);
  if (candidate.alreadyIncluded !== false) fail(`${path}.alreadyIncluded`, 'must be false for a separate discount');
  return {
    amount: validateMoney(candidate.amount, `${path}.amount`),
    alreadyIncluded: false,
    conditions: stringArray(candidate.conditions, `${path}.conditions`),
  };
}

export function validatePriceComponents(value: unknown, path = 'price'): PriceComponents {
  const candidate = record(value, path, [
    'item', 'shipping', 'tax', 'mandatoryFees', 'additionalDiscount', 'locationScope', 'paymentContext',
  ]);
  const result: PriceComponents = {
    item: validateMoney(candidate.item, `${path}.item`, true),
    shipping: evidence(candidate.shipping, `${path}.shipping`, (entry, entryPath) => validateMoney(entry, entryPath)),
    tax: evidence(candidate.tax, `${path}.tax`, validateTax),
    mandatoryFees: evidence(candidate.mandatoryFees, `${path}.mandatoryFees`, validateFees),
    additionalDiscount: evidence(candidate.additionalDiscount, `${path}.additionalDiscount`, validateDiscount),
    locationScope: evidence(candidate.locationScope, `${path}.locationScope`, text),
    paymentContext: evidence(candidate.paymentContext, `${path}.paymentContext`, (entry, entryPath) => enumeration(entry, entryPath, PAYMENT_CONTEXTS)),
  };
  if (summarizePriceComponents(result).issues.some(issue => issue.code === 'discount_exceeds_subtotal')) {
    fail(`${path}.additionalDiscount`, 'cannot exceed the eligible known subtotal');
  }
  return result;
}

const SOURCE_KINDS: readonly SourceKind[] = ['synthetic', 'manual', 'licensed_page', 'merchant_feed'];
const STOCK_STATES: readonly Stock[] = ['in_stock', 'out_of_stock', 'preorder', 'unknown'];
const TIME_BASES: readonly TimeBasis[] = ['manual_entry', 'source_timestamp', 'permitted_page_read'];
const OBSERVATION_STATUSES: readonly ObservationStatus[] = ['accepted', 'quarantined', 'corrected', 'withdrawn'];

export function validateObservation(value: unknown, path = 'observation'): Observation {
  const candidate = record(value, path, [
    'id', 'operationId', 'offerId', 'variantRevision', 'offerContextRevision', 'productSnapshot',
    'identitySnapshot', 'retailerSnapshot', 'sellerSnapshot', 'offerContextSnapshot', 'sourceKind',
    'accessRecordId', 'observedAt', 'receivedAt', 'checkedAt', 'sourceGeneratedAt', 'timeBasis',
    'sourceRevision', 'parserVersion', 'price', 'stock', 'status', 'replacesObservationId',
  ]);
  const productSnapshot = validateProduct(candidate.productSnapshot, `${path}.productSnapshot`);
  const identitySnapshot = validateVariant(candidate.identitySnapshot, `${path}.identitySnapshot`);
  const retailerSnapshot = validateRetailer(candidate.retailerSnapshot, `${path}.retailerSnapshot`);
  const sellerSnapshot = validateSeller(candidate.sellerSnapshot, `${path}.sellerSnapshot`);
  const offerContextSnapshot = validateOffer(candidate.offerContextSnapshot, {}, `${path}.offerContextSnapshot`);
  const offerId = uuid(candidate.offerId, `${path}.offerId`);
  const variantRevision = integer(candidate.variantRevision, `${path}.variantRevision`, 1);
  const offerContextRevision = integer(candidate.offerContextRevision, `${path}.offerContextRevision`, 1);
  if (identitySnapshot.productId !== productSnapshot.id) fail(path, 'identity snapshot does not reference its product snapshot');
  if (sellerSnapshot.retailerId !== retailerSnapshot.id) fail(path, 'seller snapshot does not reference its retailer snapshot');
  if (offerContextSnapshot.id !== offerId || offerContextSnapshot.variantId !== identitySnapshot.id
    || offerContextSnapshot.sellerId !== sellerSnapshot.id || offerContextSnapshot.retailerId !== retailerSnapshot.id) {
    fail(path, 'offer snapshot references do not match the immutable snapshots');
  }
  if (identitySnapshot.identityRevision !== variantRevision || offerContextSnapshot.contextRevision !== offerContextRevision) {
    fail(path, 'snapshot revisions do not match the observation revisions');
  }
  const sourceKind = enumeration(candidate.sourceKind, `${path}.sourceKind`, SOURCE_KINDS);
  const checkedAt = nullableUtc(candidate.checkedAt, `${path}.checkedAt`);
  const sourceGeneratedAt = nullableUtc(candidate.sourceGeneratedAt, `${path}.sourceGeneratedAt`);
  const timeBasis = enumeration(candidate.timeBasis, `${path}.timeBasis`, TIME_BASES);
  const parserVersion = nullableText(candidate.parserVersion, `${path}.parserVersion`, 100);
  if ((sourceKind === 'manual' || sourceKind === 'synthetic')
    && (timeBasis !== 'manual_entry' || checkedAt !== null || sourceGeneratedAt !== null || parserVersion !== null)) {
    fail(path, 'manual and synthetic observations cannot claim a source check, source timestamp, or parser');
  }
  return {
    id: uuid(candidate.id, `${path}.id`),
    operationId: uuid(candidate.operationId, `${path}.operationId`),
    offerId,
    variantRevision,
    offerContextRevision,
    productSnapshot,
    identitySnapshot,
    retailerSnapshot,
    sellerSnapshot,
    offerContextSnapshot,
    sourceKind,
    accessRecordId: uuid(candidate.accessRecordId, `${path}.accessRecordId`),
    observedAt: utc(candidate.observedAt, `${path}.observedAt`),
    receivedAt: utc(candidate.receivedAt, `${path}.receivedAt`),
    checkedAt,
    sourceGeneratedAt,
    timeBasis,
    sourceRevision: nullableText(candidate.sourceRevision, `${path}.sourceRevision`, 200),
    parserVersion,
    price: validatePriceComponents(candidate.price, `${path}.price`),
    stock: enumeration(candidate.stock, `${path}.stock`, STOCK_STATES),
    status: enumeration(candidate.status, `${path}.status`, OBSERVATION_STATUSES),
    replacesObservationId: candidate.replacesObservationId === null ? null : uuid(candidate.replacesObservationId, `${path}.replacesObservationId`),
  };
}

export function validateObservationAgainstAccess(value: unknown, accessValue: unknown): Observation {
  const observation = validateObservation(value);
  const access = validateAccessRecord(accessValue);
  if (observation.accessRecordId !== access.id) fail('observation.accessRecordId', 'does not match the supplied access record');
  if ((observation.sourceKind === 'manual' || observation.sourceKind === 'synthetic')
    && !localSourceMatchesAccess(observation.sourceKind, access)) {
    fail('observation.sourceKind', 'does not match the local-purpose declaration');
  }
  if ((observation.sourceKind === 'licensed_page' || observation.sourceKind === 'merchant_feed')
    && (access.kind !== 'written_grant' || access.state !== 'active')) {
    fail('observation.sourceKind', 'licensed source facts require an active written grant');
  }
  return observation;
}

const ACCESS_METHODS: readonly AccessMethod[] = ['manual', 'visible_page', 'merchant_feed', 'scheduled_fetch'];
const ALLOWED_USES: readonly AllowedUse[] = [
  'personal_local_display', 'personal_local_comparison', 'personal_export', 'public_current_display',
  'public_history', 'comparison', 'derived_statistics', 'public_api', 'alerts',
];
const ACCESS_STATES: readonly AccessState[] = ['not_applicable', 'pending', 'active', 'expired', 'revoked'];

export function validateAccessRecord(value: unknown, path = 'accessRecord'): AccessRecord {
  const candidate = record(value, path, [
    'id', 'rightsHolder', 'evidenceRef', 'kind', 'sourceHosts', 'merchantIds', 'fields', 'methods',
    'allowedUses', 'approvedPathsOrEndpoints', 'approvedSkus', 'historyRetentionDays', 'cacheSeconds',
    'attribution', 'effectiveAt', 'expiresAt', 'revokedAt', 'costTermsRef', 'state',
  ]);
  const kind = enumeration(candidate.kind, `${path}.kind`, ['synthetic_owned', 'personal_manual', 'written_grant'] as const);
  const methods = enumArray(candidate.methods, `${path}.methods`, ACCESS_METHODS);
  const allowedUses = enumArray(candidate.allowedUses, `${path}.allowedUses`, ALLOWED_USES);
  const sourceHosts = stringArray(candidate.sourceHosts, `${path}.sourceHosts`);
  const merchantIds = (() => {
    if (!Array.isArray(candidate.merchantIds) || candidate.merchantIds.length > 30) fail(`${path}.merchantIds`, 'must be a bounded array');
    return candidate.merchantIds.map((entry, index) => uuid(entry, `${path}.merchantIds[${index}]`));
  })();
  const fields = stringArray(candidate.fields, `${path}.fields`, 100);
  const approvedPathsOrEndpoints = stringArray(candidate.approvedPathsOrEndpoints, `${path}.approvedPathsOrEndpoints`, 100);
  const approvedSkus = stringArray(candidate.approvedSkus, `${path}.approvedSkus`, 1_000);
  const state = enumeration(candidate.state, `${path}.state`, ACCESS_STATES);

  if (kind === 'written_grant') {
    if (methods.length === 0 || fields.length === 0 || allowedUses.length === 0
      || approvedPathsOrEndpoints.length === 0 || approvedSkus.length === 0) {
      fail(path, 'a written grant needs explicit methods, fields, uses, endpoints/paths, and SKU scope');
    }
  } else {
    const expectedUses = [...LOCAL_ALLOWED_USES].sort().join('|');
    if (methods.length !== 1 || methods[0] !== 'manual' || allowedUses.slice().sort().join('|') !== expectedUses
      || sourceHosts.length !== 0 || merchantIds.length !== 0 || fields.length !== 0
      || approvedPathsOrEndpoints.length !== 0 || approvedSkus.length !== 0 || state !== 'not_applicable'
      || candidate.historyRetentionDays !== null || candidate.cacheSeconds !== null || candidate.attribution !== null
      || candidate.effectiveAt !== null || candidate.expiresAt !== null || candidate.revokedAt !== null
      || candidate.costTermsRef !== null
      || candidate.evidenceRef !== `local-purpose:v${LOCAL_PURPOSE_DECLARATION_VERSION}`) {
      fail(path, 'a local declaration must have the fixed manual, local-only purpose and empty merchant scope');
    }
  }

  return {
    id: uuid(candidate.id, `${path}.id`),
    rightsHolder: text(candidate.rightsHolder, `${path}.rightsHolder`),
    evidenceRef: text(candidate.evidenceRef, `${path}.evidenceRef`, 200),
    kind,
    sourceHosts,
    merchantIds,
    fields,
    methods,
    allowedUses,
    approvedPathsOrEndpoints,
    approvedSkus,
    historyRetentionDays: nullableInteger(candidate.historyRetentionDays, `${path}.historyRetentionDays`),
    cacheSeconds: nullableInteger(candidate.cacheSeconds, `${path}.cacheSeconds`),
    attribution: nullableText(candidate.attribution, `${path}.attribution`),
    effectiveAt: nullableUtc(candidate.effectiveAt, `${path}.effectiveAt`),
    expiresAt: nullableUtc(candidate.expiresAt, `${path}.expiresAt`),
    revokedAt: nullableUtc(candidate.revokedAt, `${path}.revokedAt`),
    costTermsRef: nullableText(candidate.costTermsRef, `${path}.costTermsRef`, 200),
    state,
  };
}
