# Evidence register and resolved contradictions

**Research date: 8 October 2026.** This register connects material findings to product decisions. It is not a tally of claims proven true. Source IDs resolve in [sources](sources.md); bounded interface observations have their own [procedure and denominator](public-audit.md). Design choices and calculated scenarios retain their assumption labels even when their inputs include official documentation.

## Classification and interpretation

| Label | Meaning in this pack |
| --- | --- |
| VERIFIED FACT | The cited source establishes the limited stated fact, such as a listing's existence, a published quota or a survey's reported result. It does not establish our compliance, market opportunity or product performance. |
| COMPANY CLAIM | A provider advertises a capability, coverage, audience, refresh rate, benefit or eligibility. Independent performance is not inferred. |
| OBSERVED IN TEST | A recorded retrieval, public-interface action or arithmetic check produced the stated result. Method, date and denominator limit interpretation. |
| INFERENCE | A reasoned interpretation or recommendation; the conclusion is not converted to fact by citing its premises. |
| ASSUMPTION | A chosen planning, modeling, specification or acceptance-test input. It must later be measured or deliberately accepted. |
| UNKNOWN | Evidence is insufficient, blocked, not obtained or outside the completed scope. Unknown does not mean false or unavailable everywhere. |

## Market and customer claims

| ID | Class | Material claim and evidence | Decision and remaining limit |
| --- | --- | --- | --- |
| E01 | VERIFIED FACT / COMPANY CLAIM | BuyHatke has an identifiable Chrome listing and advertised shopping capabilities [M01–M02]. | A valid benchmark, not proof that its Indian distribution or features transfer to Pakistan. Store users, marketing members and active buyers stay separate. |
| E02 | VERIFIED FACT / UNKNOWN | Keepa, Honey and Rakuten have exact retrieved listings; Capital One Shopping has an official service/help identity, but its current store metadata was not retrieved [M03–M08]. | Compare scoped patterns such as evidence/history and explicit benefit. Do not claim every global service supports Pakistani merchants. |
| E03 | VERIFIED FACT / COMPANY CLAIM | Farq, Flashi, Pasaley, Daraz Smart Shopper, Dhundo, PriceTracker and TrendCompare have relevant public identities or exact linked store/package records [M09–M23]. | The market is not empty. Advertised coverage and adoption are not verified working catalogs or active Pakistani-user counts. |
| E04 | VERIFIED FACT | PBS's year-labeled 2024–25 household table reports 11% computer/laptop/tablet availability and 96% mobile/smartphone availability [M26]. | Recruit actual computer shoppers. These are household access measures, not extension reach or shopping shares. |
| E05 | VERIFIED FACT | Statcounter's September 2026 Pakistan table reports 50.61% desktop, 48.42% mobile and 0.97% tablet page views [M24–M25]. | Instrumented page views measure a different population from PBS households. Neither converts to addressable mouse purchasers. Recent figures may be revised. |
| E06 | VERIFIED FACT / UNKNOWN | The original Gallup release reports 8% having made an online purchase in the prior six months; a second release reports last-channel shares among recent online buyers [M27–M28]. | Incidence is not buying frequency. Subgroup size, current mouse demand, spending and willingness to install remain unknown. |
| E07 | INFERENCE / ASSUMPTION | New branded wireless mice expose concrete identity/offer distinctions while avoiding handset PTA complexity [M30–M32]. | Selected for a tractable experiment, not demonstrated margins or market size. Low order value and infrequent replacement can invalidate the wedge. |
| E08 | ASSUMPTION / UNKNOWN | The bottom-up early reach funnel and 12-task study are planning instruments [market](../01-market-and-competition.md), [validation](../09-validation-and-growth.md). | No participants, interviews, installs, repeat-use events or paid demand were observed. The funnel is not a forecast. |

## Bounded public observations

| ID | Class | Material claim and evidence | Decision and remaining limit |
| --- | --- | --- | --- |
| E09 | OBSERVED IN TEST | Farq and Flashi returned populated M650 search results in the public browser; the Farq initial empty/loading state later changed [R01, R05]. | A delayed initial view is not missing coverage. Related search results are not automatically an exact-match engine error. |
| E10 | OBSERVED IN TEST | Farq/TechArc both displayed PKR 7,000 for the inspected M650 graphite; Flashi/Naheed both displayed PKR 8,930 for M650 white [R02–R03, R05–R06]. | Two purposive item-price agreements, with no checkout or complete equivalence verification. No accuracy percentage or savings claim follows. |
| E11 | OBSERVED IN TEST | Flashi labeled its white M650 offer in stock while the linked Naheed page displayed out of stock [R05–R06]. | One stock-label disagreement. True stock and the cause, timing or cache explanation were not established. |
| E12 | OBSERVED IN TEST | Farq M185's best-price headline coexisted with zero in-stock offers in its own breakdown [R04]. A separate retrieved router page had a related presentation issue [M33]. | A reproducible presentation question. Keep the router outside the live mouse denominator; do not infer deceptive intent or site-wide failure. |
| E13 | UNKNOWN | Historical completeness, installed extension behavior, notification delivery, checkout delivery charges, actual stock and warranty fulfillment were not tested. | The audit supports an accuracy protocol, not a competitor ranking. Required future tests are in [public audit](public-audit.md) and [testing](../11-testing-and-operations.md). |

## Data access and revenue

| ID | Class | Material claim and evidence | Decision and remaining limit |
| --- | --- | --- | --- |
| E14 | VERIFIED FACT / INFERENCE | Daraz's published license restricts commercial extraction and reuse; examined developer documentation is seller-authorized and has restrictive content terms [D01–D03, D14]. | No assumed public catalog or history license. Applicability of older mirrored developer terms to a specific Pakistan integration still needs confirmation. |
| E15 | UNKNOWN | No scoped collection, caching, history and republication grant for this project was obtained from Daraz, PriceOye, Shophive, Mega or an independent merchant [D01–D09]. | All automated retailer integrations remain BLOCKED. A public page, robots policy, local user consent or affiliate link does not resolve the missing rights. |
| E16 | INFERENCE / UNKNOWN | Shophive has category-relevant listings [D13, M30]; an independent merchant could control its own catalog. | A concrete outreach prospect and a fallback, not an eligible integration. No partner willingness or price for access was established. |
| E17 | OBSERVED IN TEST / UNKNOWN | The inspected Daraz affiliate navigation redirected to a generic page; a FlexOffers listing says the program is unavailable in that network [D04, D10]. Naheed's application lead could not be fully opened [D15]. | Do not infer every Daraz program is closed. None provides verified approval, current commission, extension traffic rights or a payout route for this project. |
| E18 | VERIFIED FACT / UNKNOWN | Chrome has specific affiliate benefit/action/disclosure restrictions [T13]. | A comparison plus a click is not treated as sufficient. Both the actual feature flow and partner approval remain unresolved; affiliate functionality stays off. |
| E19 | ASSUMPTION / OBSERVED IN TEST | Conditional affiliate calculations yield PKR 35 / 2,160 / 102,000 monthly gross accrued commission under the stated low/base/high inputs [cost model](../10-business-and-costs.md). Arithmetic was rerun using [the helper](cost_model_check.py). | No input rate is a verified offer. Actual demonstrated revenue and the financial base plan remain PKR 0. Returns/COD/cancellations are counted once in final approval. |

## Product, architecture and operations

| ID | Class | Material claim and evidence | Decision and remaining limit |
| --- | --- | --- | --- |
| E20 | ASSUMPTION / INFERENCE | P0 selects native MV3, TypeScript and one manual local popup with only `storage` [architecture](../05-architecture.md). | The smallest private software experiment. It does not test automated convenience, public service reliability or a sustainable company. |
| E21 | VERIFIED FACT / ASSUMPTION | Chrome documents asynchronous storage, a popup that closes when focus leaves it, and event-driven workers [T01–T02, T40]. | P0 uses bounded per-offer storage, explicit drafts and acknowledgement; no worker or cross-window transactional promise. The protocol still needs implementation and installed tests. |
| E22 | ASSUMPTION | Money uses integer minor units; advertised payable item price is not discounted twice; unknown fees stay unknown; snapshots preserve historical identity [contracts](../06-data-and-api-contracts.md), [integrity](../07-price-integrity.md). | Normative design requirements, not a working parser or measured matching system. Manual confirmation remains provisional. |
| E23 | ASSUMPTION | The proposed 200-case matching corpus has 120 development and 80 held-out cases; thresholds and performance budgets are planning targets [testing](../11-testing-and-operations.md). | No corpus or benchmark was implemented or run. Zero critical false matches would be a release gate, not a population accuracy guarantee. |
| E24 | VERIFIED FACT / UNKNOWN | Chrome data-handling, pre-install disclosure and FAQ requirements apply even to local handling [T10–T11, T36–T37]. | Draft notices are not compliance assurance. Public at-rest protection/key management, contacts, consent implementation and review are unresolved. |
| E25 | VERIFIED FACT | A new Chrome publisher must register; Pakistan is listed as supported, and Google's April 2026 publisher announcement identifies a USD 5 fee [T14–T15]. | Private developer-mode work is distinct from public distribution. Founder checkout, taxes/bank charges and store approval were not tested. |
| E26 | VERIFIED FACT / ASSUMPTION | Official Workers/D1 pages state finite Free CPU, request, row and storage limits [T16–T19]. The one-database model uses 500 MB, not the account's 5 GB aggregate. | Proposed later service only. Account signup, queries, physical row sizes, CPU and deployment compatibility were not tested. |
| E27 | ASSUMPTION / OBSERVED IN TEST | Under 1 KiB/observation plus ancillary/overhead assumptions, 90-day storage is 27.96 / 279.55 / 2,795.52 MB for 100 / 1,000 / 10,000 DAU [cost model](../10-business-and-costs.md). | The first quantified long-run limit is approximately 1,788 DAU; at 2 KiB/observation it becomes about 899. CPU may fail earlier. These are arithmetic consequences, not capacity measurements. |
| E28 | VERIFIED FACT / UNKNOWN | Framework/tool repositories and official version pages were checked [T23–T31, T33]. | Reported release labels are a dated research snapshot. No dependency combination, clean install or extension build was validated. Recheck and pin compatible patched versions during foundation. |
| E29 | VERIFIED FACT / ASSUMPTION | WCAG 2.2 is the chosen accessibility reference [T32]. | Target AA with keyboard/screen-reader and compact-layout checks. No conformance test was performed. English first is a scope choice; language comprehension requires fieldwork. |
| E30 | VERIFIED FACT / UNKNOWN | Pakistan's competition regulator publishes claim/disclosure guidance; one inspected Senate private bill was withdrawn [D11–D12]. | Obtain implementation-specific review before public claims. The withdrawn bill does not establish the status of all national privacy legislation. |
| E31 | INFERENCE | The strongest current decision is NARROW, with moderate confidence in the boundary and low confidence in commercial viability [decision](../00-decision-brief.md). | Continue only if actual value and sustainable permission improve. No live-source or public-release gate passed merely because this pack was completed. |

## Contradiction register

| ID | Apparent conflict | Resolution applied throughout the pack |
| --- | --- | --- |
| C01 | BuyHatke describes both 100+ and 1,000+ stores [M02]. | Preserve both as differing company claims. Do not choose a total or infer active Pakistan coverage. |
| C02 | Honey store users and marketed membership differ [M04]; website and extension audiences also differ for local services. | Retain metric labels and surfaces; no subtraction, comparison or market share calculation across incompatible measures. |
| C03 | Farq homepage suggests 15-minute updates; FAQ describes at least daily checks. Shipping/checkout language also differs [M09–M11]. | Refresh and delivered-price claims remain unverified; UI audit establishes only its bounded observations. |
| C04 | Flashi describes real-time and daily collection [M12–M13]. | Do not adopt one as measured freshness. Its white M650 stock disagreement is recorded separately from its advertised interval. |
| C05 | Dhundo describes paid reveal tokens and elsewhere describes following store links without an account [M18]. | Mark the access/monetization flow unresolved; no account or payment experiment was performed. |
| C06 | TrendCompare cites several brand totals across surfaces [M22–M23]. | Retain their contexts and do not present a verified universal store count. |
| C07 | PriceTracker Play views differ in displayed date/download band [M21]; Rakuten indexed/opened dates differed [M07]. | Localized/cached snapshots are not a growth series. Prefer the opened context where meaningful and record conflicting variants. |
| C08 | Search snippets exposed older PBS values and imprecise Gallup publication ages [M26–M28]. | Use the explicit 2024–25 table and printed original survey dates. No visual PDF inspection is claimed where rendering failed. |
| C09 | Desktop page-view share is much higher than household computer access [M24–M26]. | They have different denominators and methods; neither is corrected using the other or called shopping reach. |
| C10 | An affiliate application lead, seller API or RSS footer could look like available data access [D02, D04, D09–D10, D15]. | Eligibility, technical shape and contractual rights remain separate. No source advanced to an approved integration. |
| C11 | Early prototype wording mixed a P1 feed service with P2 endpoints. | P1 allows an eligible local reader or human-reviewed merchant files for research/manual entry. Customer imports and hosted ingestion are absent. Hosted services are conditional P2. |
| C12 | A two-source condition could accidentally block every public one-merchant feature. | Two independently eligible merchant/source integrations with exact overlap gate cross-store functionality. A one-merchant explainer has its own full value/release gate. |
| C13 | Blanket capacity wording could block a valid observation at 25 offers. | Evaluate the proposed mutation: reject offer 26, observation 501 or excess bytes. Retained older records and audit additions still count. Export/deletion remain usable; reserve 128 KiB within the 5 MiB cap. |
| C14 | A historical observation could point only to mutable current identity. | Preserve immutable variant/offer context per accepted observation; keep editable draft separate. Corrections supersede without silently rewriting historical meaning. |
| C15 | A crossed-out discount, conditional coupon or unknown fee could produce a misleading total. | `item` is the advertised payable amount after markdown. Subtract only a separately evidenced eligible additional discount; completeness is explicit for shipping, tax and every mandatory fee. |
| C16 | “Exact match,” complete delivered comparison and manual user confirmation could be conflated. | Separate intrinsic identity, equivalent core offer terms, ranking eligibility and provisional evidence. Benchmark core equivalence separately from stock and delivered-price checks. |
| C17 | Routine tests could leak the supposed holdout; 90-day/future-time boundaries were unspecified. | Development and holdout commands are distinct. Use the inclusive rolling 90×24h interval, exclude future observations until eligible and flag clocks over five minutes ahead. |
| C18 | Free database account allocation or compact row assumptions could overstate capacity. | Use the 500 MB per-database cap, account for indexes, expiration and backup-day reads, adopt the revised 1 KiB baseline and show 2 KiB sensitivity. No measured capacity is asserted. |

## What would change the recommendation

The next evidence must concern actual behavior and rights: useful task outcomes against the usual method, real installation objections, a scoped merchant grant, exact overlapping variants if cross-store value matters, and measured effort. Favor a smaller one-merchant job if that is what users value and a merchant can support. Stop after two focused iterations without a meaningful improvement, unavailable sustainable rights or support/economics that cannot be funded. These are proposed decision rules, not results already obtained.
