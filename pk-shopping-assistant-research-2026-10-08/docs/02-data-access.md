# Data access, retailer eligibility, and affiliate gates

**Research date:** 8 October 2026. **Status:** no retailer integration is eligible for launch on the evidence obtained. **Decision:** proceed only with the proposed local manual/synthetic prototype; keep live retailer adapters, uploaded retailer observations, public comparison, and remote price monitoring disabled. This is a product gate, not a legal ruling that every form of personal note-taking is prohibited.

The first category is **new branded wireless mice**, with exact manufacturer model/SKU, connectivity, color, pack contents, condition, and warranty distinctions. No merchant has agreed to participate. Sources use the classifications in the [evidence register](research/evidence-register.md); numbers and rights in a proposed agreement are assumptions until accepted.

## 1. What the desk research established

**VERIFIED FACT — published terms:** Daraz Pakistan's site licence excludes commercial reuse, collection of listings/descriptions/prices, and data-extraction tools absent appropriate express permission. Its ordinary page-cache allowance is not a documented licence for a commercial price archive. [D01]

**VERIFIED FACT — documented API scope:** the official Alibaba-hosted Daraz documentation describes seller authorization for seller business data. Its product tutorial concerns listing and managing a seller's products. Model, SKU, price, and warranty examples show potential fields, not a grant to obtain every seller's catalog. [D02, D14]

**VERIFIED FACT — published API agreement; applicability requires confirmation:** the retrieved developer agreement limits copying/display, requires freshness, restricts combining Daraz with non-Daraz content, and provides for content removal/destruction on termination. It describes free access with possible later fees. The mirror is dated 2021 and contains incongruous marketplace-domain examples. Obtain the actual current Pakistan contract and an explicit comparison/history grant before relying on it. [D03]

**OBSERVED IN TEST — public text retrieval only:** Daraz's affiliate navigation redirected to a generic page; another affiliate route exposed shopping content without the Pakistan agreement. No affiliate account was created or application submitted. [D04]

**OBSERVED IN TEST:** PriceOye's terms page produced image-link fragments, so its full terms were not verified. Its retrieved fair-use policy primarily addresses consumer/account behavior and platform integrity; it does not establish permission for this project. Shophive's help/category pages were readable, but a scoped commercial data licence or affiliate agreement was not found. [D05–D07, D13]

**VERIFIED FACT — published terms:** Mega reserves rights in site content and warns that prices/availability can change. **OBSERVED IN TEST:** its apparent RSS link resolved to the homepage in the retrieved navigation, not a verified licensed feed. [D08–D09]

These results establish obstacles and unanswered questions. They do **not** establish that the retailers lack private partner programs. Public product visibility, an affiliate referral link, a robots.txt allowance, a seller token, and a commercial comparison licence are different things.

## 2. Assess each collection method separately

| Method | What it would do | Required basis and project decision |
|---|---|---|
| User-triggered local page reading | Read the product the shopper deliberately opens; keep selected facts on that device | Narrow browser permission and retailer/legal review for that exact commercial tool. Local execution is not automatic clearance. Deferred until this is established. |
| Upload of visited observations | Send selected price/SKU/time facts from that page to a service | Separate retailer rights, purpose-specific privacy consent, security, retention, and publication eligibility. User consent cannot grant someone else's catalog rights. Disabled. |
| Scheduled automated fetching | A server or extension revisits products without a fresh user action | Explicit automated access path, approved hosts/endpoints, cadence, quotas, caching, and operational budget. Disabled for all researched retailers. |
| Merchant-provided feed | Receive an export or documented API supplied by an authorized merchant | Written scope covering the merchant's own licensed content and each intended use. Preferred future pilot route; no agreement exists. |
| Historical republication | Retain successive facts and display charts, aggregates, or comparisons over time | Explicit retention, derivation, display, export, correction, and post-termination rights. Current-price permission alone is insufficient. |

Manual data in P0 means user-entered private notes or clearly labeled synthetic fixtures, not an undisclosed data-collection workforce. Do not use crowdsourced browsing, rotating IPs, proxy services, cached search pages, or third-party scraper vendors to circumvent a blocked source. A vendor charging for extraction is not evidence it can license the underlying data.

### Retailer-by-method release matrix

**R:** published restrictions materially conflict with the proposed commercial use. **U:** eligibility unverified; disabled. **C:** possible only under a future scoped agreement. These are project states, not assertions about enforceability.

| Candidate | Local visible-page processing | Upload observations | Scheduled fetching | Merchant/API/feed path | Retain/publish history |
|---|---|---|---|---|---|
| Daraz Pakistan | U/R: exact local flow needs review | R; no grant | R; no grant | C; seller API alone insufficient | U/R; explicit override/scope needed |
| PriceOye | U: complete terms unavailable | U | U | C; no official feed grant found | U |
| Shophive | U | U | U | C; direct catalog discussion possible | U |
| Mega | U | U | U | C; apparent RSS is not a verified path | U |
| Naheed, additional lead [D15] | U | U | U | C; no scoped grant obtained | U |
| Willing independent merchant | U; no merchant secured | U | U | C; proposed own-catalog agreement | C; negotiate independently |

### Fields, rights, and operating terms

| Candidate | Field coverage actually established | Historical rights, cache, redistribution | Cadence, cost, attribution, expiry | Concrete fallback |
|---|---|---|---|---|
| Daraz | Documentation examples only; no authorized dataset delivered | No project grant; see D03 restrictions | No project quota/cost/attribution schedule or expiry confirmed | Exclude Daraz; seek independent own-store feed |
| PriceOye | No scoped feed/sample obtained | All unverified | All unverified; no zero-price assumption | Exclude until written answer; P0 notes |
| Shophive | Category listings demonstrate relevant mouse products, not feed completeness | All unverified | All unverified | Request small export; use synthetic catalog meanwhile |
| Mega | Public catalog text; no feed schema validated | No commercial/history grant identified | All unverified; displayed prices may require confirmation | Omit source; do not substitute homepage polling |
| Naheed | No authorized feed/sample; affiliate overview is a separate lead | All unverified | All unverified; overview could not be fully retrieved | Request terms if pursuing prospect; keep source disabled |
| Independent merchant | Proposed fields below; sample pending | Proposed 30-day pilot and explicit retention/display clauses; unsigned | Proposed twice-daily export, PKR 0 cash pilot, neutral attribution; entirely negotiable | Private synthetic/manual P0 if merchant declines |

For every candidate, update frequency is **unknown**, even where a page displays a current price. No service-level commitment, inventory accuracy, refresh entitlement, or cache lifetime has been demonstrated. Record these as nullable contract attributes; never fill them with guessed defaults and treat them as permissions.

## 3. First potentially eligible integration

**INFERENCE / recommendation:** start with a Pakistan electronics merchant that controls its own webshop catalog and can grant a small explicit feed licence. This minimizes dependency on a marketplace's seller and platform contracts. It does not mean the merchant will agree or owns every product photograph/description it displays.

**Concrete prospect, not partner:** Shophive's Logitech category lists wireless mice including M171 and B175. This makes it relevant to an initial feed conversation. It does not verify stock, authenticity, authorization as a distributor, willingness to cooperate, or commercial suitability. [D13]

**Additional lead:** Naheed's official affiliate-overview search result invites an application. The full page returned 403 in public retrieval, leaving eligibility, extension acceptance, commission and payout terms UNKNOWN. Affiliate navigation supplies no data/history licence. No application was submitted. [D15]

Propose 20–40 selected SKUs for a 30-day pilot, a merchant-exported CSV or JSON file, no payment obligation, and a small group of consenting testers. The numbers are **ASSUMPTIONS for negotiation**. The partner supplies its own information rather than credentials to unrelated marketplaces. Begin with human-reviewed file imports before paying for scheduling or building a portal.

Minimum fields requested are merchant and offer IDs; manufacturer part number; model; connection type; color; single unit/bundle and included receiver; new condition; warranty provider, period and scope; PKR price with tax inclusion; stock state; order restrictions; known delivery fees by destination; canonical product URL; and merchant observation time. Unknowns remain explicit. Images, marketing copy, customer reviews, and buyer data are unnecessary for the first test.

One eligible merchant enables an explanation of that merchant's selected offers and, **only if licensed**, observations accumulated from the pilot start. It does not enable a useful cross-store coverage claim. Public cross-store comparison requires at least two independently eligible sellers with overlapping exact variants, comparable warranty/condition, sufficient freshness, and known price components. A second feed without relevant overlap does not pass that gate.

### Permission checklist to attach to the agreement

| Agreement question | Required concrete answer |
|---|---|
| Authority and scope | Legal entity; signer authorized; underlying rights; own-store versus marketplace scope; approved domains/endpoints and SKUs |
| Collectors and use | Which of local reading, upload, feed import, scheduled fetch, public display, private storage, history, comparison, and alerts are allowed? |
| Data fields | Field allowlist, image/text exclusions, seller identity, restricted/personalized prices, correction source |
| History and derivatives | Retention duration; observation series and aggregates; chart/window rules; whether old facts survive offer removal or contract end |
| Caching and distribution | Maximum cache age; backend/CDN/device copies; user export; public API and bulk download prohibited unless separately agreed |
| Operations and costs | Cadence/quota; timestamps; outage contacts; update delay; fees; free-pilot end; written opt-in before any paid continuation |
| Attribution and independence | Permitted name/logo usage; source link; commission disclosure; no paid influence on neutral price ranking |
| Revocation and termination | Effective time, notice channel, deletion deadlines, backup handling, existing user records, treatment of accrued commissions |

Store a versioned access record with the grant, allowed uses/fields, collector, applicable terms URL/version, review date, expiry, and revocation state. Every imported observation carries that access-record ID. Eligibility is a precondition for ingestion **and** display. A revoked source stops new reads and alerts immediately; retained facts are hidden or deleted according to the recorded grant. Do not promise permanent historical charts before settling this clause.

## 4. Affiliate revenue and Pakistani payout viability

**No approved affiliate revenue is established. Use commission = 0 in the current base case.** No current Pakistan direct-program agreement, extension-traffic approval, category rate, payable-order definition, or demonstrated payment route was obtained. The existence of affiliate navigation establishes a lead only. [D04]

**VERIFIED FACT — network's published statement:** FlexOffers' Daraz Pakistan page explicitly says the program is not currently offered in its system. Historical payout text remains on that same page. It is excluded as an available route and its old rates are not inputs to the model. [D10]

| Required revenue input | Daraz direct | PriceOye / Shophive / Mega | Independent pilot |
|---|---|---|---|
| Pakistan resident/individual/company eligibility; KYC | UNKNOWN | UNKNOWN | Negotiate; do not assume eligibility |
| Extension traffic and exact benefit/interaction approved | UNKNOWN | UNKNOWN | Written approval needed |
| Qualified SKU/category commission and exclusions | UNKNOWN | UNKNOWN | Rate starts at 0 unless agreed |
| Cookie window, attribution model, referral conflicts | UNKNOWN | UNKNOWN | Specify click-to-order attribution |
| Browser-to-app transition and cross-device attribution | UNKNOWN | UNKNOWN | Test only if supported/approved |
| COD collection, cancellations, returns, partial refunds | UNKNOWN | UNKNOWN | Define final approved net order |
| Payout currency, Pakistan bank route, threshold, fees | UNKNOWN | UNKNOWN | Specify actual recipient and method |
| Validation, settlement timing, clawbacks, withholding | UNKNOWN | UNKNOWN | Define statement and dispute process |

Third-party tutorials provide inconsistent thresholds and payout assertions. They are not substituted for the controlling Pakistan contract, and another Daraz country's agreement is not imported into Pakistan. No payout was tested.

For a future agreement, ask when an order becomes payable: placed, shipped, delivered, cash collected, return window expired, or approved in a final statement. Deduct cancellations, failed COD, and returns **once**, through the approved-order factor or net approved value—not through both without reconciling the definitions. Cash received can lag accrued revenue and may remain below a payout threshold. Model those separately.

Proposed affiliate behavior is an explicit, clearly disclosed action after presenting a useful answer, with partner and Chrome policy review of that exact flow. Do not rewrite existing links/referrals, set attribution silently, or assume a click/disclaimer guarantees acceptance. Commission never determines an exact-match score or normal price order. See [business model](10-business-and-costs.md) and [policy review](08-security-privacy-policy.md).

## 5. Pakistan-specific review questions

**VERIFIED FACT — regulator guidance:** CCP's 3 April 2023 guidelines address substantiation, misleading comparison, conspicuous material disclosures, warranty scope, and disclosed endorsement connections (printed pp. 7, 10, 14–18). [D11] **INFERENCE for design:** exact variant and warranty evidence, incomplete-total labels, and restrained savings/history language should be release requirements. A footer disclaimer is inadequate product design for a misleading headline.

The Senate record for the **specific private member's Personal Data Protection Bill 2023** says it was disposed of after committee withdrawal. That is not an enacted-law source and does not determine the status of every later proposal. [D12] Current nationwide privacy obligations and jurisdiction-specific application remain **UNKNOWN in this limited review**; obtain the latest authoritative legal text before public launch.

Qualified review should address contract enforceability for each collection method; copyright and database/content reuse; trademarks and affiliation claims; current PECA requirements for access/copying/transmission; applicable federal/provincial consumer rules; consent and international processors; incident handling; and affiliate tax/withholding treatment for the founder's actual legal form. This research supplies implementation questions, not legal clearance or a tax rate.

## 6. Unsent outreach drafts

These are **drafts only**. No message, application, or agreement was sent. The founder must select an appropriate business contact and authorize outreach.

### Draft A — independent merchant / Shophive prospect

**Subject: Small permission-based pilot for clearer wireless-mouse offers**

Hello [merchant partnerships contact],

I am researching a Chrome shopping assistant for Pakistani shoppers comparing new branded wireless mice. I would like to explore a 30-day pilot covering about 20–40 of your own webshop SKUs. These are proposed limits, and no integration has been built or approved.

Would you consider providing a small CSV/JSON export containing model/part number, variant, included accessories, warranty, stock, price, known delivery charges, product URL, and update time? We would show where each fact came from and flag unknown charges. We do not need customer information or account access.

Before any collection or publication, we need written permission specifying allowed fields, refresh cadence, caching, display, exact-match comparison with other consenting merchants, historical retention/charts, attribution, and deletion on termination. Please indicate which uses you would allow; feed access would not be treated as permission for all of them.

We propose no cash fee or sales guarantee for this limited pilot. Referral commission can be considered separately after agreeing eligibility, extension traffic, attribution, returns/COD, and settlement. Would you be the right person to discuss this, or could you identify the appropriate team?

Thank you,
[Founder name]
[Project/contact URL or email]

### Draft B — Daraz Pakistan data and affiliate clarification

**Subject: Written eligibility clarification for a proposed shopping extension**

Hello [Daraz Pakistan partnerships/affiliate contact],

I am researching an independently branded Chrome extension that helps shoppers understand selected new wireless-mouse offers. We have not enabled Daraz collection, tracking, or affiliate behavior.

Could you provide the current Pakistan affiliate agreement and confirm whether a Pakistan-based [individual/company] may apply with a browser extension? Please review this proposed interaction: the shopper deliberately opens our popup, receives a useful evidence-based offer explanation, and separately chooses a disclosed retailer link. There would be no silent link replacement or referral overwriting.

Separately, is there a licensed product-data path for this use? Seller-authorized APIs appear insufficient to establish public catalog, cross-store comparison, or price-history rights. We need explicit answers on approved endpoints/fields, automated cadence, caching, historical retention, public display, comparison with other retailers, logo attribution, and termination/deletion requirements.

For affiliate economics, please confirm category rates, exclusions, attribution duration/model, app transitions, COD eligibility, cancellations/returns/partial refunds, validation and settlement timing, Pakistan payout route, currency, threshold, fees, withholding, and any additional extension approval. An affiliate acceptance would be treated separately from data licensing.

Please identify the controlling current agreement and any written approvals needed before a pilot.

Regards,
[Founder name]
[Project/contact URL or email]

## 7. Gate to the next implementation stage

The local P0 can be specified and built with synthetic fixtures, private manual entries, no retailer requests, no host permissions, no backend, and no affiliate links. It works with zero historical observations and zero network users: organize a selected offer, explain missing facts, and retain the user's own notes. It offers no automatic refresh, market-wide savings verdict, verified authenticity, real imported price history, or closed-browser monitoring.

A live adapter becomes eligible only after all method/field rights, a usable sample, independent field checks, end/expiry behavior, privacy requirements, and cost limits are resolved in writing. One source does not unlock a second source. Each use must pass separately. If agreements remain unavailable, continue only while tests show the private manual job is useful; narrow or stop that product hypothesis rather than quietly adding unauthorized collection.
