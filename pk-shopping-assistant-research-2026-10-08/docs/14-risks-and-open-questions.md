# Risks and open questions

**Status:** PROPOSED decisions; assessed 8 October 2026. Risk likelihood has not been measured, so no numerical probability or market-success score is assigned. Owners below are proposed responsibilities, not people already engaged.

**Current position:** NARROW to private manual/synthetic P0. No eligible integration, user validation, installed build or affiliate approval exists. Rights, value, storage/disclosure, operating readiness and registration cash gate public release. See [evidence classifications](research/evidence-register.md).

## 1. Risk register

| ID / priority | Risk and impact | Evidence or uncertainty | Proposed owner / next verification |
|---|---|---|---|
| RK-01 — Blocker | **Insufficient value.** Infrequent purchases and manual entry may make the notebook unnecessary. | Demand and willingness to return/pay are UNKNOWN; competitors do not validate demand. [M09–M23](research/sources.md) | Founder: observe 10–12 tasks against normal alternatives; change or stop after two unsuccessful iterations. |
| RK-02 — High | **Wrong surface.** Shoppers may use mobile apps or lack installation permission. | Device and page-view denominators differ; neither estimates installation reach. [M24–M29](research/sources.md) | Founder: screen device, ownership and shopping occasion; record exclusions before reconsidering the surface. |
| RK-03 — Blocker | **No source rights.** Automated comparison/history cannot launch; pilot rights may expire. | Daraz restrictions and seller/API limits are documented; other grants are unverified. [D01–D09](research/sources.md) | Founder/contract reviewer: obtain signed method/field/retention/display/cadence/expiry terms and sample. Disable ineligible sources. |
| RK-04 — Blocker | **False equivalence.** Different size, handedness, condition, bundle or warranty misleads purchasing. | Near variants and differing identifier namespaces occur. [M30–M31](research/sources.md) | Founder/data reviewer: label equivalent, different and ambiguous pairs; pass the matching gate and abstain on missing decisive attributes. |
| RK-05 — High | **Misleading totals.** Stale stock, unknown delivery and installments distort ranking. | Public snapshots expose stock discrepancies and distinct installment amounts. [M30, M33](research/sources.md) | Founder: validate timestamps, stock, location and eligible costs; suppress incomplete rankings. Report identity, critical-field, comparable-alternative and delivered-total coverage separately as specified in [validation](09-validation-and-growth.md). |
| RK-06 — Blocker | **Storage/disclosure mismatch.** Protection or consent may be insufficient. | At-rest wording needs resolution; pre-install disclosure applies to local handling. [T10, T36–T37](research/sources.md) | Founder/security reviewer: evidence fields and storage/key design or authoritative interpretation; reconcile notice, listing and measured behavior. |
| RK-07 — High | **Compromise.** Malicious input or releases expose data or alter decisions. | Defenses are untested; bundled logic and least permissions are required. [T09, T12, T38](research/sources.md) | Founder: review pins/bundle, hostile fixtures and messages; protect publisher account; exclude secrets and remote executable rules. |
| RK-08 — High | **Notebook loss.** Popup closure, quotas, migration or profile loss destroys evidence. | Popup closes on lost focus; storage has no claimed multi-window transaction guarantee. [T02, T40](research/sources.md) | Founder: test acknowledged/failed writes, draft reopen, caps, export readability and internal interrupted-write/migration recovery. User import is deferred; preserve single-editor limits and forbid silent eviction. |
| RK-09 — Revenue blocker | **Affiliate economics unavailable.** Traffic, benefit, payout or orders may be ineligible. | No approval/rate; Daraz PK unavailable in one network; separate Chrome gate. [D04, D10, T13](research/sources.md) | Founder: obtain agreement/flow approval and payout/returns/COD definitions. Actual/base commission stays zero. |
| RK-10 — Distribution blocker | **Registration cash.** Literal zero cash cannot fund a new publisher account. | Registration requires USD5; payment untested. [T14–T15](research/sources.md) | Founder: establish funds, including bank/tax costs. P0 authorizes no spending/publication. |
| RK-11 — High if backend added | **Quota exhaustion/abuse.** Requests, scans, writes, storage or CPU interrupt service. | Workers/D1 limits differ; workload unmeasured. [T16–T22](research/sources.md) | Founder: benchmark resources, bound ingestion and degrade honestly; prevent unapproved spending and quota-evasion sharding. |
| RK-12 — High | **Legal/claim uncertainty.** Comparisons, branding or notices trigger complaints/removal. | CCP guidance applies; one withdrawn bill does not settle privacy-law status. [D11–D12](research/sources.md) | Founder/qualified reviewer: verify applicable texts, operator identity, contracts, claims, branding and support terms. |
| RK-13 — High | **Unsustainable support.** Corrections and feed failures consume excessive founder time. | Maintenance is UNKNOWN; no operating history. | Founder: time P1 incidents; reduce offers/stop invitations when capacity is exceeded. No unstaffed SLA. |
| RK-14 — Medium | **False confidence/expansion.** Cached counts and incompatible denominators distort decisions. | Competitor dates, counts and promises conflict. [M01–M28](research/sources.md) | Founder/reviewer: retain dates/caveats; recheck launch-critical facts. New countries/categories require new source/jurisdiction decisions. |

## 2. Questions that need a concrete answer

| Open question | Evidence that would close it | What remains blocked |
|---|---|---|
| Will shoppers do the extra entry work? | Correct observed task outcome, baseline comparison and voluntary reuse on another relevant occasion | Public value claim, broader product investment |
| Which exact merchant and method are eligible? | Authorized signer, written use/field/cadence/retention grant, complete sample and termination rules | Reader, feed ingestion, remote monitoring and history publication |
| Are there two independently eligible merchant/source integrations with exact overlap? | Separate grants and an overlap table establishing model, variant, condition and warranty; two marketplace sellers alone are insufficient | Cross-store cheapest-equivalent claim |
| What protects local facts and drafts? | Reviewed real implementation and documented policy interpretation; accurate public disclosure | Public release and encryption claim |
| Can the founder pay publication and ongoing costs? | Explicit budget authorization, final payment/plan terms and measured workload | Spending, deployment and public submission |
| What is a payable order and accessible payout? | Current partner agreement, permitted extension flow and reconciliation of approved net orders | Nonzero base revenue and profitability claim |

## 3. Escalation and closure rules

No risk closes because a document exists. Add an evidence link, reviewer, date, remaining limitation and next review date to each closure. A page-read test cannot close an installed-behavior risk; affiliate acceptance cannot close data rights; absence of complaints cannot close accuracy.

If value fails, change the job or stop. If access fails, retain private manual/synthetic P0 or pause; do not replace a blocked source with crowdsourced browsing or unapproved scraping. If a live source is revoked, stop new ingestion and display as the agreement requires. If costs or support exceed the approved limit, degrade honestly and stop recruitment.

P1 permits an eligible local reader or founder review of a permitted merchant file for research/manual entry; no customer file import or hosted ingestion. Hosted catalog/API work is conditional P2. A P2 single-merchant explainer must pass its own value and release gates; cross-store comparison additionally requires two independently eligible merchant/source integrations with exact overlap.

The [roadmap](12-launch-and-roadmap.md) is conditional on these gates. Foundation work using synthetic inputs may be a future implementation step after a new instruction; it does not authorize live adapters, external outreach or publication in this research run.
