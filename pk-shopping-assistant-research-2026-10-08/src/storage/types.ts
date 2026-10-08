import type {
  AccessRecord,
  Observation,
  Offer,
  Product,
  Retailer,
  Seller,
  UtcIso,
  Variant,
} from '../domain/types.js';

export const STORAGE_SCHEMA_VERSION = 1 as const;
export const NOTICE_VERSION = 1 as const;
export const CONSENT_KEY = 'consent:local-notebook';
export const CONTROL_KEY = 'control:recovery';
export const OFFER_KEY_PREFIX = 'offer:';
export const MIGRATION_STAGE_KEY_PREFIX = 'recovery:migration:';

/** Draft fields mirror the popup form controls exactly, so a draft restores without translation. */
export const DRAFT_FIELD_NAMES = [
  'brand',
  'model',
  'mpnMode',
  'mpn',
  'size',
  'handedness',
  'color',
  'region',
  'receiverOrPack',
  'retailer',
  'sellerMode',
  'seller',
  'url',
  'itemPrice',
  'condition',
  'warrantyMode',
  'warrantyProvider',
  'warrantyKind',
  'warrantyMonths',
  'warrantyScope',
  'shippingMode',
  'shippingAmount',
  'taxMode',
  'taxAmount',
  'feesComplete',
  'codFeeMode',
  'codFeeAmount',
  'discountMode',
  'discountAmount',
  'discountConditions',
  'locationScope',
  'paymentContext',
  'eligibility',
  'eligibilityDetails',
  'stock',
] as const;

export type DraftFieldName = typeof DRAFT_FIELD_NAMES[number];
export type DraftFields = Partial<Record<DraftFieldName, string>>;

/** A structurally safe, bounded form draft. Empty strings and partial values are intentional. */
export interface OfferDraft {
  updatedAt: UtcIso;
  fields: DraftFields;
}

export interface ConfirmedOffer {
  product: Product;
  variant: Variant;
  retailer: Retailer;
  seller: Seller;
  offer: Offer;
  access: AccessRecord;
}

export interface OfferEnvelopeV1 {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  offerId: string;
  createdAt: UtcIso;
  updatedAt: UtcIso;
  localPurposeVersion: number;
  confirmed: ConfirmedOffer | null;
  draft: OfferDraft | null;
  observations: Observation[];
  operationIds: string[];
}

export interface ConsentRecordV1 {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  noticeVersion: typeof NOTICE_VERSION;
  acceptedAt: UtcIso;
  operationId: string;
}

export interface DeleteAllControlV1 {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  operationId: string;
  type: 'delete_all';
  phase: 'prepared';
  resetConsent: boolean;
}

export interface MigrationControlV1 {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  operationId: string;
  type: 'migrate_offer';
  phase: 'prepared';
  pendingKey: string;
  stageKey: string;
  fromVersion: 0;
  toVersion: typeof STORAGE_SCHEMA_VERSION;
}

export type RecoveryControlV1 = DeleteAllControlV1 | MigrationControlV1;

export interface RecoveryIssue {
  key: string;
  kind: 'invalid_record' | 'unsupported_schema' | 'migration_failed' | 'control_failure';
  message: string;
}

export interface InitializationResult {
  state: 'ready' | 'recovery_read_only';
  issues: RecoveryIssue[];
  resumedOperation: 'delete_all' | 'migration' | null;
}

export interface StorageCapacity {
  offerCount: number;
  observationCount: number;
  ordinaryBytes: number;
  controlBytes: number;
  totalBytes: number;
  warning: boolean;
  ordinaryBytesRemaining: number;
  hardBytesRemaining: number;
}

export interface SaveOfferInput {
  confirmed: ConfirmedOffer;
  draft: OfferDraft | null;
  observation: Observation | null;
  operationId: string;
}

export interface SaveResult {
  envelope: OfferEnvelopeV1;
  capacity: StorageCapacity;
  duplicate: boolean;
}

export interface NotebookExportV1 {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  exportedAt: UtcIso;
  notice: ConsentRecordV1 | null;
  offers: OfferEnvelopeV1[];
  quarantined: Array<{ key: string; value: unknown; issue: RecoveryIssue }>;
}

export interface StorageArea {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  getBytesInUse(keys?: string | string[] | null): Promise<number>;
  restrictToTrustedContexts?(): Promise<void>;
}

export type StorageErrorCode =
  | 'not_initialized'
  | 'consent_required'
  | 'recovery_read_only'
  | 'invalid_record'
  | 'invalid_draft'
  | 'not_found'
  | 'draft_conflict'
  | 'offer_limit'
  | 'observation_limit'
  | 'storage_limit'
  | 'control_reserve'
  | 'write_failed'
  | 'delete_failed'
  | 'migration_failed';

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly details: readonly string[];

  constructor(code: StorageErrorCode, message: string, details: readonly string[] = []) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.details = details;
  }
}
