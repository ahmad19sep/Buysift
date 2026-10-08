# Domain and fixtures verification — 8 October 2026

**Outcome: stage 02 implemented; typecheck, 35 tests, the 120-case development benchmark and build passed. The 80-case holdout was not executed.**

The user requested “start” after Foundation was complete and stage 02 was identified as next. Work followed [prompt 02](../../../prompts/02-domain-and-fixtures.md). No storage/UI, retailer adapter or later implementation prompt was executed.

## Implemented scope

- `src/domain/types.ts`: contract-aligned Product, Variant, Retailer, Seller, Offer, immutable Observation, PriceComponents and AccessRecord types. Watch and Notification behavior remains deferred.
- `src/domain/validation.ts`: strict runtime boundaries for unknown input, exact keys, hostile prototypes, UUID references, evidence, immutable snapshot links/revisions, prices, local access declarations and public HTTPS product references. URLs reject credentials, local/private hosts and account/cart/checkout/payment paths; fragments and non-allowlisted query fields are removed without fetching the URL.
- `src/domain/provenance.ts`: versioned local-only manual/synthetic declarations and source-kind compatibility. These declarations grant no merchant or public rights.
- `src/domain/money.ts`: strict PKR parsing into safe integer minor units and honest known-subtotal/delivered-total calculations. Unknown delivery/tax/fees/discount/context remains unknown; conditional or already-included reductions never lower a general delivered total.
- `src/domain/comparison.ts`: separate identity, core-term and ranking decisions. Exact identifiers do not override model/size/handedness/color/region/receiver-pack conflicts. Similar names, retailer SKUs and matching unknowns never establish equivalence. Different evidenced sellers may remain comparable; unknown sellers, condition, warranty or eligibility cause abstention. Manual/synthetic results stay provisional.
- `src/domain/history.ts`: injected-clock UTC validation, inclusive rolling 90-day window, future/clock-error handling, idempotent operation IDs and latest-per-Asia/Karachi-day summaries with explicit gaps. Old input remains untouched and corrections/nonaccepted rows are excluded from active calculations.
- `src/domain/limits.ts`: 25 offers, 500 observations, three compared offers, 4 MiB warning, 5 MiB ceiling, 128 KiB recovery reserve, 90 days and PKR 100,000,000 minor units per component. Candidate-state checks permit a fitting existing-offer observation at 25 offers and keep unchanged export/data-reducing deletion available.
- `fixtures/synthetic/`: three clearly fictional `.invalid` examples with no market evidentiary value.
- `fixtures/benchmark/`: deterministic generator, frozen JSONL files, split metadata and methodology. All names/amounts are synthetic.
- `src/domain/benchmark.ts` / `scripts/benchmark.mjs`: runtime fixture validation, conversion to the actual comparison contract, frozen-hash verification and three-class reporting. The routine command selects only `development.jsonl`.
- `tests/domain/`: independent assertions for hostile objects and URLs, money/currency/overflow, unknown components, identity/core terms, stock/ranking, provenance, observation snapshot integrity, counts/bytes, duplicate operations, time boundaries, Karachi days/gaps and fixture separation.
- `package.json`: explicit `benchmark` and `benchmark:holdout` commands. The existing lockfile and dependencies did not change.

The domain layer imports no browser API or network client. No retailer page, account or service was accessed. No fuzzy matching, forecast, AI call, Watch/Notification behavior or merchant permission was invented.

## Verification environment and commands

Final verification used the same checked environment as Foundation: Windows 11 Pro 10.0.26200 x64, Node 24.19.0, npm 11.17.0 and TypeScript 7.0.2. The dependency set and lockfile remained unchanged. Record timestamp: **8 October 2026, 14:38:12.677 Asia/Karachi** (`2026-10-08T09:38:12.677Z`). Individual command start timestamps were not captured.

| Command / check | Outcome |
| --- | --- |
| `npm.cmd run typecheck` | PASSED; browser source plus all domain/tests typechecked |
| `npm.cmd test` | PASSED; 35 tests, 0 failed/skipped/cancelled: 4 package-policy plus 31 domain/fixture tests |
| `npm.cmd run benchmark` | PASSED; 120 synthetic development cases, no misclassifications or critical false positives |
| `npm.cmd run build` | PASSED; private four-file Chrome 155 popup artifact rebuilt |
| Domain/static network-mechanism scan | PASSED; no browser/network client in `src/domain`; unsafe URL strings occur only as rejection tests |
| Fixture freeze/separation checks | PASSED; exact counts, hashes and disjoint declared family lists; routine path did not parse/evaluate holdout labels |
| Documentation links and recorded corpus hash | PASSED; 254 local links across 35 Markdown files resolved and the report hash matched |
| `npm.cmd run benchmark:holdout` | **NOT EXECUTED**; explicit post-freeze gate remains sealed |

The 35 test count includes five fixture-policy tests, six comparison tests, four history tests, four limit tests, six money tests, six validation/provenance tests and the four existing Foundation package-policy tests.

## Development benchmark result

Population: **synthetic authored cases only**. One coding agent authored the fixtures and rules, so labels are not independently adjudicated. Passing proves rule/fixture consistency, not merchant-data quality or market accuracy.

| Expected \ predicted | Comparable | Mismatch | Insufficient evidence |
| --- | ---: | ---: | ---: |
| Comparable | 48 | 0 | 0 |
| Mismatch | 0 | 48 | 0 |
| Insufficient evidence | 0 | 0 | 24 |

- Predicted-comparable precision: **48/48** within the synthetic development set.
- Comparable recall: **48/48** within the synthetic development set.
- Classified coverage: **96/120**; abstention: **24/120**.
- Delivered-ranking eligible: **24/120**. Unknown shipping and unavailable stock remain separate ranking gates.
- Critical false positives: **0**; all misclassifications: **0**.

Development SHA256: `f36e755eb50ac2f2c630ecd559331a6625e6bd6998aa246801737b279a22c10f`.

The frozen holdout contains 80 opaque records according to its line count and metadata, with SHA256 `e9fc1279ccbb5fa68c4e8ee711cc136fb3c3e604f048ad50a5cd08e1c071ab70`. Routine tests checked those bytes and did not parse the holdout labels. Its stated 32/32/16 composition and 16 family list come from the authored split metadata, not an executed evaluation.

## Reproducibility identity

The implementation corpus covers 25 files and 408,495 bytes across `package.json`, `scripts/benchmark.mjs`, `src/domain/`, `tests/domain/`, `fixtures/benchmark/` and `fixtures/synthetic/`.

Corpus SHA256: `13a65abb43cb55aae5227ba8f4f845600292e9c54309e70b55a6b09c87c7ff71`. Reproduce by sorting workspace-relative paths lexically, then hashing each UTF-8 path, a NUL byte, exact file bytes and a NUL byte in sequence.

The unpacked extension artifact remained `7ec2966a5c4c156d0366dcb0a548910e334dbf15a7b831950ff8b172cf294eb0` because the stage does not wire domain code into the popup. Lockfile SHA256 remained `0a49f8f1e77282e3304a4b3c171676723213593844721a5660d9428a778cd4c7`.

## Limitations and next milestone

**NOT EXECUTED:** sealed-holdout evaluation, merchant/permission-cleared benchmark, second-reviewer labeling, browser installation, popup/domain integration, persistent storage, migrations/recovery, consent, entry forms, export/deletion, accessibility, performance, runtime network observation, deployment or publication.

The 100% development ratios cannot be reported as 99% real-market accuracy, general reliability, customer value or retailer coverage. Input validation and static tests are not a security certification. History functions operate on validated in-memory observations; no storage durability is claimed.

Next eligible implementation: [03 — Local extension slice](../../../prompts/03-local-extension-slice.md). It may implement local envelopes, acknowledged writes, draft recovery and manual entry using these rules. Stage 03 was not started in this turn.
