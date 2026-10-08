# Testing and operations

**Research date:** 8 October 2026. **Original status:** test specification. **Subsequent implementation update:** stages 01–02 ran package/domain tests and the synthetic development benchmark; installed-browser tests, sealed holdout, deployments and restorations remain unexecuted. See the [foundation](research/test-results/2026-10-08-foundation.md) and [domain](research/test-results/2026-10-08-domain-and-fixtures.md) reports. Thresholds below remain planning hypotheses unless those reports state an actual result. Sources establish platform constraints, not test results.

## 1. Test stages and evidence

P0 is a private manual/synthetic founder prototype. P1 uses an eligible local reader or human-reviewed merchant file for research/manual entry, without a customer import UI or hosted API. P2 is public distribution after the release gates; one eligible merchant may support an offer explainer, while cross-store results need two independent merchant/source integrations.

Every run records commit/build hash, dependency lock hash, OS, exact Chrome and Node versions, fixture provenance, command, start time, outcome and failures. “Not executed,” “blocked,” “failed” and “passed” are distinct. A passing typecheck does not mean a browser interaction works; a successful browser task does not establish source rights.

Establish these scripts in the foundation and domain stages:

| Script contract | Responsibility |
|---|---|
| `npm run typecheck` | Compiler checks without emitting the release bundle |
| `npm test` | Compile domain/tests to JavaScript; run `node:test` |
| `npm run build` | Produce the unpacked MV3 package with esbuild and packaged assets |
| `npm run benchmark` | Added in stage 02; evaluate only the 120 development pairs |
| `npm run benchmark:holdout` | Explicit invocation after rule freeze; evaluate the 80 holdout pairs; never called by routine tests |
| `npm run test:fixtures` | Added when eligible adapter fixtures exist; no live HTTP |

Node 24 documents a stable test runner; esbuild does not check TypeScript types [T29, T33]. If tests inspect `dist/`, their script builds it first. Commands are proposals until scripts exist; an empty suite is not a pass. Reports under `docs/research/test-results/` exclude credentials and real browsing histories.

## 2. Required functional matrix

| Area | Cases | Required result |
|---|---|---|
| Money | Zero, negative, fractional minor units, grouping, overflow, PKR, incompatible currencies | Item price positive; shipping zero only when explicitly free; invalid amounts rejected |
| Notice/consent | Accept, decline, interrupted consent write | No shopping records before confirmed acceptance; declining leaves no shopping data |
| Offer identity | Same title/different SKU; size, handedness, region, condition, warranty conflicts | No merge based on title similarity; explain mismatch or missing evidence |
| Price components | Delivery unknown, tax included, coupon/member/card conditions | Unknown stays unknown; conditional prices never become universal totals |
| Manual data | Edited seller/model, wrong currency, duplicate save, backdated entry | Explicit source and times; edits do not rewrite old evidence as if originally known |
| Comparison | Zero to three selected records; attempted fourth; missing identity/cost | Provisional manual comparison; enforce three-offer cap; no definitive cheapest claim without evidence |
| Observation history | None, one, duplicate, sparse, future time, correction, gaps | No fabricated past; separate raw counts/daily samples; preserve gaps and provenance |
| Active window | Exactly 90 days, older records, timezone/day boundaries | UTC instants; Asia/Karachi daily buckets; older records excluded from current summary but retained until explicit deletion |
| Capacity | 25/26 offers; 500/501 observations; existing-offer save at 25; 4/5 MiB | Reject only excess entity additions or byte growth; allow fitting metadata fixes, export and data-reducing deletion |
| Storage | Quota rejection, invalid schema, interrupted migration, malformed stored records | Recover or expose readable failure; no automatic clearing |
| Popup lifetime | Close after acknowledged save; close during pending save; reopen | Restore confirmed state; never claim every last keystroke survives |
| Deletion/export | One/all records, cancel, failed write, generated export | Correct scope; verify local state; “Download requested” unless file completion is observable |
| Offline | Entire P0 flow with network disabled | Local functions work; retailer navigation can fail normally without corrupting notebook |

P0 supports one editing window. Simultaneous editing across browser windows is a documented limitation, not a passing concurrency test. If pilot tasks require concurrency, resolve storage coordination before claiming it works.

## 3. Matching benchmark

Create **200 labeled pairs**, using synthetic data first and permission-cleared merchant cases only after access qualification. Maintain separate provenance and result tables for those populations; never describe synthetic performance as market accuracy.

Suggested composition: 80 truly equivalent pairs, 80 hard mismatches and 40 insufficient-evidence pairs. Split by manufacturer/model family into **120 development pairs and 80 sealed holdout pairs**, with no same model appearing in both sets. Suggested stratification is 48/48/24 development and 32/32/16 holdout; preserve class balance without breaking the family boundary.

Each pair includes IDs, source, normalized facts, expected class, evidence and rationale. The classes `comparable`, `mismatch`, `insufficient_evidence` assess the same intrinsic variant and equivalent core offer terms: condition, warranty and eligibility. Include model/size/handedness/receiver near-misses and missing identifiers. Stock, shipping and delivered-price eligibility are separate outputs/tests; unknown shipping alone must not silently change this benchmark's target. Manual evidence remains provisional independently.

Freeze fixture hashes before tuning. Routine `npm run benchmark` reads only the 120 development cases. Keep the 80 holdout labels in a separate artifact, excluded from routine test/report paths. After the rules/build are frozen, explicitly invoke `npm run benchmark:holdout`; record both hashes and the evaluation decision. A second reviewer or custodian should preserve separation where available. Disclose limited independence when one founder/agent creates all synthetic cases. Repeated holdout runs are regression evidence, not new independent validation; after results inform a fix, require a new holdout for an independent claim.

Report the confusion matrix, predicted-comparable precision denominator, coverage/recall, abstention and critical false positives. A critical false positive asserts the same variant/core terms despite a material identity, condition, warranty or eligibility conflict. Test availability and delivered-price ranking separately.

**Gate:** zero critical false positives on the holdout, plus review of every other misclassification. This is necessary, not sufficient. Even zero failures in 80 holdout pairs does not establish 99% real-market precision. Report denominators, source mix and annotation uncertainty beside every percentage.

## 4. Browser, security and accessibility checks

Inspect the built artifact, not just source files: P0 permission set is `storage` only, host scopes empty, no content script/background worker, no remote script or external connection capability. Verify there is no collection initiated by the extension during local workflows; distinguish normal Chrome traffic and explicit retailer navigation from extension-originated requests.

Test hostile strings, oversized objects, dangerous URL schemes, credential-bearing URLs, prototype-pollution keys and HTML-like input. No source content becomes executable markup. Verify trusted-context storage access. Future P1 tests cover denied/revoked access, unsupported/restricted pages, changed document IDs, forged messages, multiple frames, missing selectors and variant/seller changes. Chrome documents content-script trust and worker-lifetime constraints [T01, T38].

Target WCAG 2.2 AA [T32]. Test complete keyboard operation, focus order/visibility, labels, announced errors/status, non-color meaning, contrast, 200% text zoom and narrow-width reflow. Record a screen-reader/browser combination actually exercised. Automated checks supplement manual tasks; passing them is not a conformance certification.

Suggested performance targets: interactive popup within 300 ms at the 95th percentile over 20 warm opens; acknowledged save within 300 ms for a valid capped notebook; no long main-thread task above 100 ms during ordinary typing. Use a recorded four-logical-core/8 GB laptop or a documented comparable environment, current stable Chrome and a clean test profile. Run offline for P0. These are initial budgets, not measurements or minimum system requirements.

## 5. Conditional backend and alert tests

Only after approved access and explicit implementation instructions: test canonical-ID validation, bounded pagination, stable cache/provenance fields, expiry, malicious input, request quotas and unavailable-service responses. The current API is read-only; no account, arbitrary URL fetch, observation-upload or private-watch endpoint should exist.

For ingestion, test revoked/expired grants, malformed feeds, duplicated batches, index write amplification, source outages and correction/merge audit trails. Measure actual CPU, response bytes, rows scanned/written and database size. Simulate quota errors without exhausting a shared production account. Free Workers and D1 impose distinct ceilings [T16–T18].

Alerts remain deferred. Their later tests must distinguish user-triggered recheck, scheduled local reminders and external delivery. Test duplicate suppression, stale observations, denied permission, missed alarms, worker restart, browser shutdown and unsubscribe before promising a notification. No closed-browser delivery exists in P0.

## 6. Release and incident operations

Maintain a short release record: scope, reviewed diff, lockfile, artifact hash, checks actually executed, open limitations and rollback compatibility. Keep synthetic fixtures clearly labeled in the private build. Publish only after source, consent, privacy, at-rest protection, operator identity, account security, support, fee and listing gates pass. Human approval is required for spending, third-party contact, deployment and publication.

| Incident | Immediate response | Recovery evidence |
|---|---|---|
| Adapter changes or denied access | Disable that source; keep manual use; show unavailable state | Updated permission-cleared fixtures and reviewed bundled adapter |
| Merchant outage/feed gap | Preserve last successful time and gaps; stop freshness claims | Successful authorized check with new timestamp; no backfilled fiction |
| Suspected poisoned price/match | Quarantine affected records and stop comparison/alert claims | Corrected lineage, reviewed labels and regression cases |
| Budget pressure | Stop ingestion before hard cap; serve honest stale/local state | Measured headroom and bounded restart; no automatic paid upgrade |
| Privacy/security leak | Stop affected transmission/feature; preserve minimal audit evidence; assess notification duties | Root-cause fix, secret rotation where needed and verified containment |
| Local corruption | Preserve recoverable data; offer export/recovery | Validated stored-data recovery; never “fix” by clearing storage silently |

Verify synthetic export values/provenance and migration recovery separately. Export preparation/download initiation does not prove the file was saved; deletion stays separately confirmed. User import/restore is deferred. A future D1 recovery test needs an isolated authorized environment and documented restoration; advertised recovery is not a tested backup.

Rollback must respect schema versions. Keep the previous known-good artifact and export data before incompatible migration. Store distribution rollback may require submitting a newly versioned release containing the safe code; do not assume an instant downgrading mechanism. Disable an eligible adapter through a reviewed release or a strictly bounded pre-existing feature switch, never a remotely supplied replacement parser [T12].

Suggested founder maintenance: review support/corrections weekly in a pilot, review grants and parser failures whenever a source changes, and inspect dependency advisories before releases. There is no 24/7 response promise. Record owner, impact, timestamps, containment, corrections and lessons in each incident report.

