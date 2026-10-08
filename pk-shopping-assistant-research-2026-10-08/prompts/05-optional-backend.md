# Prompt 05 — Build a bounded licensed-feed backend

**Current status: BLOCKED and optional P2.** P0 needs no backend; P1's merchant-file research uses human review/manual entry, without customer import or hosting. Execute only after measured service need, eligible feed rights and a new instruction explicitly covering this stage.

Read `AGENTS.md`, `docs/02-data-access.md`, `docs/03-product-requirements.md`, `docs/05-architecture.md`, `docs/06-data-and-api-contracts.md`, `docs/07-price-integrity.md`, `docs/08-security-privacy-policy.md`, `docs/10-business-and-costs.md`, `docs/11-testing-and-operations.md` and `docs/12-launch-and-roadmap.md`.

## Gate and operating boundary

Verify the named merchant feed's exact fields, permitted acquisition, caching/history/redistribution terms, attribution, cadence, expiry and revocation. Record why a service provides value beyond the local prototype. Do not create one merely because this prompt exists.

Implement and test locally first. Account registration, uploading merchant data, deploying, publishing endpoints and spending require authorization covering the specific external action. No cloud account or secret should be assumed from the environment. Do not switch to a paid plan or alternate accounts when a quota is inconvenient.

## Files and exact service scope

Use one optional `backend/` folder containing TypeScript Worker source, D1 schema/migrations, local fixtures and tests. Add `backend/src/worker.ts`, `backend/src/ingest/`, `backend/migrations/` and `backend/tests/` only when appropriate; reuse shared pure `src/domain/` contracts instead of copying them.

Provide only the bounded canonical-ID read API specified in the contracts. Private choices remain local. No pasted-URL fetch endpoint, public write endpoint, observation upload, private cloud watch, account/authentication API, production LLM, second database service or microservice architecture.

Ingestion accepts the specifically approved merchant source, not arbitrary URLs. Validate each field and access record, preserve source/received/observed times, reject expired grants and quarantine invalid facts. Persist a successful-check heartbeat separately from daily comparable observation buckets. Do not create pre-existing history or fill source outages with invented values.

Use idempotency, transactions where supported, appropriate indexes and bounded pagination. Preserve correction/merge lineage and grant-dependent retention. Return explicit unknown, stale, unavailable and usage-limit states with safe cache behavior. Never treat a personalized price as a public offer.

## Quotas and security

Recheck current official Workers/D1 terms before selecting tool versions or deploying. Measure the chosen path against 10 ms Free CPU, request/statement limits, D1 rows scanned/written and the 500 MB Free single-database cap. Include index writes, deletes, corrections, retry work and storage overhead in the cost model.

Prefer small scheduled/feed batches with durable progress and bounded retries. Hard-stop or reduce ingestion before capacity is exhausted; no silent upgrade or sharding to evade limits. Authenticate administrative ingestion operations separately from public read access. Embedded extension keys and CORS are not user authentication. Keep service credentials out of the extension, repository and logs.

## Acceptance and reporting

Establish backend-local test/build scripts in its README. Run them plus extension typecheck/tests/build and the development-only benchmark when shared rules change. Holdout requires a separate explicit post-freeze evaluation. Test canonical IDs, no URL proxy, pagination, idempotency, expired licenses, malicious inputs, cache freshness, outages, quota errors and recovery.

Report local/emulator measurements separately from any authorized live measurement. A local pass is not deployment compatibility or a production quota benchmark. Before public use, perform an authorized restoration test and verify actual log retention, privacy disclosures and spend controls.

Stop if source rights, CPU/payload bounds, storage capacity, credentials or external authorization are missing. Leave local features usable. Update the cost assumptions, access lineage, progress and actual-results report; do not deploy or publicize automatically.

