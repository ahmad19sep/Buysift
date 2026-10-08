/** Canonical domain contracts for the local wireless-mouse notebook. */

export type Id = string;
export type UtcIso = string;
export type Currency = "PKR";

export type Evidence<T> =
  | { state: "known"; value: T; basis: string; sourceRef: string }
  | { state: "unknown"; reason: string };

export interface Money {
  amountMinor: number;
  currency: Currency;
  minorUnit: 2;
}

export type Stock = "in_stock" | "out_of_stock" | "preorder" | "unknown";
export type SourceKind = "synthetic" | "manual" | "licensed_page" | "merchant_feed";
export type MouseSize = "small_medium" | "large";
export type Handedness = "right" | "left" | "ambidextrous";
export type IdentityStatus = "user_entered" | "reviewed_exact" | "ambiguous";
export type Condition = "new" | "refurbished" | "used";
export type WarrantyKind = "manufacturer" | "seller";
export type Eligibility = "public" | "conditional" | "personalized" | "unknown";
export type FeeKind = "cod" | "payment" | "handling" | "other";
export type PaymentContext = "standard" | "cod" | "specified_card";
export type TimeBasis = "manual_entry" | "source_timestamp" | "permitted_page_read";
export type ObservationStatus = "accepted" | "quarantined" | "corrected" | "withdrawn";

export interface Product {
  id: Id;
  category: "wireless_mouse";
  brand: string;
  modelFamily: string;
}

export interface Variant {
  id: Id;
  productId: Id;
  model: string;
  mpn: Evidence<string>;
  gtin: Evidence<string>;
  size: Evidence<MouseSize>;
  handedness: Evidence<Handedness>;
  color: Evidence<string>;
  region: Evidence<string>;
  receiverOrPack: Evidence<string>;
  identityStatus: IdentityStatus;
  identityRevision: number;
}

export interface Retailer {
  id: Id;
  label: string;
  canonicalHost: string | null;
}

export interface Seller {
  id: Id;
  retailerId: Id;
  label: Evidence<string>;
  retailerSellerId: string | null;
}

export interface Warranty {
  provider: string;
  kind: WarrantyKind;
  months: number;
  scope: Evidence<string>;
  termsRef: string | null;
}

export interface Offer {
  id: Id;
  retailerId: Id;
  sellerId: Id;
  variantId: Id;
  retailerListingId: string | null;
  retailerSku: string | null;
  selectedOptionIds: Record<string, string>;
  canonicalUrl: string;
  condition: Evidence<Condition>;
  warranty: Evidence<Warranty>;
  eligibility: Eligibility;
  eligibilityDetails: string[];
  contextRevision: number;
}

export interface TaxComponents {
  includedInItem: boolean;
  additional: Money;
}

export interface MandatoryFee {
  kind: FeeKind;
  label: string;
  amount: Money;
}

export interface MandatoryFees {
  items: MandatoryFee[];
  complete: boolean;
}

export interface AdditionalDiscount {
  amount: Money;
  alreadyIncluded: false;
  conditions: string[];
}

export interface PriceComponents {
  item: Money;
  shipping: Evidence<Money>;
  tax: Evidence<TaxComponents>;
  mandatoryFees: Evidence<MandatoryFees>;
  additionalDiscount: Evidence<AdditionalDiscount>;
  locationScope: Evidence<string>;
  paymentContext: Evidence<PaymentContext>;
}

export interface Observation {
  id: Id;
  operationId: Id;
  offerId: Id;
  variantRevision: number;
  offerContextRevision: number;
  productSnapshot: Product;
  identitySnapshot: Variant;
  retailerSnapshot: Retailer;
  sellerSnapshot: Seller;
  offerContextSnapshot: Offer;
  sourceKind: SourceKind;
  accessRecordId: Id;
  observedAt: UtcIso;
  receivedAt: UtcIso;
  checkedAt: UtcIso | null;
  sourceGeneratedAt: UtcIso | null;
  timeBasis: TimeBasis;
  sourceRevision: string | null;
  parserVersion: string | null;
  price: PriceComponents;
  stock: Stock;
  status: ObservationStatus;
  replacesObservationId: Id | null;
}

export type AccessKind = "synthetic_owned" | "personal_manual" | "written_grant";
export type AccessMethod = "manual" | "visible_page" | "merchant_feed" | "scheduled_fetch";
export type AllowedUse =
  | "personal_local_display"
  | "personal_local_comparison"
  | "personal_export"
  | "public_current_display"
  | "public_history"
  | "comparison"
  | "derived_statistics"
  | "public_api"
  | "alerts";
export type AccessState = "not_applicable" | "pending" | "active" | "expired" | "revoked";

export interface AccessRecord {
  id: Id;
  rightsHolder: string;
  evidenceRef: string;
  kind: AccessKind;
  sourceHosts: string[];
  merchantIds: Id[];
  fields: string[];
  methods: AccessMethod[];
  allowedUses: AllowedUse[];
  approvedPathsOrEndpoints: string[];
  approvedSkus: string[];
  historyRetentionDays: number | null;
  cacheSeconds: number | null;
  attribution: string | null;
  effectiveAt: UtcIso | null;
  expiresAt: UtcIso | null;
  revokedAt: UtcIso | null;
  costTermsRef: string | null;
  state: AccessState;
}
