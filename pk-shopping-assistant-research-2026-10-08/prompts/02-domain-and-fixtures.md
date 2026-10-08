# Prompt 02 — Implement domain rules and honest fixtures

**Current status:** completed on 8 October 2026 after prompt 01 and a separate implementation request. See the [verification report](../docs/research/test-results/2026-10-08-domain-and-fixtures.md). The instructions below remain the scope record; they do not authorize later stages.

Read project `AGENTS.md`, `docs/03-product-requirements.md`, `docs/05-architecture.md`, `docs/06-data-and-api-contracts.md`, `docs/07-price-integrity.md`, `docs/08-security-privacy-policy.md` and `docs/11-testing-and-operations.md`. Inspect the current foundation and retain its script/tool choices unless a documented incompatibility requires change.

## Prerequisites and exact scope

Verify `npm run typecheck`, `npm test` and `npm run build` exist. Establish any missing prerequisite rather than pretending the prior stage passed. Implement pure domain rules and fixtures only; keep browser storage, UI and network code outside this stage.

Use `src/domain/` for typed entities, runtime validators, money parsing, identity evidence, price components, comparability decisions, provenance and timestamp/window rules. Follow the contract's actual names and enums; do not create alternate parallel models. TypeScript types alone do not validate inputs.

Cover integer minor-unit amounts, currency incompatibility, unknown delivery/tax, condition, warranty/region, exact manufacturer model/SKU, mouse size/handedness and relevant bundle/connectivity differences. Preserve original evidence. Similar names or matching unknown values do not establish equivalence. User-confirmed manual pairs remain provisional; incomplete facts cannot support a definitive cheapest-equivalent claim.

Centralize proposed P0 limits: 25 offers, 500 observations, three comparisons, 4 MiB warning, 5 MiB hard cap and a 90-day active history window. Reject a 26th offer or 501st observation; permit fitting existing-offer observations/metadata fixes, export and data-reducing deletion. Old observations remain stored and count toward caps until deletion. Follow the contracts' interval, snapshots and reserved-space rules; inject a clock for boundary tests.

## Files and fixtures

Add relevant `tests/domain/*.test.ts`, `fixtures/synthetic/`, `fixtures/benchmark/development.jsonl`, `fixtures/benchmark/holdout.jsonl`, `fixtures/benchmark/splits.json`, `fixtures/benchmark/README.md` and `scripts/benchmark.mjs`. Label fixture provenance. Use fictional retailer identities and non-operational links; do not fabricate live prices, relationships or grants. The routine script must not read holdout labels.

Create 200 labeled pairs: 80 comparable, 80 mismatch, 40 insufficient evidence. Classes assess the same intrinsic variant and equivalent core offer terms: condition, warranty and eligibility. Stock, shipping and delivered-price eligibility have separate results/tests. Split 120 development/80 holdout by manufacturer/model family without leakage. Include rationales and near-misses; freeze hashes before tuning. Keep holdout labels out of iteration, disclose limited independence from a single author, and make no real-market accuracy claim.

## Acceptance and tests

Add `npm run benchmark` for only the 120 development cases and `npm run benchmark:holdout` for an explicit 80-case evaluation after rule freeze. Routine tests never invoke holdout. Reports include the confusion matrix, precision denominator, coverage/recall, abstention and critical false positives. Zero critical holdout false positives is necessary, not proof of 99% accuracy.

Unit tests must include malformed/hostile objects, unsafe URLs, money overflow, currencies, missing conditions, duplicate observations, future/backdated timestamps and 90-day boundaries. Tests assert business outcomes independently; do not merely mirror constants. Run typecheck, unit tests, benchmark and build. Report synthetic and merchant populations separately if merchant evidence is ever added.

## Stop conditions and non-goals

Stop when a contract conflicts with product/privacy rules or a fixture lacks usable rights/provenance. Do not retrieve retailer pages, fabricate permissions, upload observations, introduce fuzzy auto-matching, make forecasts or add an AI call. Watch and Notification types may exist in the specification; do not implement those features.

Save actual results under `docs/research/test-results/` and update progress. Do not run holdout automatically during this stage. Repeated holdout runs are regression evidence; after results inform a fix, require a new set for an independent claim. Continue only when requested.

