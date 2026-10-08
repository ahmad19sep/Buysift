# Decision brief

**Research date: 8 October 2026. Recommendation: NARROW. Scope: PROPOSED, not approved for implementation or public launch.**

## Decision and confidence

Test an extension-first **local offer notebook for new branded wireless mice**, aimed at Pakistani shoppers already making this purchase on a personal desktop or laptop. Its job is to help a shopper decide whether two offers really describe the same item and understand which price components remain unknown.

Confidence is **moderate in this narrowing decision and low in commercial viability**. The evidence supports careful product boundaries; it does not establish demand, willingness to install, repeat use, accessible retailer feeds or earnings. A generic BuyHatke-style product spanning all Pakistani shopping is not justified by this research.

The private prototype can use synthetic fixtures and manually entered, non-sensitive shopping facts. It must not be presented as a live shopping service. Public comparisons, shared price history, affiliate monetization and scheduled retailer collection remain separate blocked stages.

## Evidence that changes the decision

| Evidence class | Finding | Decision implication |
| --- | --- | --- |
| VERIFIED FACT / COMPANY CLAIM | Relevant local comparison products and established global shopping extensions exist. Listing existence is stronger evidence than advertised accuracy. [M01–M25] | Compete on a measured improvement in a narrow job; do not claim an empty market. |
| VERIFIED FACT | PBS's 2024–25 household indicators measure a much narrower computer-access population than mobile access. [M26] | Recruit actual desktop shoppers. Household access, page views and purchases are different denominators. |
| VERIFIED FACT | Daraz's published site license materially restricts the proposed commercial collection. No permission for this project was established for any researched retailer. [D01–D09] | Do not make automated integration a foundation assumption. Obtain a scoped grant first. |
| OBSERVED IN TEST | A small public interaction check produced usable competitor results; both checked retailer item prices agreed with the comparison pages. One stock label disagreed, and a separate page displayed a best-price headline despite its own offers being out of stock. See [audit](research/public-audit.md). | Both capability and evidence presentation need testing. A small purposive sample proves neither reliability nor widespread failure. |
| VERIFIED FACT | Manufacturer variants such as M650, M650 L and M650 L Left differ. [M31] | Exact identity and abstention are useful design requirements, even in this small category. |
| VERIFIED FACT / INFERENCE | Extension distribution, affiliate behavior and data handling have policy constraints; free infrastructure has finite limits. [T10–T19] | Zero ongoing prototype cash is plausible. A public sustainable startup is still unproven. |

See [market](01-market-and-competition.md), [access](02-data-access.md), [security](08-security-privacy-policy.md) and [costs](10-business-and-costs.md) for evidence and caveats. Repeated citations here identify decisions rather than independently verifying them.

## Why this segment and category

Wireless mice offer a bounded identity problem that suits desktop shopping: manufacturer model, size, handedness, color, regional pack, included receiver, condition and warranty. They avoid handset PTA and laptop configuration complexity in the first experiment. This is an **INFERENCE about tractability**, not proof of attractive purchase frequency or margins. Lower order values, modest savings and infrequent replacement are serious disadvantages.

The preferred wedge is **an evidence notebook**, not prediction, coupons or an exhaustive catalog. Its potential advantage is making uncertainty explicit at the moment of comparison. It becomes defensible only if a permission-backed dataset, corrections process and measured matching quality develop. The initial interface itself is easy to copy.

The first experiment must be allowed to reject this choice. If shoppers complete their comparison faster with ordinary tabs or an existing service, or cannot explain a meaningful improvement from the notebook, stop expanding the extension. A permission-backed merchant offer explainer is a possible narrower pivot; building a website for everyone is not an automatic replacement.

## Smallest honest release ladder

| Stage | What a user can actually receive | Entry gate |
| --- | --- | --- |
| **P0 — founder prototype** | One popup; manually enter an offer; see complete versus incomplete costs; compare up to three user-confirmed variants; save personal observations; export/delete. Synthetic examples are labeled. | A later explicit instruction to implement the documented private slice. No retailer integration assumed. |
| **P1 — permission-backed private pilot** | The same core experience with the specific merchant data/reader method actually licensed. One merchant supports its offers and licensed observations. | Written source grant, cleared sample fixtures, observed value, narrow permission and privacy decisions, controlled distribution. |
| **P2 — public MVP** | Only the bounded capabilities whose value and release gates passed. A one-merchant explainer is possible; cross-store comparison additionally needs two independently eligible merchant/source integrations with exact overlap. | Source, accuracy, user-value, store/privacy/security, operations and cash gates all pass. |

P0 has no network data acquisition, notification scheduling, accounts or affiliate behavior. It has a saved-offer shortlist, not a promised automatic watch service. P1 uses a permitted local reader or founder-reviewed merchant material for research/manual entry. It has no customer file-import feature or hosted ingestion. A hosted catalog/feed service is conditional P2. None of these stages has been implemented in this research run.

## Three launch blockers

1. **Data access and overlap:** no agreement gives this project the required fields, collection method, cache/history/republication rights, cadence and termination treatment. Cross-store claims need two independently eligible merchant/source integrations with genuinely overlapping variants; two sellers on one marketplace do not establish that condition.
2. **User value and trust:** no qualified shopper has completed a task with this product. Install friction, manual effort, precision, repeat use on another purchase occasion and willingness to pay are unknown.
3. **Public release and economics:** the actual data-protection design, Chrome review readiness, measured resource use and sustainable revenue are unresolved. A new publisher also has a verified USD 5 registration fee; founder payment feasibility is untested. [T14–T15]

These are blocking conditions, not a request to build larger infrastructure in anticipation of them.

## First test and decision rules

Run the [12-task study](09-validation-and-growth.md) against normal shopping behavior using synthetic or permission-cleared material. Record whether each participant understands the exact model, known cost, unknowns and evidence age. Do not ask whether they like the startup idea before observing their task.

Suggested hypotheses are at least 8/12 useful, accurate outcomes with no critical false-equivalence and a 25% paired median time reduction if quality is preserved. They are screening thresholds for a tiny sample, not population estimates. Measure real repeat use only among participants who encounter another relevant shopping occasion.

In parallel, prepare a 20–40-SKU, 30-day permission request to one category-relevant merchant. Do not send it in this run. One cooperative merchant tests data feasibility; a second overlapping source tests comparison coverage. No inferred or remembered affiliate rate belongs in the budget.

## First five founder actions

1. Review this proposed scope and decide whether the narrow wireless-mouse experiment is worth pursuing.
2. Use the interview and task script to recruit actual desktop purchasers; record the baseline and installation objections.
3. Review and personally authorize the unsent merchant request in [data access](02-data-access.md); secure explicit rights before adapter work.
4. If proceeding with software, run [foundation](../prompts/01-foundation.md) in a new implementation task, then domain fixtures and the manual popup slice. No live retailer code is a prerequisite.
5. At the end of the first study, choose continue, narrow, pivot or stop from observed outcomes and access evidence. Unlock later prompts only when their stated gates pass.

## What is still unknown

Reachable qualified shoppers, their purchase cadence, extension trust, useful time/savings improvement, merchant cooperation, total feed costs, approved affiliate economics, actual public storage protection, installed behavior and jurisdiction-specific legal review. These are tracked in [risks](14-risks-and-open-questions.md). Desk research does not validate the startup.
