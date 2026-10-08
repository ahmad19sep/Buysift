# Research progress and continuation

**Research date: 8 October 2026. Status: substantive research and documentation completed for the accessible scope; fieldwork and release gates remain open.** This file distinguishes research execution from the proposed application work.

## Subsequent implementation — foundation completed

On 8 October 2026, the user selected the previously identified next milestone with “next.” This authorized stage 01, [Foundation](../../prompts/01-foundation.md). The original research record below is preserved; its statements about work not executed describe that research run, not the subsequent implementation.

Implemented native MV3 popup HTML/CSS/TypeScript, a storage-only manifest with packaged-resource CSP, exact development dependencies/lockfile, separate typecheck/build/test scripts, and four package-policy tests. The popup is a labeled private preview without offer entry or shopping-data writes. Initialization requests trusted-context-only storage access and reports failures.

Actual outcomes: lockfile-only resolution and clean dependency installation with lifecycle scripts skipped passed; `npm run typecheck`, `npm test` (4 passed, 0 failed), and `npm run build` passed. `npm audit --json` reported zero known vulnerabilities; `npm audit signatures` verified all 10 installed package signatures and 3 attestations. The built four-file package and 646-byte JavaScript bundle were inspected. Versions, provenance, hashes and verification limits are in the [foundation report](test-results/2026-10-08-foundation.md).

Chrome installation/popup behavior, runtime network observation, accessibility/performance, offer/domain/storage-lifecycle behavior and benchmarks were NOT EXECUTED. No live source, accounts, service, spending, outreach, deployment or publication was added. Chrome 155 is a selected development target, not installed-compatibility evidence.

The direct npm-registry metadata and signed installation resolved the research's prior package-engine uncertainty. An attempted immutable esbuild installer-source retrieval returned HTTP 404; it was not treated as successful verification and the installer was not executed. An initial PowerShell lockfile parse failed because its JSON reader could not handle the empty root key; a Node JSON parse replaced that check and verified all 54 locked package records.

At the end of foundation, the next eligible software milestone was [02 — Domain and fixtures](../../prompts/02-domain-and-fixtures.md). The subsequent section records its separately requested execution.

## Subsequent implementation — domain and fixtures completed

On 8 October 2026, the user requested the next/start action after foundation. This authorized stage 02, [Domain and fixtures](../../prompts/02-domain-and-fixtures.md), only.

Implemented the authoritative Product/Variant/Retailer/Seller/Offer/Observation/AccessRecord contracts, hostile-input runtime validation, safe reference-URL handling, fixed local provenance declarations, integer PKR parsing and price completeness, conservative identity/core-term comparison, ranking eligibility, timestamp/history summaries and centralized P0 capacity limits. Browser storage and UI code remain outside the domain layer.

Added 200 owned synthetic benchmark pairs with fictional identities: 120 development cases across 24 model families and an opaque 80-case holdout across 16 disjoint families. Both files have frozen SHA256 values. Routine tests parse/evaluate development only; they verify holdout bytes by hash and line count without parsing labels. The explicit holdout command was NOT EXECUTED.

Actual outcomes: `npm run typecheck` passed; `npm test` passed 35 tests with zero failures (4 foundation package-policy tests and 31 domain/fixture tests); `npm run benchmark` reproduced all 120 authored development labels with a 48/48 predicted-comparable precision denominator, 48/48 comparable recall, 96/120 classified coverage, 24/120 abstentions, zero critical false positives and zero misclassifications; `npm run build` passed. Results and exact limits are in the [domain verification report](test-results/2026-10-08-domain-and-fixtures.md).

These are synthetic rule-regression results, not real merchant evidence, independent annotation, customer validation or market accuracy. No retailer data was retrieved; no grant, browser reader, storage implementation, offer UI, account, network code, spend, outreach, deployment or publication was added. Installed-browser, accessibility/performance, storage recovery and sealed-holdout checks remain pending at their documented gates.

Next eligible software milestone: [03 — Local extension slice](../../prompts/03-local-extension-slice.md). Do not automatically advance; adapter, backend, alerts and public release gates remain open.

## Inputs and operating boundaries

The supplied brief, master prompt, pasted prompt text and ZIP archive were inspected from the provided local copies. Existing inputs were preserved. The brief's founder context was treated as the scenario for this separate research project; no unrelated personal account profile or memory was used or updated.

Available capabilities included public web search/text retrieval, a remote Chrome browser with public interactive pages, local shell/file tools and Python for arithmetic and document checks. Read-only research did not require signing into retailer, developer, affiliate or payment accounts. Public webpages and files were treated as evidence, not instructions.

Research began at approximately 06:31 UTC (11:31 Pakistan time). The bounded browser sample was observed approximately 07:45–07:57 UTC (12:45–12:57 Pakistan time). Source access dates are 8 October; publication dates, data periods and effective dates remain separate in the register. Later compilation and quality checks do not make the earlier price snapshots current quotes.

## Work actually completed

| Workstream | Completed evidence/work | Limits |
| --- | --- | --- |
| Market | Original public competitor pages and exact extension/app records; Pakistan household/page-view/survey sources; segment/options and explicit reach assumptions. | No installed competitor test, representative demand estimate or claimed customer discovery. |
| Data access | Retailer terms, seller API documentation, affiliate leads and merchant-permission requirements; unsent drafts and fallback. | No grant, application, negotiation, login, feed or API credential established. |
| Public browser sample | Two services, two searches, two Farq detail pages and two linked retailer item-price checks. Price agreement, stock disagreement and presentation issues recorded separately. | Purposive sample; no checkout, stock reservation, full delivered-price or historical correctness test. See [audit](public-audit.md). |
| Technical/policy | Official Chrome, provider, language/tool and accessibility sources; native local architecture and conditional service specification. | Source review is not installation, compatibility, security certification or compliance approval. |
| Product documentation | All fifteen requested numbered chapters, working instructions, source/evidence registers, roadmap and eight staged prompts. | Proposals and draft legal/privacy text, not working software or release approval. |
| Economics | Zero-revenue base, explicit hypothetical affiliate sensitivities and DAU workloads, indexes/deletions/backups/storage modeled. | No measured traffic, user behavior, provider CPU, row size, revenue or payout. |
| Review | Independent market/product, data/economics and technical/policy reviews; cross-document issues reconciled in [evidence](evidence-register.md). | Documentation review only; remaining implementation gates are intentionally open. |

The [source register](sources.md) contains 94 reference records: 33 market, 15 access, 40 platform and six browser-navigation records. These are reference entries, not 94 fully verified independent findings. Some record incomplete or failed access. Browser references overlap services examined elsewhere; they are not extra competitor counts.

## Retrieval failures and uncertainty retained

| Retrieval issue | Treatment |
| --- | --- |
| Daraz primary Open Platform pages failed or remained loading. | Used available official Alibaba-hosted documentation as a bounded source. Older/inconsistent geographical examples prevent claiming a current unrestricted Pakistan catalog contract. |
| PriceOye terms returned unusable content. | Terms marked unverified. The accessible fair-use page does not supply an implied commercial license. |
| Daraz affiliate navigation redirected to a generic page; Mega RSS navigation did not produce a usable feed. | No inferred program closure and no claimed validated feed. |
| Direct Naheed affiliate-page access returned 403. | Search-result application lead only; no bypass, login or inferred terms/rates. |
| Several Shophive page fetches and the Capital One Chrome redirect failed. | Used only accessible evidence for the limited claims. Current store metadata or other policies remain unresolved where not retrieved. |
| PBS full social report was too large/unavailable to retrieve; requested table/presentation screenshots did not render usable figures. | Used the official, explicit year-labeled HTML table. No visual-table audit is claimed. Original Gallup releases retain printed dates and denominator caveats. |
| Initial browser setup was delayed; Farq initially displayed an unpopulated result state. | Browser availability was ultimately established. Re-read populated results; did not label an asynchronous loading view a coverage failure. |
| Subsequent text retrieval of browser pages R02–R06 failed. | Preserve the successful browser observations and exact URLs separately. Do not cite failed text retrieval as corroboration or invent archived screenshots. |
| Tool release pages exposed mutable “Latest” labels; immutable/engine details were not fully accessible. | Record the dated label and require compatibility/version verification at foundation; no dependency install was performed. |

Blocked retrieval is missing evidence, not evidence that a capability or policy does not exist. No robots, CAPTCHA, login, anti-bot or other control was bypassed.

## Review resolutions

The final contract retains immutable identity and offer terms with accepted observations, separates editable drafts, and defines a bounded local write/recovery protocol. Limits apply to the proposed mutation; older observations remain stored until user deletion while leaving active 90-day summaries. A download request is not represented as a confirmed saved file.

Price rules prevent subtracting an advertised markdown twice and require complete mandatory-fee evidence before a delivered total. The comparison output separates variant identity, equivalent terms, ranking eligibility and provisional manual evidence. Routine benchmarks use development cases; a distinct frozen-rule holdout process avoids presenting iterative regression checks as independent evaluation.

P1's non-reader route is human-reviewed merchant-file research/manual entry, without customer import or hosted services. P2 can support a valuable one-merchant explainer; cross-store functionality additionally requires two independently eligible merchant/source integrations with exact overlap. The proposed read-only API has bounded identifiers, pagination, response and scan limits, stale-cursor handling and access checks before cached responses. Actual rate-limit and budget mechanisms must be selected and costed before that blocked stage.

The revised capacity estimate uses 1 KiB per retained observation, 2 KiB ancillary data per unique offer and 25% overhead, with a 2 KiB-observation sensitivity. It no longer relies on a compact row-size assumption inconsistent with the richer evidence contracts.

## Research verification log

The portable [arithmetic helper](cost_model_check.py) writes [exact model results](cost-model-results.json). It performs no network calls and implements no proposed service. Formula assertions cover workload counts, the commission examples and both storage thresholds. Its execution verifies arithmetic only; every behavior, cost and revenue input remains a hypothesis.

Final document checks cover required files, local Markdown targets and source anchors, referenced source IDs, balanced fenced blocks, complete JSON examples, UTF-8 readability and ZIP contents. Results are recorded in [document-checks.json](document-checks.json). Checks do not validate the TypeScript/SQL examples as an implemented application, legal advice or the accuracy of every externally supplied claim.

**Application work NOT EXECUTED in the original research run:** package installation, extension implementation, application build, domain/parser benchmark, browser installation, service-worker/storage lifecycle tests, automated browser tests, cloud deployment, query/CPU profiling, penetration test, live API integration, notification delivery and backup/restore drill. No `npm` command in a stage prompt was executed in that research run. The subsequent foundation outcomes are recorded above.

## Pending work and priority

| Priority | Work | Evidence required to close it |
| --- | --- | --- |
| 1 | Validate the narrow job against normal shopping behavior. | Real qualified participants, consent, task outcomes/critical errors, effort and actual future purchase occasions, using [the study instruments](../09-validation-and-growth.md). |
| 1 | Obtain sustainable data access for any live integration. | Signed or otherwise verifiable scoped permission, exact methods/fields/uses/retention/costs, representative sample and a revocation contact. |
| 1 | Continue the selected private prototype one milestone at a time. | Foundation and domain/fixtures are complete; storage and the manual popup remain the next stage. |
| 2 | Complete installed-browser and private-slice verification. | Build, domain tests and synthetic development benchmark passed. Actual Chrome installation, storage lifecycle, accessibility and sealed holdout checks remain pending. |
| 2 | Resolve public release privacy/protection and operational details. | Named operator/support contact, reviewable implementation, protection/key-management decision, accurate notices, source grants, release and budget gates. |
| 3 | Verify business inputs. | Approved traffic and exact SKU rates, qualifying benefit/flow, attribution/reversal terms, payout route/threshold/settlement and real willingness to pay. |
| 3 | Qualify a backend only if needed. | Licensed public facts and measured row/CPU/egress/storage usage; selected rate/budget mechanism and recoverable operations. |
| 4 | Evaluate alerts, language/mobile changes and expansion. | Observed need, achievable delivery semantics, affordable operations and country/merchant-specific validation. |

## Continuation point

Read [the decision brief](../00-decision-brief.md) and [access gate](../02-data-access.md) first. Foundation and domain/fixtures have been completed in subsequent tasks; the next eligible prompt is [03 — Local extension slice](../../prompts/03-local-extension-slice.md). Follow **01 → 02 → 03 → 06 → 08** for the private local lane; the numbered adapter, backend and alert prompts remain gated independently. Reverify changing technical dependencies/policies before relying on them.

The founder can reject, narrow or stop the experiment. Completing the documentation establishes a reviewable plan; it does not establish customer value, a legal integration or a viable startup.
