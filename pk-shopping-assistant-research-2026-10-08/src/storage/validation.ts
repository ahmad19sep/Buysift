import { MAX_OBSERVATIONS } from '../domain/limits.js';
import { LOCAL_PURPOSE_DECLARATION_VERSION } from '../domain/provenance.js';
import type { Observation } from '../domain/types.js';
import {
  ValidationError,
  validateAccessRecord,
  validateObservationAgainstAccess,
  validateOffer,
  validateProduct,
  validateRetailer,
  validateSeller,
  validateVariant,
} from '../domain/validation.js';
import {
  CONSENT_KEY,
  CONTROL_KEY,
  DRAFT_FIELD_NAMES,
  MIGRATION_STAGE_KEY_PREFIX,
  NOTICE_VERSION,
  OFFER_KEY_PREFIX,
  STORAGE_SCHEMA_VERSION,
} from './types.js';
import type {
  ConfirmedOffer,
  ConsentRecordV1,
  DeleteAllControlV1,
  DraftFieldName,
  MigrationControlV1,
  OfferDraft,
  OfferEnvelopeV1,
  RecoveryControlV1,
} from './types.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const DRAFT_FIELD_SET = new Set<string>(DRAFT_FIELD_NAMES);

function invalid(path: string, message: string): never {
  throw new StorageValidationError(path, message);
}

export class StorageValidationError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'StorageValidationError';
    this.path = path;
  }
}

function record(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid(path, 'must be an object');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(path, 'must not inherit an untrusted prototype');
  if (Object.getOwnPropertySymbols(value).length !== 0) invalid(path, 'symbol keys are not allowed');
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) invalid(`${path}.${key}`, 'unexpected field');
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) invalid(`${path}.${key}`, 'field is required');
  }
  return value as Record<string, unknown>;
}

function integer(value: unknown, path: string, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    invalid(path, `must be a safe integer from ${minimum} through ${maximum}`);
  }
  return value as number;
}

function text(value: unknown, path: string, maximum: number, allowEmpty = false): string {
  if (typeof value !== 'string') invalid(path, 'must be text');
  if ((!allowEmpty && value.trim().length === 0) || value.length > maximum) {
    invalid(path, `must contain ${allowEmpty ? 'at most' : '1 to'} ${maximum} characters`);
  }
  if (CONTROL_CHARACTER_PATTERN.test(value)) invalid(path, 'must not contain control characters');
  return value;
}

export function validateUuid(value: unknown, path: string): string {
  const result = text(value, path, 36);
  if (!UUID_PATTERN.test(result)) invalid(path, 'must be a canonical UUID');
  return result.toLowerCase();
}

export function validateUtc(value: unknown, path: string): string {
  const result = text(value, path, 30);
  const epoch = Date.parse(result);
  if (!UTC_ISO_PATTERN.test(result) || !Number.isFinite(epoch)
    || new Date(epoch).toISOString().slice(0, 19) !== result.slice(0, 19)) {
    invalid(path, 'must be a valid ISO-8601 UTC instant ending in Z');
  }
  return result;
}

export function offerKey(offerId: string): string {
  return `${OFFER_KEY_PREFIX}${validateUuid(offerId, 'offerId')}`;
}

export function offerIdFromKey(key: string): string {
  if (!key.startsWith(OFFER_KEY_PREFIX)) invalid('storageKey', 'must be an offer key');
  return validateUuid(key.slice(OFFER_KEY_PREFIX.length), 'storageKey offer ID');
}

export function migrationStageKey(offerId: string): string {
  return `${MIGRATION_STAGE_KEY_PREFIX}${validateUuid(offerId, 'offerId')}`;
}

export function validateDraft(value: unknown, path = 'draft'): OfferDraft {
  const candidate = record(value, path, ['updatedAt', 'fields']);
  const fieldsValue = candidate.fields;
  if (fieldsValue === null || typeof fieldsValue !== 'object' || Array.isArray(fieldsValue)) {
    invalid(`${path}.fields`, 'must be an object');
  }
  const fieldsPrototype = Object.getPrototypeOf(fieldsValue);
  if (fieldsPrototype !== Object.prototype && fieldsPrototype !== null) {
    invalid(`${path}.fields`, 'must not inherit an untrusted prototype');
  }
  if (Object.getOwnPropertySymbols(fieldsValue).length !== 0) {
    invalid(`${path}.fields`, 'symbol keys are not allowed');
  }
  const entries = Object.entries(fieldsValue);
  if (entries.length > DRAFT_FIELD_NAMES.length) invalid(`${path}.fields`, 'has too many fields');
  const fields: Partial<Record<DraftFieldName, string>> = {};
  for (const [key, raw] of entries) {
    if (!DRAFT_FIELD_SET.has(key) || key === '__proto__' || key === 'prototype' || key === 'constructor') {
      invalid(`${path}.fields.${key}`, 'is not an allowed draft field');
    }
    const maximum = key === 'canonicalUrl' ? 2_048 : 500;
    fields[key as DraftFieldName] = text(raw, `${path}.fields.${key}`, maximum, true);
  }
  return { updatedAt: validateUtc(candidate.updatedAt, `${path}.updatedAt`), fields };
}

export function validateConfirmedOffer(value: unknown, path = 'confirmed'): ConfirmedOffer {
  const candidate = record(value, path, ['product', 'variant', 'retailer', 'seller', 'offer', 'access']);
  try {
    const product = validateProduct(candidate.product, `${path}.product`);
    const variant = validateVariant(candidate.variant, `${path}.variant`);
    const retailer = validateRetailer(candidate.retailer, `${path}.retailer`);
    const seller = validateSeller(candidate.seller, `${path}.seller`);
    const offer = validateOffer(candidate.offer, {}, `${path}.offer`);
    const access = validateAccessRecord(candidate.access, `${path}.access`);
    if (variant.productId !== product.id) invalid(path, 'variant does not reference its product');
    if (seller.retailerId !== retailer.id) invalid(path, 'seller does not reference its retailer');
    if (offer.variantId !== variant.id || offer.retailerId !== retailer.id || offer.sellerId !== seller.id) {
      invalid(path, 'offer references do not match its variant, retailer, and seller');
    }
    if (access.kind !== 'personal_manual') invalid(`${path}.access.kind`, 'saved notebook offers must use personal_manual');
    return { product, variant, retailer, seller, offer, access };
  } catch (error) {
    if (error instanceof ValidationError) invalid(path, error.message);
    throw error;
  }
}

function validateObservationList(value: unknown, access: ConfirmedOffer['access'] | null, offerId: string, path: string): Observation[] {
  if (!Array.isArray(value) || value.length > MAX_OBSERVATIONS) {
    invalid(path, `must be an array with at most ${MAX_OBSERVATIONS} entries`);
  }
  const ids = new Set<string>();
  const operationIds = new Set<string>();
  return value.map((entry, index) => {
    if (access === null) invalid(path, 'draft-only envelopes cannot contain observations');
    try {
      const observation = validateObservationAgainstAccess(entry, access);
      if (observation.offerId !== offerId) invalid(`${path}[${index}].offerId`, 'does not match the envelope');
      if (observation.sourceKind !== 'manual') invalid(`${path}[${index}].sourceKind`, 'saved notebook observations must be manual');
      if (ids.has(observation.id)) invalid(`${path}[${index}].id`, 'duplicates an observation ID');
      if (operationIds.has(observation.operationId)) invalid(`${path}[${index}].operationId`, 'duplicates an operation ID');
      ids.add(observation.id);
      operationIds.add(observation.operationId);
      return observation;
    } catch (error) {
      if (error instanceof ValidationError) invalid(`${path}[${index}]`, error.message);
      throw error;
    }
  });
}

function validateOperationIds(value: unknown, observations: readonly Observation[], path: string): string[] {
  if (!Array.isArray(value) || value.length > 1_000) invalid(path, 'must be an array with at most 1,000 entries');
  const seen = new Set<string>();
  const result = value.map((entry, index) => {
    const id = validateUuid(entry, `${path}[${index}]`);
    if (seen.has(id)) invalid(`${path}[${index}]`, 'duplicates an operation ID');
    seen.add(id);
    return id;
  });
  for (const observation of observations) {
    if (!seen.has(observation.operationId)) invalid(path, 'must include every observation operation ID');
  }
  return result;
}

function validateEnvelopeBody(
  candidate: Record<string, unknown>,
  keyOfferId: string | undefined,
  path: string,
  localPurposeVersion: number,
): Omit<OfferEnvelopeV1, 'schemaVersion'> {
  const offerId = validateUuid(candidate.offerId, `${path}.offerId`);
  if (keyOfferId !== undefined && offerId !== keyOfferId) invalid(`${path}.offerId`, 'does not match its storage key');
  const createdAt = validateUtc(candidate.createdAt, `${path}.createdAt`);
  const updatedAt = validateUtc(candidate.updatedAt, `${path}.updatedAt`);
  if (Date.parse(updatedAt) < Date.parse(createdAt)) invalid(`${path}.updatedAt`, 'cannot be earlier than createdAt');
  const confirmed = candidate.confirmed === null ? null : validateConfirmedOffer(candidate.confirmed, `${path}.confirmed`);
  if (confirmed !== null && confirmed.offer.id !== offerId) invalid(`${path}.confirmed.offer.id`, 'does not match the envelope');
  const draft = candidate.draft === null ? null : validateDraft(candidate.draft, `${path}.draft`);
  const observations = validateObservationList(candidate.observations, confirmed?.access ?? null, offerId, `${path}.observations`);
  if (confirmed === null && observations.length !== 0) invalid(`${path}.observations`, 'draft-only envelopes cannot contain observations');
  if (confirmed !== null && observations.length === 0) invalid(`${path}.observations`, 'a confirmed offer needs at least one observation');
  const operationIds = validateOperationIds(candidate.operationIds, observations, `${path}.operationIds`);
  if (confirmed === null && operationIds.length !== 0) invalid(`${path}.operationIds`, 'draft-only envelopes cannot contain operations');
  if (localPurposeVersion !== LOCAL_PURPOSE_DECLARATION_VERSION) {
    invalid(`${path}.localPurposeVersion`, 'uses an unsupported local-purpose declaration');
  }
  return {
    offerId,
    createdAt,
    updatedAt,
    localPurposeVersion,
    confirmed,
    draft,
    observations,
    operationIds,
  };
}

export function validateEnvelopeV1(value: unknown, keyOfferId?: string, path = 'envelope'): OfferEnvelopeV1 {
  const candidate = record(value, path, [
    'schemaVersion', 'offerId', 'createdAt', 'updatedAt', 'localPurposeVersion',
    'confirmed', 'draft', 'observations', 'operationIds',
  ]);
  if (candidate.schemaVersion !== STORAGE_SCHEMA_VERSION) invalid(`${path}.schemaVersion`, 'is not supported by this validator');
  const localPurposeVersion = integer(candidate.localPurposeVersion, `${path}.localPurposeVersion`, 1, 1);
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    ...validateEnvelopeBody(candidate, keyOfferId, path, localPurposeVersion),
  };
}

export function migrateEnvelopeV0(value: unknown, keyOfferId?: string, path = 'envelope'): OfferEnvelopeV1 {
  const candidate = record(value, path, [
    'schemaVersion', 'offerId', 'createdAt', 'updatedAt', 'confirmed', 'draft', 'observations', 'operationIds',
  ]);
  if (candidate.schemaVersion !== 0) invalid(`${path}.schemaVersion`, 'is not a version 0 envelope');
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    ...validateEnvelopeBody(candidate, keyOfferId, path, LOCAL_PURPOSE_DECLARATION_VERSION),
  };
}

export function storedSchemaVersion(value: unknown): number | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const schemaVersion = (value as Record<string, unknown>).schemaVersion;
  return Number.isSafeInteger(schemaVersion) && (schemaVersion as number) >= 0 ? schemaVersion as number : null;
}

export function validateConsent(value: unknown, path = CONSENT_KEY): ConsentRecordV1 {
  const candidate = record(value, path, ['schemaVersion', 'noticeVersion', 'acceptedAt', 'operationId']);
  if (candidate.schemaVersion !== STORAGE_SCHEMA_VERSION) invalid(`${path}.schemaVersion`, 'is unsupported');
  if (candidate.noticeVersion !== NOTICE_VERSION) invalid(`${path}.noticeVersion`, 'is unsupported');
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    noticeVersion: NOTICE_VERSION,
    acceptedAt: validateUtc(candidate.acceptedAt, `${path}.acceptedAt`),
    operationId: validateUuid(candidate.operationId, `${path}.operationId`),
  };
}

export function validateControl(value: unknown, path = CONTROL_KEY): RecoveryControlV1 {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid(path, 'must be an object');
  const type = (value as Record<string, unknown>).type;
  if (type === 'delete_all') {
    const candidate = record(value, path, ['schemaVersion', 'operationId', 'type', 'phase', 'resetConsent']);
    if (candidate.schemaVersion !== STORAGE_SCHEMA_VERSION || candidate.phase !== 'prepared'
      || typeof candidate.resetConsent !== 'boolean') invalid(path, 'contains an unsupported delete-all control state');
    const result: DeleteAllControlV1 = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      operationId: validateUuid(candidate.operationId, `${path}.operationId`),
      type: 'delete_all',
      phase: 'prepared',
      resetConsent: candidate.resetConsent,
    };
    return result;
  }
  if (type === 'migrate_offer') {
    const candidate = record(value, path, [
      'schemaVersion', 'operationId', 'type', 'phase', 'pendingKey', 'stageKey', 'fromVersion', 'toVersion',
    ]);
    if (candidate.schemaVersion !== STORAGE_SCHEMA_VERSION || candidate.phase !== 'prepared'
      || candidate.fromVersion !== 0 || candidate.toVersion !== STORAGE_SCHEMA_VERSION) {
      invalid(path, 'contains an unsupported migration control state');
    }
    const pendingKey = text(candidate.pendingKey, `${path}.pendingKey`, 80);
    const pendingOfferId = offerIdFromKey(pendingKey);
    const stageKey = text(candidate.stageKey, `${path}.stageKey`, 100);
    if (stageKey !== migrationStageKey(pendingOfferId)) invalid(`${path}.stageKey`, 'does not match the pending offer');
    const result: MigrationControlV1 = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      operationId: validateUuid(candidate.operationId, `${path}.operationId`),
      type: 'migrate_offer',
      phase: 'prepared',
      pendingKey,
      stageKey,
      fromVersion: 0,
      toVersion: STORAGE_SCHEMA_VERSION,
    };
    return result;
  }
  invalid(`${path}.type`, 'is unsupported');
}

function comparableJson(value: unknown): string {
  return JSON.stringify(value);
}

/** New observations must snapshot exactly the confirmed values supplied in the same save. */
export function validateNewObservation(observation: Observation, confirmed: ConfirmedOffer): Observation {
  let validated: Observation;
  try {
    validated = validateObservationAgainstAccess(observation, confirmed.access);
  } catch (error) {
    if (error instanceof ValidationError) invalid('observation', error.message);
    throw error;
  }
  if (validated.sourceKind !== 'manual') invalid('observation.sourceKind', 'saved notebook observations must be manual');
  if (validated.offerId !== confirmed.offer.id) invalid('observation.offerId', 'does not match the confirmed offer');
  const pairs: ReadonlyArray<[unknown, unknown, string]> = [
    [validated.productSnapshot, confirmed.product, 'productSnapshot'],
    [validated.identitySnapshot, confirmed.variant, 'identitySnapshot'],
    [validated.retailerSnapshot, confirmed.retailer, 'retailerSnapshot'],
    [validated.sellerSnapshot, confirmed.seller, 'sellerSnapshot'],
    [validated.offerContextSnapshot, confirmed.offer, 'offerContextSnapshot'],
  ];
  for (const [snapshot, current, field] of pairs) {
    if (comparableJson(snapshot) !== comparableJson(current)) invalid(`observation.${field}`, 'does not match the confirmed value');
  }
  return validated;
}
