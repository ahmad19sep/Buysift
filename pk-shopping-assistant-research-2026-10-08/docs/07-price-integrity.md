# Price integrity and matching

**Status: PROPOSED integrity policy with subsequent synthetic implementation evidence, not measured product performance.** Stage 02 implemented these rules and matched all 120 authored development fixtures; the sealed 80-case holdout and real merchant performance remain unexecuted. See the [domain report](research/test-results/2026-10-08-domain-and-fixtures.md). Sources: manufacturer identity [M31], retrieved retailer context [M30], data rights [D01–D09] and bounded public observations [R01–R06]. See [contracts](06-data-and-api-contracts.md) for data shapes and [tests](11-testing-and-operations.md) for execution gates.

## A correct answer can be an abstention

The product should prefer “These offers cannot yet be compared fairly” to an unjustified cheapest result. Correctness has four independent dimensions: identity, commercial conditions, current availability and evidence provenance/time. A high-confidence identity is not a current stock check; a recent retrieval is not a license; a low item price is not a complete delivered cost.

P0 labels everything as manually entered or synthetic. It can validate its own arithmetic and show discrepancies in entered fields, but cannot independently verify the truth of those entries. Never relabel a user-confirmed pair as a merchant-verified exact match.

## Matching pipeline

1. **Normalize without erasing distinctions.** Unicode/whitespace/case normalization for matching; retain original codes. Keep digits, suffixes, size and handedness. Separate retailer SKU, listing ID, manufacturer part number and GTIN.
2. **Create candidates conservatively.** Within the category and brand, use explicitly identified model/MPN candidates. Similar titles are a retrieval aid, never sufficient identity evidence. A search page may show related products legitimately; do not treat search relevance as an exact-comparison guarantee.
3. **Apply intrinsic incompatibilities.** Different model/MPN, size, handedness, required receiver/pack or incompatible region yields different identity. Color differences remain distinct unless a later clearly labeled user choice asks to inspect alternatives; that choice does not rewrite history.
4. **Require evidence for remaining fields.** Manufacturer evidence plus mapped retailer selection data can justify a reviewed exact identity. Missing/contradictory evidence yields `insufficient_evidence`. No opaque numerical confidence score is needed in P0.
5. **Evaluate core terms separately.** Condition, warranty provider/type/duration/scope and eligibility must be equivalent under the selected policy, with evidence tied to the identified seller. Different sellers may supply equivalent offers; seller names need not match. Record `coreTerms` independently from intrinsic `identity`. Missing decisive term evidence yields insufficient evidence; conflicting terms yield different terms.
6. **Derive the benchmark class.** `comparable` requires both identity and core terms to be same; any established incompatibility yields `mismatch`; otherwise use `insufficient_evidence`. This class does not depend on shipping or stock. Record evidence, reasons, rule version and reviewer where applicable.
7. **Evaluate ranking eligibility.** Separately check availability, price basis, delivery/location/payment scope, component completeness and freshness. Unknown shipping can preserve a comparable variant/terms result while blocking delivered-price ranking. Preserve the provisional/manual flag independently of all these decisions.

Example taxonomy: Logitech distinguishes M650 from the larger M650 L and a left-handed variant [M31]. A code printed as a retailer SKU is not proof of a manufacturer code. This is why mappings must cite where the identity was established, rather than reverse-engineer certainty from a title.

## Provenance and evidence quality

| Source kind | What it establishes | Allowed use |
| --- | --- | --- |
| Synthetic fixture | Owned invented test fact, with no market evidentiary value | Tests and prominently marked demos only |
| Private manual entry | What the user recorded at a stated time | Private notebook/provisional comparison; no public facts |
| Licensed visible-page observation | The selected allowed page context as observed, subject to parser correctness | Only the merchant-granted local/public uses |
| Merchant feed | The fields and time semantics supplied under an active agreement | Licensed cache/history/republication scope only |
| Untrusted client upload | A claim that may be false or unauthorized | No ingestion in current scope; future quarantine design required |

Source agreements need lineage through each observation and derived summary. “Derived” does not remove licensing or privacy restrictions. Exclude personalized/member/card-only prices from the public general-price dataset. A user may keep a conditional amount privately with its condition visibly attached.

## Price components and fair ordering

For eligible amounts in one currency and location/payment context:

**Delivered total = advertised payable item amount + shipping + additional tax + all mandatory fees − a separately evidenced additional unconditional discount not already included.**

The displayed payable item amount already contains any merchant markdown. An offer reduced from PKR 8,000 to PKR 7,000 enters the formula as PKR 7,000; its PKR 1,000 markdown must not be subtracted again. An additional discount needs separate evidence and explicit non-inclusion in the item amount. An unknown or card-dependent discount cannot lower a general public total. A complete mandatory-fee list is required, including COD, handling and payment charges where applicable; a known zero COD charge does not resolve unknown handling fees.

This formula produces a delivered total only if all required components are known and eligibility matches. Otherwise return an incomplete known subtotal and the missing component names. A tax-included item has explicitly zero additional tax; an unspecified tax field is not automatically zero. A free-delivery banner does not establish free delivery to every region or for every basket.

Synthetic examples:

| Offer | Entered facts | Correct conclusion |
| --- | --- | --- |
| A | Item PKR 7,000; shipping unknown | PKR 7,000 plus unknown delivery; no delivered ranking |
| B | Payable item PKR 6,850; shipping PKR 300; tax included; all required fees and additional discount explicitly none; location/payment context confirmed | PKR 7,150 delivered for that confirmed context |
| C | PKR 6,500 only for a specified card; card eligibility unknown | Conditional amount, not generally available lowest price |
| D | Item PKR 6,400; out of stock | Historical/unavailable offer; excluded from cheapest available set |

Do not say A saves PKR 150 against B until A's missing components and the equivalent warranty/condition are resolved. Do not treat a monthly installment as the full item price. Do not rank offers by commission. The initially supported currency is PKR; currency conversion and international duty calculations are out of scope.

## Stock and time

Use four states: in stock, out of stock, preorder and unknown. A enabled purchase button by itself is not authoritative stock evidence. Preserve the source's explicit availability statement and the time it was observed. The public audit's mixed outcomes motivate a separate availability dimension; they do not establish a general competitor error rate.

For the proposed twice-daily licensed source, classify evidence age as fresh at <=24 hours, delayed above 24 through 72 hours and stale above 72 hours. These are **initial policy hypotheses**, not source SLAs or demonstrated accuracy. At any age, unknown/contradictory stock prevents a confident “available cheapest” claim. An out-of-stock result never becomes in stock because a refresh failed.

Manual entries are labeled “Recorded [time] — not automatically checked,” without a public fresh/verified badge. Unknown source-generation semantics yields unknown freshness. Browser fetch/response time, cache time and last successful source observation must remain separate. A repeated old feed snapshot cannot reset observation age merely because HTTP returned 200.

## Real history, sparse data and gaps

History starts with the first legitimate observation. Never backfill from a crossed-out price, synthesize past dates, interpolate missing observations, or label an observed range as the all-time market history. Retain unchanged valid observations when they independently establish coverage; deduplicate retries of the same observation, not all repeated prices.

Show both raw accepted-observation count and comparable daily-sample count. For a daily summary, take the latest accepted observation in each Asia/Karachi calendar day for the same offer, variant revision, warranty/eligibility and price basis. This prevents heavily checked days dominating a daily median. Keep raw rows inspectable. The active interval is rolling `[now − 90×24h, now]`, inclusive, or a shorter licensed server window. Any future timestamp is excluded; more than five minutes ahead also triggers a clock/error state. Tests use an injected clock.

No data: no history. One day: show the point and say more observations are needed. For 2–6 distinct days, show factual points/minimum with the narrow sample label, not “good time to buy.” Any future price assessment requires at least seven comparable days spanning at least 14 days as an initial product gate; passing that gate still does not justify prediction or a market-wide value judgment.

If a numerical descriptive assessment is useful later, expose the calculation explicitly. For example, percentage difference from the median of the selected daily item-price samples is `(current − median) / median × 100`, with nonzero median, sample count, date range and current evidence time. Call this a comparison with recorded samples, not a forecast, bargain guarantee or realized saving. P0 can omit this assessment entirely.

“Lowest in your 8 comparable daily samples, 8–29 October” is defensible for that sample. “Lowest ever” is not. If showing minimum over raw observations instead, label the denominator as raw comparable observations; do not mix a raw minimum with a daily-sample claim. Do not connect chart lines through unobserved days without clear gap markings. A list is adequate in the first popup.

## Change, deduplication and correction rules

| Event | Required treatment |
| --- | --- |
| Save retry with same operation ID | Return the existing observation; do not add a point |
| Later confirmed observation with unchanged amount | May add evidence coverage; preserve actual observation time |
| Feed retry within same collection slot | Idempotent ingest; preserve source revision/time |
| Multiple genuine within-slot changes | Document retained revisions/corrections; recost a higher-frequency design before broadening |
| Selected size/handedness/condition changes | New offer context/variant history; no silent series merge |
| Incorrect parse found | Quarantine or mark corrected; link replacement and reason; recompute affected summaries |
| Product mapping merge/split | Versioned auditable decision; retain old IDs and recompute only affected series |
| License expires/revokes | Stop collection/publication and purge/correct derivatives as required by the grant |
| Source unavailable or quota exhausted | Preserve dated valid records; create a gap; do not mark a failed check as fresh |

Unexpected price changes should trigger review/quarantine according to configured category rules, not accusations of fraud. A large drop can be genuine, a changed variant, an installment, a parser error or a conditional promotion. Any anomaly thresholds require calibration with labeled examples; do not hard-code an unexplained marketplace judgment.

## Matching benchmark and release interpretation

Create 200 labeled pairs: 80 comparable, 80 mismatch and 40 insufficient-evidence cases. The target is same intrinsic variant **and equivalent core offer terms**, including condition, warranty and eligibility. Identity, stock and complete-price ranking are separate inspectable outputs. Unknown shipping can block delivered ranking without changing a known variant match. Include separate price/stock assertions so the benchmark does not confuse those dimensions.

Split by manufacturer/model family into 120 development cases (48/48/24) and 80 sealed holdout cases (32/32/16). Related variants must not leak across groups. Include near-miss suffixes, size/handedness, region/pack, warranty, condition, missing identifiers, seller changes, installment/conditional prices and stock uncertainty. Routine `npm run benchmark` evaluates development only. `npm run benchmark:holdout` is an explicit post-rule-freeze evaluation with set/rule hashes; hide its labels from iterative reports. Once results inform tuning, the set is regression evidence and needs replacement for a new independent claim.

P0 fixtures are synthetic and labeled as such. A permission-backed pilot needs a separate labeled sample of real cleared offers; synthetic benchmark success is not real-market precision. Record the labeling rationale and evidence; have a second reviewer adjudicate disputed real pairs when possible. If the solo founder is the only labeler, state that limitation and do not claim independent validation.

Report exact-match precision as correctly labeled comparable pairs divided by all pairs the system asserts are comparable. Report mismatch errors, insufficient-evidence failures, abstention and coverage separately. Zero asserted comparisons gives undefined precision, not 100%. No critical false equivalence in the sealed holdout is a necessary proposed gate. With only 32 positive holdout labels it cannot demonstrate 99% real-world precision; no invented confidence interval or accuracy guarantee belongs on the store listing.

## Open integrity questions

Which manufacturer/merchant fields can actually be licensed; how many offers expose complete warranty/shipping; real refresh cadence; typical parser errors; the acceptable risk of false equivalence; and whether users understand the uncertainty labels. The cost model and pilot must be updated when those answers change. The current system has no measured matching performance.
