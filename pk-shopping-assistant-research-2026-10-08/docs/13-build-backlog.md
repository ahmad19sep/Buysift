# Ordered build backlog

**Research date:** 8 October 2026. **Status:** proposed backlog with subsequent implementation update. B01–B03 were completed after separate implementation requests; B04 is the next local task. “Ready” in the original backlog means specification prerequisites are available, not permission to execute later work.

Read [product scope](03-product-requirements.md), [architecture](05-architecture.md), [contracts](06-data-and-api-contracts.md), [integrity](07-price-integrity.md) and [testing](11-testing-and-operations.md) together. If they conflict, resolve the conflict in documentation before implementing dependent behavior.

## 1. Working boundaries

P0 is a single-window founder prototype: one popup, manual facts and synthetic fixtures, local storage only. Caps: 25 offers, 500 observations, three compared offers, 4 MiB warning and 5 MiB hard limit. The 90-day active history window excludes older records from current summaries; records remain until explicit deletion and count toward caps. Reject the excess offer/observation being added, not every save. Existing-offer observations and metadata fixes remain possible when their post-write counts/bytes fit; export and data-reducing deletion remain available.

P1 needs an eligible local reader or a human-reviewed merchant-file research/manual-entry study; no customer import or hosted API. P2 needs measured user value plus data, privacy, store, cost and operational gates. A one-merchant explainer may qualify; cross-store functionality additionally needs two independent eligible merchant/source integrations. No Watch or Notification feature, account, production AI, affiliate behavior, remote page fetch or browser reader is hidden in P0 tasks.

Effort ranges are planning assumptions for a solo developer after prerequisites are resolved; they exclude waiting for agreements, reviews and users. Split a task that exceeds two focused days.

## 2. P0 tasks

| ID / task | Depends on | Concrete output | Acceptance / stop condition | Estimate |
|---|---|---|---|---|
| B01 — Inspect and establish foundation | New implementation instruction | `package.json`, exact lockfile, compiler/build configuration, `scripts/build.mjs` | Node/tool provenance recorded; typecheck/test/build scripts real; no remote permission or service | 0.5–1 day |
| B02 — Define domain invariants | B01 | `src/domain/`, unit tests | Money, identity, provenance and unknown-field rules enforce contracts; no browser/HTTP imports | 0.5–1 day |
| B03 — Freeze fixture benchmark | B02 | `fixtures/synthetic/`, `fixtures/benchmark/`, evaluator | 120 development cases in routine script; separate explicit 80-case post-freeze holdout run; no family leakage or market claims | 0.5–1.5 days |
| B04 — Persist local notebook | B02 | `src/storage/`, synthetic recovery tests | Exact caps; honest save acknowledgment; corruption/quota failures preserve valid data; no CAS claims | 0.5–1.5 days |
| B05 — Build popup entry flow | B04 | `src/ui/popup/`, packaged manifest/assets | Manual input and draft recovery; one popup; storage permission only; error/focus behavior reviewable | 0.5–1.5 days |
| B06 — Compare provisional manual offers | B03, B05 | Popup comparison using shared domain rules | Select at most three; display evidence gaps; abstain on material ambiguity; no unearned cheapest claim | 0.5–1 day |
| B07 — Show saved observations | B03, B05 | Local history summary/list | Zero/sparse/gapped data honest; 90-day scope and observation count visible; no fabricated prior history | 0.5–1 day |
| B08 — Complete export/deletion | B04, B05 | User-controlled JSON export and local deletion flow | Acknowledge observable export milestone; verify deletion/cancel; no silent eviction or remote-deletion claim | 0.5–1 day |
| B09 — Verify private prototype | B06–B08 | Build artifact, test report, known-limits list | Actual checks; frozen-rule holdout gate explicitly invoked; repeats labeled regression; pending browser tests identified | 0.5–1.5 days |

**Cut line:** complete B01–B09 before adding data acquisition. A screenshot is not completion of B09. If installation friction, field burden or comparison usefulness cannot be tested within this slice, document what failed and narrow the experiment before adding infrastructure.

B01–B03 map to prompts 01–02. B04–B06/B08 map to prompt 03. B07 maps to prompt 06's local lane. B09 maps to prompt 08's private lane.

## 3. Source and pilot gates

| ID / task | Depends on | Concrete output | Acceptance / stop condition |
|---|---|---|---|
| B10 — Qualify one merchant | Founder obtains appropriate written grant | Dated access record covering method, fields, reuse, retention, expiry and attribution | No implied permission from robots, affiliate signup or an accessible page; stop if grant is absent |
| B11 — Add one eligible reader | B09–B10; reader specifically covered | `src/adapters/`, minimal worker only if needed, permission-cleared fixtures | Bundled logic; explicit user gesture; exact origin/path allowlist; parser/permission/hostile-message tests |
| B12 — Run a private partner pilot | B11 or a cleared human-reviewed merchant-file/manual-entry study | Consented tasks and evidence/correction logs; no hosted API or customer import | Report actual outcomes and denominator; one source cannot claim cross-store comparison |
| B13 — Establish cross-store eligibility | Two independent eligible merchant/source integrations, not two sellers in one marketplace | Reviewed exact overlapping variants and access lineage | Stop comparison claims if identity, terms, freshness or grant is insufficient |

B10 is presently **BLOCKED**; no retailer grant was demonstrated. B11 must not fall back from an approved feed to unauthorized page extraction. B12 is fieldwork, not a code task that an agent can mark passed. Effort depends on actual permitted fixtures; do not promise a parser delivery date before seeing them.

## 4. Optional service and public release

| ID / task | Depends on | Concrete output | Acceptance / stop condition |
|---|---|---|---|
| B14 — Prove a service is necessary | B12 evidence and eligible feed terms | Written benefit/cost decision | Keep local design if service adds no tested user value |
| B15 — Build bounded feed service locally | B14; explicit backend instruction | `backend/`, schema, licensed feed fixtures, canonical-ID read API | No URL proxy, public writes, accounts or notebook uploads; CPU/row/storage measurement; quotas and gaps tested |
| B16 — Prepare public release | B09, applicable B10–B15, validated user value | Store package, disclosures, operator/support identity, release/restore record | Resolve at-rest protection, publisher fee, permissions, rights, support and zero-cash degradation plan |
| B17 — Publish or deploy | Reviewable B16 package and explicit founder approval | Actual authorized submission/deployment record | Never treat a prepared package or requested review as publication approval |

B15 is currently **BLOCKED**, and need not exist for a local product. A second backend, paid API or sharding scheme is not a fallback when Free quotas fail. Reduce scope/cadence or stop.

B16 may create private review drafts without publishing them. Any public statement about coverage, savings, user counts or accuracy requires its corresponding evidence. Source-policy requirements and cost facts are in docs 08/10; recheck them before external action.

## 5. Deferred work

B18 — alerts: execute prompt 07 only after a new scope decision, eligible fresh data and explicit implementation instruction. Start with an honest user-triggered in-browser recheck notice; distinguish it from a scheduled reminder. Browser-closed email/push delivery needs a separate design, provider qualification, budget, consent and operations gate.

Premium billing, affiliate links, mobile companion, additional categories/countries, coupons, forecasts and merchant intelligence are outside this backlog's implementation authorization. Add one only when validation supplies a reason and its own data/policy dependencies are resolved.

After each task, update `docs/research/progress.md` with changed files, executed commands, outcomes, remaining blockers and the next eligible task. Do not automatically advance through blocked prompts.

