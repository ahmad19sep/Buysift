# Product requirements

**Status: PROPOSED specification. Research only, 8 October 2026.** Evidence: [M31], [D01–D09], [T02–T04], [T10–T13], [T40] in the [source register](research/sources.md). Design rules below are project decisions; acceptance criteria have not been executed.

## Purpose and primary user

A shopper comparing a new branded wireless mouse on a personal desktop/laptop should be able to answer: **“Are these the same mouse, what would I pay under the same conditions, and what evidence supports that answer?”**

The first surface is one Chrome action popup. The private P0 deliberately tests the structured comparison job using manual facts and synthetic examples. It does not validate the convenience of an automated reader. A successful P0 justifies only the next gated experiment, not a public-market claim.

Activation means completing a useful and accurate comparison or identifying a material unknown that changes the decision. Opening the popup or saving a row alone is not activation.

## Release boundaries

| Capability | P0 private founder slice | P1 permission-backed pilot | P2 public MVP / later |
| --- | --- | --- | --- |
| Offer capture | Manual form and labeled synthetic examples | Eligible bundled reader; founder-reviewed permitted merchant material for research/manual entry | Only cleared sources with measured coverage; hosted service conditional |
| Product identity | User-entered fields; confirmation is provisional | Evidence-backed exact identifiers; abstain on ambiguity | Reviewed mappings and corrections |
| Cost explanation | Components entered by user; unknown remains unknown | Licensed public components and conditions | Location-scoped delivered total where actually available |
| Comparison | Up to three manually confirmed equivalent offers, clearly qualified | Only independently eligible sources | Cross-store feature requires two independently eligible merchant/source integrations with overlap |
| History | Personal saved observations; no backfill | Accumulated licensed observations | Evidence counts, periods and gaps; no predictions |
| Shortlist | Up to 25 offers saved locally | Same unless evidence justifies a limit change | No account requirement by default |
| Alerts | None | Explicit recheck result only if eligible data exists | Background/browser-closed channels require separate release gate |
| Server / telemetry | None | None; no hosted ingestion or customer file import | Optional licensed-fact service only if necessary; minimum measured operations |

P0 permission set is `storage`. Local entries must not be repurposed into a public dataset. A method permitted for one merchant is not permission for another. No adapter or backend is enabled merely because its specification exists.

## P0 feature specifications

### F01 — Start with an honest explanation

**Story:** As a first-time user, I want to know what this prototype does with my information before entering anything. **Purpose:** test informed trust rather than obtain accidental permission.

**Inputs/dependencies:** bundled introduction, draft privacy notice, locally stored notice version and acceptance. No website access.

**Happy path:** the popup explains manual entry, device-local storage, lack of automatic checks and deletion/export controls. The user explicitly chooses to start. “Try an example” opens a clearly labeled synthetic case; it never becomes real history.

**Failure states:** user declines; notice storage fails; data practices changed since last accepted version.

**Acceptance:** no offer persists before acceptance; decline leaves no shopping data; failed consent write is not shown as saved; a material notice change blocks new collection until the revised explanation is acknowledged. Public pre-install disclosure remains a separate release gate in [security](08-security-privacy-policy.md).

### F02 — Record one offer without pretending to inspect the page

**Story:** As a shopper, I can record an offer with enough detail to compare it later. **Purpose:** discover which identity/price fields matter before implementing a reader.

**Inputs:** retailer and seller; HTTPS product link without personal query parameters; brand/model; manufacturer part number when known; mouse size/handedness/color/region/receiver; condition; warranty type/provider/duration; item price in PKR; component/stock/eligibility evidence. Unknown values are explicit choices, not false defaults.

**Happy path:** user fills required minimum fields, reviews the parsed amount and presses Save. The UI acknowledges a completed storage write. A valid incomplete offer may be saved as “Needs details”; it cannot silently acquire exact-match status.

**Failures:** malformed URL, payment/account URL, unsupported currency, negative/overflowing price, missing model, ambiguous number formatting, quota limit, storage write failure, popup closing before acknowledgement.

**Acceptance:** `Rs 7,000` becomes 700000 minor units; item price must be greater than zero; `7,000.005` is rejected; shipping can be zero only after explicit “Free”; required labels and inline errors identify the field; 25 saved offers or the byte cap prevents a new save with recovery actions. The app never reads clipboard or current tabs silently.

### F03 — Explain the price components

**Story:** As a shopper, I can distinguish item price from a complete delivered total. **Purpose:** avoid comparing a known cost against an incomplete lower amount.

**Inputs:** the selected offer's payable item price (already including its displayed markdown), tax inclusion, shipping, all required COD/payment/handling charges, any separately evidenced additional discount not already included, and a coarse location scope selected by the user. No street address. A complete fee set must be explicitly established; knowing one fee is zero does not establish that all fees are zero.

**Happy path:** show item price first, then known additions. Show a delivered total only if every required component and condition is established for the same location and payment context. Otherwise show the known subtotal with the missing components named.

**Failures:** no location, unclear tax inclusion, unverified coupon/card condition, inconsistent currency, out-of-stock offer, stale manual entry.

**Acceptance:** unknown shipping never evaluates to zero; the UI says “PKR 7,000 + delivery not entered,” not “Total PKR 7,000.” A monthly installment is not treated as the outright purchase price. Conditional discounts are separate from a generally available price. Arithmetic and eligibility rules are in [price integrity](07-price-integrity.md).

### F04 — Compare a small, explicit set

**Story:** As a shopper, I can inspect up to three offers for the same intended variant and see why comparison is incomplete. **Purpose:** test confidence and time saved rather than catalog breadth.

**Inputs:** saved offers, user-confirmed variant selection, source labels, comparable price basis and known conditions.

**Happy path:** the shopper selects two or three offers. Identity fields appear before ranking. Known mismatches are separated, missing evidence prompts clarification, and complete same-context prices can be ordered numerically. A P0 result always says it is based on the user's entries.

**Failures:** M650 versus M650 L; different color/pack where shopper has not opted into substitutability; new versus refurbished; unknown seller; manufacturer versus seller warranty; unavailable stock; one unknown delivery charge; changed variant since saved observation.

**Acceptance:** a critical model/size/handedness/condition mismatch can never be overridden into an automatic exact match. Unknown manufacturer part number may use an explicit reviewed evidence path in P1; it never becomes an invented identifier. In P0, user confirmation produces only a provisional comparison. Unknown or out-of-stock entries receive no “cheapest equivalent available” label. A user may inspect different products side by side only under “Different options,” with no claimed savings between them.

### F05 — Keep personal evidence across visits

**Story:** As a shopper, I can save what I saw and see when I last entered it. **Purpose:** test whether preserving evidence improves an occasional shopping task.

**Inputs:** successful Save action, immutable observation ID, UTC time, entered fields, source kind `manual` or `synthetic`.

**Happy path:** the offer screen shows the first saved date, last recorded time, raw observation count, daily sample count and gaps. One observation gets a point/row and “More observations needed,” never an invented chart. Editing identity creates or splits the relevant offer series.

**Failures:** duplicate Save retry, device clock in the future, identity changes, observations more than 90 days old, no comparable observation, damaged local record.

**Acceptance:** duplicate operation IDs do not create duplicate observations; two real observations on one day are not two daily samples; saved timestamps are not retailer verification timestamps. The active comparison/history window is 90 days. Older records remain until explicit deletion, count toward caps, and are excluded from active summaries. No silent eviction or backfill.

### F06 — Control and recover local data

**Story:** As a user, I can inspect, export and delete my shortlist without contacting the founder. **Purpose:** provide control and an escape from storage limits.

**Inputs:** local schema-versioned data only. Export is a JSON file created on explicit click; no downloads permission unless implementation demonstrates it is necessary. Import is deferred to avoid an unnecessary attack surface.

**Happy path:** open Data settings inside the same popup; view counts/bytes; export; delete an offer and its observations or delete all. Offer deletion presents an item-specific confirmation and clear outcome. No autosync.

**Failures:** export generation fails; deletion write fails; stale selection; schema version unsupported; profile storage unavailable.

**Acceptance:** distinguish export generation and browser download initiation from a file actually saved. Use “Download requested — check your downloads” unless completion is observable; never delete data after a download request. Failed export does not erase data. Confirm deletion only after completion; it removes offer records, observations and drafts. A new clean profile starts empty. Exported copies are outside automatic deletion and cannot be imported through this P0 UI.

## P0 limits and usability requirements

The proposed application caps are 25 saved offers, 500 observations and three offers per comparison. Evaluate the post-mutation state: reject a 26th offer or 501st observation, while allowing an observation on an existing offer at 25 offers if other limits permit it. At 4 MiB show a storage warning. The 5 MiB application ceiling includes a 128 KiB control/recovery reserve; reject growth that would consume it. Reads, export and data-reducing cleanup stay available. Chrome's own storage limit is a separate constraint [T02]. Migration staging needs additional available headroom and must fail safely.

P0 supports one editing window per founder session. `storage.local` is not treated as a transactional database. Last confirmed draft state should survive closing/reopening; an unacknowledged last edit is not guaranteed durable. A public pilot needs an evidenced concurrent-write and recovery decision.

Accessibility target: WCAG 2.2 AA [T32]. Keyboard use, focus, labels and errors are test requirements. English UI is the initial proposal; recruit users in their preferred spoken language and test comprehension. Urdu and Roman Urdu interface work is deferred until evidence identifies a language barrier.

## Explicit non-goals

No coupons/cashback, predictions, fake-sale labels, seller fraud scoring, automated buying, cart modification, payment/account access, broad page scanning, customer-facing AI calls, multi-country support, affiliate rewriting, crowdsourced price publication, merchant behavioral analytics, mobile app, cross-device identity or public dashboard.

## Unresolved decisions and gates

The structured manual task may be slower than existing shopping. Manufacturer identifiers may be absent. Retailer cooperation, commercial history rights, public storage protection and exact release tooling remain unresolved. [Validation](09-validation-and-growth.md) tests value; [data access](02-data-access.md) clears methods; [backlog](13-build-backlog.md) controls implementation. No requirement in this file is a claim that a feature already works.
