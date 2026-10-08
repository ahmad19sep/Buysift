# Data and API contracts

**Status: DRAFT SPECIFICATION with a subsequent local-domain implementation.** Stage 02 implemented and tested the P0 types, validation, comparison, price, history, provenance and limit rules described here; persistence/UI and every HTTP endpoint remain unimplemented. See the [domain report](research/test-results/2026-10-08-domain-and-fixtures.md). P0 is local only; every HTTP endpoint below is **conditional P2**. Do not scaffold a server from this document before the access and product gates pass. Sources for platform/access constraints: [D01–D09], [T01–T04], [T16–T18] in [sources](research/sources.md). Domain rules are proposed project decisions.

## Entity boundaries

| Entity | Identity / responsibility | P0 versus later |
| --- | --- | --- |
| Product | Brand and model family, independent of retailer | Local explicit record; no global catalog claim |
| Variant | Intrinsic model/MPN, size, handedness, color, pack/receiver, region | User-entered evidence in P0; reviewed global identity later |
| Retailer | Selling platform/domain | A label and safe link in P0; approved source registry later |
| Seller | Merchant supplying this specific offer | Separate from marketplace; unknown is permitted but blocks definitive comparison |
| Offer | Retailer listing + seller + selected variant + condition + warranty + public/conditional eligibility context | Never identified by title alone |
| Observation | A dated, provenance-linked set of offer facts | Immutable local entry; licensed source observation later |
| Watch | Private desired condition/target for an offer/variant | Deferred; P0 shortlist does not require this entity |
| NotificationEvent | Idempotent attempted/delivered/suppressed notice | Deferred; no notification persistence or permission in P0 |
| AccessRecord | Rights holder, method, scope, expiry, retention, republication and evidence | Manual/synthetic purpose in P0; a real grant is required for each automated method |

Condition and warranty belong to an offer context, not a manufacturer's global product identity. A seller-warranty offer and a manufacturer-warranty offer may reference the same variant, yet fail the comparison-equivalence policy. A retailer's local SKU is never promoted to a manufacturer identifier without evidence.

## Draft TypeScript contracts

These are illustrative shared domain shapes. Runtime validation is required at every boundary; TypeScript types do not validate page messages, imported feeds or stored JSON.

```ts
type Id = string; // UUID locally; opaque canonical ID in licensed catalog
type UtcIso = string; // validated ISO-8601 UTC, never locale text
type Currency = 'PKR'; // deliberately closed for the initial release
type Evidence<T> =
  | { state: 'known'; value: T; basis: string; sourceRef: string }
  | { state: 'unknown'; reason: string };
type Money = { amountMinor: number; currency: Currency; minorUnit: 2 };
type Stock = 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown';
type SourceKind = 'synthetic' | 'manual' | 'licensed_page' | 'merchant_feed';

interface Product {
  id: Id; category: 'wireless_mouse'; brand: string; modelFamily: string;
}
interface Variant {
  id: Id; productId: Id; model: string;
  mpn: Evidence<string>; gtin: Evidence<string>;
  size: Evidence<'small_medium' | 'large'>;
  handedness: Evidence<'right' | 'left' | 'ambidextrous'>;
  color: Evidence<string>; region: Evidence<string>;
  receiverOrPack: Evidence<string>;
  identityStatus: 'user_entered' | 'reviewed_exact' | 'ambiguous';
  identityRevision: number;
}
interface Retailer { id: Id; label: string; canonicalHost: string | null }
interface Seller {
  id: Id; retailerId: Id; label: Evidence<string>;
  retailerSellerId: string | null;
}
interface Offer {
  id: Id; retailerId: Id; sellerId: Id; variantId: Id;
  retailerListingId: string | null; retailerSku: string | null;
  selectedOptionIds: Record<string, string>;
  canonicalUrl: string; condition: Evidence<'new' | 'refurbished' | 'used'>;
  warranty: Evidence<{ provider: string; kind: 'manufacturer' | 'seller'; months: number;
    scope: Evidence<string>; termsRef: string | null }>;
  eligibility: 'public' | 'conditional' | 'personalized' | 'unknown';
  eligibilityDetails: string[]; contextRevision: number;
}
interface PriceComponents {
  item: Money; // advertised payable item amount, markdown already included
  shipping: Evidence<Money>;
  tax: Evidence<{ includedInItem: boolean; additional: Money }>;
  mandatoryFees: Evidence<{ items: Array<{ kind: 'cod' | 'payment' | 'handling' | 'other';
    label: string; amount: Money }>; complete: boolean }>;
  additionalDiscount: Evidence<{ amount: Money; alreadyIncluded: false; conditions: string[] }>;
  locationScope: Evidence<string>; // city/zone, no street address
  paymentContext: Evidence<'standard' | 'cod' | 'specified_card'>;
}
interface Observation {
  id: Id; operationId: Id; offerId: Id;
  variantRevision: number; offerContextRevision: number;
  productSnapshot: Product; // immutable brand and family, not just productId
  identitySnapshot: Variant; // immutable bounded clone in P0
  retailerSnapshot: Retailer;
  sellerSnapshot: Seller; // label and seller evidence as recorded then
  offerContextSnapshot: Offer; // immutable confirmed terms, never a draft reference
  sourceKind: SourceKind; accessRecordId: Id;
  observedAt: UtcIso; receivedAt: UtcIso; checkedAt: UtcIso | null;
  sourceGeneratedAt: UtcIso | null;
  timeBasis: 'manual_entry' | 'source_timestamp' | 'permitted_page_read';
  sourceRevision: string | null; parserVersion: string | null;
  price: PriceComponents; stock: Stock;
  status: 'accepted' | 'quarantined' | 'corrected' | 'withdrawn';
  replacesObservationId: Id | null;
}
interface Watch { // deferred; never publish private intent in a public fact table
  id: Id; variantId: Id; offerId: Id | null;
  target: Money; basis: 'item' | 'delivered'; createdAt: UtcIso;
  channel: 'local_recheck'; enabled: boolean;
}
interface NotificationEvent { // deferred
  id: Id; watchId: Id; observationId: Id; ruleVersion: string;
  state: 'pending' | 'shown' | 'suppressed' | 'failed';
  createdAt: UtcIso; shownAt: UtcIso | null;
}
interface AccessRecord {
  id: Id; rightsHolder: string; evidenceRef: string;
  kind: 'synthetic_owned' | 'personal_manual' | 'written_grant';
  sourceHosts: string[]; merchantIds: Id[]; fields: string[];
  methods: Array<'manual' | 'visible_page' | 'merchant_feed' | 'scheduled_fetch'>;
  allowedUses: Array<'personal_local_display' | 'personal_local_comparison' | 'personal_export' | 'public_current_display' |
    'public_history' | 'comparison' | 'derived_statistics' | 'public_api' | 'alerts'>;
  approvedPathsOrEndpoints: string[]; approvedSkus: string[];
  historyRetentionDays: number | null;
  cacheSeconds: number | null; attribution: string | null;
  effectiveAt: UtcIso | null; expiresAt: UtcIso | null;
  revokedAt: UtcIso | null; costTermsRef: string | null;
  state: 'not_applicable' | 'pending' | 'active' | 'expired' | 'revoked';
}
```

For `written_grant`, empty or missing `allowedUses`, paths/endpoints, fields or SKU scope means unapproved, not unrestricted. Any intentionally whole-catalog scope must be an explicit structured grant, not an implicit empty list. Current display, public history, derived statistics, public comparison, personal export, public API and alert use are separate checks. Private contracts are retained privately; public provenance exposes only the permitted attribution and evidence summary.

P0 `personal_manual` and `synthetic_owned` records instead use a fixed, versioned local-purpose declaration with `state: not_applicable`, `methods: [manual]` and only `personal_local_display`, `personal_local_comparison` and `personal_export` uses. Merchant path/SKU/field scope gates do not apply to these declarations; empty merchant scopes and unknown identifiers are permitted. They describe private handling or owned synthetic examples, never merchant permission. They cannot authorize a reader, feed, public catalog, public `comparison`, backend or alerts. Store the declaration version with the envelope/export; do not invent retailer grants to save an incomplete manual entry.

Handset-specific capacity/PTA fields are not required or displayed in this release. A future category migration must add explicit evidence fields, not overload mouse properties or infer regulatory approval from titles. Unknown MPN/GTIN stays unknown; P0 may save an incomplete entry but cannot claim public exact identity.

The comparison UI and benchmark consume a small explicit result: `identity` and `coreTerms` each have `same | different | insufficient_evidence`; `priceBasis` is `item | delivered`; `rankingEligible` is a boolean; `provisional` marks manual evidence; `reasons` lists field-specific causes. The three-class benchmark evaluates same intrinsic variant **and equivalent core terms** (condition, warranty and eligibility), separately from stock and delivered-price eligibility. Unknown shipping can preserve identity while blocking delivered ranking.

## Value and timestamp validation

Money uses safe, nonnegative integer minor units; item price must be positive. P0 proposed maximum is 100,000,000 minor units per component, far above the intended category but below unsafe arithmetic. Validate summed results with safe-integer checks. PKR formatting uses two decimal places internally and locale-aware display; never parse by indiscriminately stripping punctuation. Reject excess decimal digits, mixed-currency sums, scientific notation from forms, `NaN`, negative components and overflow. The item amount already includes the displayed markdown: PKR 7,000 reduced from PKR 8,000 stays PKR 7,000, not PKR 6,000. Apply only a separately evidenced additional unconditional discount not already included; none is explicit known zero. Unknown or card-dependent discounts are not subtracted from a public total. Additional discount cannot exceed its eligible subtotal. `includedInItem=true` requires additional tax zero. Mandatory fees must be a complete evidenced list, even when empty; a known COD fee with unknown handling remains incomplete. Explicit free shipping is zero with evidence; absence is unknown.

Cap display strings at 180 characters, model/MPN at 100, source references at 200 and product URLs at 2,048. Reject credentials in URLs, non-HTTPS schemes, local/private hosts and account/checkout paths. P0 does not fetch any entered URL. Remove fragments and personal query parameters; preserve identity parameters only through a documented allowlist for that merchant. If removal would lose selected-variant identity, request a safe link or record the variant separately rather than guessing.

Store timestamps in UTC; display in the user's chosen locale, initially Asia/Karachi for study materials. The active window is rolling `[now − 90×24h, now]`, inclusive; daily samples group eligible points by Asia/Karachi calendar date. Inject the clock in tests. Any future timestamp is excluded until valid; more than five minutes ahead additionally triggers a clock/error state. Never silently clamp it to now. `receivedAt` cannot refresh an old source snapshot. A repeated feed revision with no new independently timestamped validity assertion is only a heartbeat. A documented current validity assertion is separate evidence, not a renamed retrieval time.

## Local persistence, migrations and control

P0 persists `offer:{id}` envelopes, each containing its schema version, last confirmed Product/Variant/Retailer/Seller/Offer records, the versioned local-purpose declaration, a separate editable draft, immutable observation snapshots and operation IDs. Each accepted observation includes bounded copies of Product, Variant, Retailer, Seller and Offer, preserving the original brand, retailer label, seller evidence and terms. Validate their internal ID references together. Product/retailer/seller views are derived from these complete envelopes; there is no separate mutable identity table needed locally. Draft edits cannot alter accepted history, including brand or seller labels. Restrict storage access to trusted extension contexts [T02]. Serialize writes in the popup and limit founder editing to one window; no background writer or cross-key transaction is claimed.

An ordinary Save replaces one validated envelope only, after computing the complete candidate and post-write caps. A new observation carries its persisted operation ID so retries return the existing result. Do not acknowledge before the storage promise resolves. Reopen validates stored envelopes; invalid data is quarantined with export/recovery, not silently cleared. This is an API-level acknowledged-write contract, not hardware-crash durability.

For delete-all, persist a bounded control record `{operationId, type: delete_all, phase: prepared}` before deleting envelopes. On reopening, complete that authorized cleanup before accepting new writes; remove the control record only after no targeted envelopes remain. Individual-offer deletion needs only its key. Migration proceeds one envelope at a time with an explicit staged version and a control record identifying the pending key; validate before replacement and resume the pending step after interruption. Actual behavior at each boundary must be tested before accepting the slice; it is not implemented here.

Limits: 25 offers, 500 observations, three compared at once, 4 MiB soft warning, 5 MiB total application ceiling. Reserve 128 KiB within that ceiling for bounded control/recovery records; ordinary data growth must leave it available. A migration also needs enough temporary staging space for the selected envelope, or it stops before changing active data. Compute counts from authoritative records and enforce the candidate mutation: at 25 offers an observation on an existing offer is allowed if the observation/byte limits permit; a 26th offer is rejected. Reads, export and cleanup stay available. Corrections that add audit rows consume capacity. The active analysis window is 90 days; older observations remain until user deletion and count toward limits. No silent eviction.

Schema migrations are additive where possible. Validate a migrated copy, preserve the prior version until the new state is confirmed and avoid doubling data past the hard ceiling. If adequate headroom is absent, require export/cleanup before migration. An unsupported newer version opens a read-only recovery state. Export is explicit versioned JSON; P0 has no import endpoint or import UI. Delete-all covers shopping records and drafts, with consent/preferences reset according to the disclosed choice. No cloud copy is implied.

## Corrections, matching and source lineage

Do not overwrite accepted observations when their meaning changes. A correction links to the superseded observation; active calculations exclude withdrawn/corrected records but preserve an audit trail within allowed retention. Model merge/split operations keep old IDs, mapping revisions, reason, reviewer and time. A correction to “M650” versus “M650 L” splits the series before recalculating history.

Client observations are not accepted into the public catalog. There is no upload endpoint in the specified phases. If later justified, a new review must add quarantine, independent corroboration, anti-abuse, per-source authorization and deletion design; user consent alone does not supply catalog rights.

## Conditional server schema

The optional P2 service stores only redistributable licensed facts. Canonical identity tables, retailer/seller rows and AccessRecords are separate from private local shopping intent. No user/account/watch tables are required. The following **schema excerpt is a review draft**, not a migration to run:

```sql
CREATE TABLE variants (
  variant_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  identity_revision INTEGER NOT NULL,
  identity_json TEXT NOT NULL
);
CREATE TABLE access_records (
  access_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  expires_at_ms INTEGER,
  rules_json TEXT NOT NULL
);
CREATE TABLE offers (
  offer_id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES variants(variant_id),
  seller_id TEXT NOT NULL,
  access_id TEXT NOT NULL REFERENCES access_records(access_id),
  context_revision INTEGER NOT NULL,
  current_json TEXT NOT NULL,
  observed_at_ms INTEGER,
  checked_at_ms INTEGER
);
CREATE INDEX offers_variant ON offers(variant_id, offer_id);
CREATE TABLE observations (
  row_id INTEGER PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES offers(offer_id),
  collection_slot_utc INTEGER NOT NULL,
  observed_at_ms INTEGER NOT NULL,
  received_at_ms INTEGER NOT NULL,
  source_revision TEXT,
  access_id TEXT NOT NULL REFERENCES access_records(access_id),
  status TEXT NOT NULL,
  fact_json TEXT NOT NULL,
  UNIQUE (offer_id, collection_slot_utc)
);
CREATE INDEX observations_retention ON observations(observed_at_ms);
```

Seller/retailer/product metadata and correction/merge audit schemas must be finalized only if this phase is unlocked. Use foreign keys and checked enum/value constraints in the actual migration; do not mistake this excerpt for a complete hardened schema. The reference cost model assumes one offer update plus one observation-table insert and two index entries per accepted slot. The integer primary key avoids an additional text-primary-key index for this table; schema changes require recalculation.

Each source has at most two proposed collection slots/day for modeling. `(offer_id, collection_slot_utc)` identifies an immutable base observation. A genuine later same-slot revision/correction appends to a separate revision-audit structure referencing that base; it never overwrites the original price or context. The effective view resolves supersession explicitly and invalidates affected summaries. The actual gated schema must define immutable identity/offer-context revisions, correction indexes, and an atomic D1 batch or recoverable operation spanning the observation and current-offer update. Those extra bytes/writes require measurement; the 10% cost reserve is only an assumption. If within-slot changes are frequent, change the observation identity/cadence and recost before ingestion, rather than discard facts to fit quotas.

Enforce active rights, allowed use, method/path/SKU and licensed fields before persistence and again before response. Missing history/derivative/public-API permission remains blocked; a current-display grant does not imply those uses. Licensed retention is the shorter of an explicitly granted duration and the proposed 90-day server window; null is not permission for 90 days. Server expiration is disclosed/contractual, unlike P0 cleanup. Purge expired facts in bounded batches; deletions and index work consume budget. Backups inherit the same rights and deletion limits. Restores reapply revocations/tombstones before serving.

## Conditional read-only HTTP API

Canonical IDs originate in the reviewed permitted source mapping or a small published permitted catalog. They are not inferred from arbitrary URLs. No unrestricted URL resolver, proxy, write endpoint, identity endpoint or cloud-watch endpoint is proposed.

| Contract | `GET /v1/variants/{variantId}/offers` | `GET /v1/offers/{offerId}/observations` |
| --- | --- | --- |
| Purpose | Approved comparable offer candidates for one exact identity | Evidence rows for one offer/context |
| Authorization | Public licensed facts only; active access grant required for every result | Same; omit private/manual/quarantined data |
| Input | ID matching `[A-Za-z0-9_-]{1,80}`; `limit` default 10/max 20; optional cursor | Same ID; required variant/context revisions and price basis; UTC `from`/`to`, max 90 days; `limit` default 30/max 200; cursor |
| Pagination | `offer_id` keyset bound to catalog revision; changed revision requires restart | `(collection_slot_utc,row_id)` keyset bound to cutoff, context, filters and correction revision; no offset scans |
| Quotas | Proposed 30 requests/minute/network abuse bucket plus global budget circuit breaker | Same; cap history response bytes and row scan estimate |
| Cache | Minimum of 15 minutes, granted cache duration and expiry/removal deadline; missing grant means no cache | Same, with context/price basis in key; error responses no-store; revocation checked before body or 304 |
| Errors | 400 invalid input/cursor, 404 no eligible ID, 409 cursor revision changed, 410 withdrawn source, 429 limit, 503 outage/budget gate | Same, plus 400 invalid/excess range; a valid empty history is 200 with no observations |

Reject duplicate/unknown query parameters, malformed UTC intervals and reversed ranges. Cursors are opaque, authenticated tokens, maximum 1,024 encoded bytes and 512 decoded bytes, bound to endpoint/ID/filter/context/revision/cutoff; never accept arbitrary SQL fragments. Use parameterized SQL. Changed catalog/correction revisions return `409 CURSOR_STALE` and instruct a restart; no historic snapshot reconstruction is promised. Revocation overrides any old cutoff. Proposed response caps are 64 KiB and measured 400 scanned rows per offers call, 256 KiB and measured 1,000 scanned rows per history call. These acceptance ceilings require query-plan/profile proof; the cost model's typical combined 400-row workflow is a separate assumption.

The exact rate limiter and global budget circuit mechanism must be chosen and costed before the backend gate opens. A network bucket is not authentication and may group users behind NAT. Do not retain raw IPs in product analytics. Proposed ephemeral security-bucket retention is at most 24 hours, subject to privacy review; no unmodeled per-request D1 counter is assumed. CORS, an extension ID and a bundled key are not proof of identity. Operator ingestion uses an authenticated, least-privilege task with server-side secrets; no public ingest API is exposed.

The normative success contract includes complete **licensed public projections** of Variant, Offer and latest Observation, with all price-component keys present as values or structured unknowns. It must include immutable identity/context revisions, condition, warranty scope/terms evidence, seller, eligibility, location/payment basis, stock, source observation/check time, safe source URL/attribution and `displayValidUntil`. Never expose private agreements or user's notes. Missing rights or fields cannot acquire permissive defaults. The abbreviated JSON below illustrates one incomplete candidate; it is not a schema omitting the required projections.

Illustrative successful response (synthetic IDs/values):

```json
{
  "schemaVersion": 1,
  "catalogRevision": "demo-r1",
  "variantId": "demo-mouse-a-small-graphite",
  "items": [{
    "offerId": "demo-offer-a",
    "sellerId": "demo-seller-a",
    "itemPrice": {"amountMinor":700000,"currency":"PKR","minorUnit":2},
    "shipping": {"state":"unknown","reason":"Not supplied by source"},
    "variantRevision":1,
    "offerContextRevision":1,
    "condition":{"state":"unknown","reason":"Not supplied by source"},
    "warranty":{"state":"unknown","reason":"Scope not supplied"},
    "eligibility":"unknown",
    "priceBasis":"item",
    "tax":{"state":"unknown","reason":"Not supplied by source"},
    "mandatoryFees":{"state":"unknown","reason":"Complete fee set not supplied"},
    "additionalDiscount":{"state":"unknown","reason":"No separate discount established"},
    "locationScope":{"state":"unknown","reason":"No applicable zone established"},
    "paymentContext":{"state":"unknown","reason":"Not supplied by source"},
    "stock":"unknown",
    "observedAt":"2026-10-08T06:00:00Z",
    "checkedAt":"2026-10-08T06:05:00Z",
    "sourceKind":"merchant_feed",
    "accessRecordId":"demo-access-a",
    "freshness":"unknown",
    "equivalence":"insufficient_evidence"
  }],
  "nextCursor":null,
  "generatedAt":"2026-10-08T06:06:00Z"
}
```

The observations endpoint selects one `variantRevision`, `offerContextRevision` and `priceBasis`; delivered-basis requests additionally bind the location/payment context. Return accepted effective facts only, never silently combine different series. Its rows carry the complete licensed price/context/provenance basis described above, plus `coverage` with first/last observation and gaps, a correction revision, snapshot cutoff and `nextCursor`. Empty valid history example (synthetic IDs):

```json
{"schemaVersion":1,"offerId":"demo-offer-a","variantRevision":1,
 "offerContextRevision":1,"priceBasis":"item","correctionRevision":"demo-c0",
 "snapshotCutoff":"2026-10-08T06:06:00Z","items":[],
 "coverage":{"firstObservedAt":null,"lastObservedAt":null,"rawCount":0,"dailyCount":0,"gaps":[]},
 "nextCursor":null}
```

Example error:

```json
{"error":{"code":"BUDGET_PAUSED","message":"Updates are paused.","retryable":true},"requestId":"demo-request-1"}
```

Use structured codes `INVALID_ARGUMENT`, `NOT_FOUND`, `CURSOR_STALE`, `SOURCE_WITHDRAWN`, `RATE_LIMITED`, `BUDGET_PAUSED`, `SOURCE_UNAVAILABLE`. Set `Retry-After` only when known. Public errors contain no retailer credentials, raw upstream bodies or personal URLs. Private logs use request IDs and redacted operational facts.

The client displays source observation time independently of response generation time. A 200 or 304 response does not mean the retailer was just checked. If revocation requires immediate removal, a cache policy that cannot meet that requirement is ineligible; shorten/disable caching instead of promising impossible offline revocation.

## Unresolved before implementation

Exact tested tool versions; real merchant field/license contracts; persistent write recovery under popup teardown; public at-rest protection/key management; production schema constraints; actual row bytes and D1 write counts; rate-limiter/privacy implementation; feed generation guarantees. The [backlog](13-build-backlog.md) keeps these gates explicit. There are **zero implemented endpoints** in this pack.
