# Prompt 08 — Harden a private build or prepare a public release

**Current status:** private-build hardening can follow the completed local slice and local-history lane. Public distribution remains BLOCKED by user-value, access, privacy/security, operator, store and budget gates. Execute the requested lane; default to private hardening.

Read `AGENTS.md`, `README.md`, `docs/00-decision-brief.md`, `docs/02-data-access.md`, `docs/03-product-requirements.md`, `docs/05-architecture.md`, `docs/06-data-and-api-contracts.md`, `docs/07-price-integrity.md`, `docs/08-security-privacy-policy.md`, `docs/10-business-and-costs.md`, `docs/11-testing-and-operations.md` and `docs/12-launch-and-roadmap.md`.

## Private lane

Inspect the complete diff and built `dist/` artifact. Reproduce the build using the exact lockfile and documented tool versions in an isolated workspace when practical. Record the resulting hash; if output differs, investigate rather than claim reproducibility.

Review dependencies/licenses, secrets, source maps, CSP and manifest. P0 has storage only, one popup, no worker/content script, service request, account or monitoring. Verify manual/synthetic labels, single-window limits and caps applied to excess additions/growth. Export reports “Download requested” unless file completion is observable; deletion stays separately confirmed.

Run typecheck, unit tests, `npm run benchmark` (120 development cases) and build; fixture/backend tests apply only to present authorized components. After rules/build are frozen, explicitly invoke `npm run benchmark:holdout` for 80 cases and record hashes. Repeats are regression evidence, not fresh independent validation. Perform permitted browser/accessibility/network checks; record versions, results and gaps.

Check zero data, unknown costs, variant conflicts, sparse history, failed saves, interruption, migration recovery, count/byte caps and the 90-day active window without silent deletion. Zero critical holdout false positives is necessary; synthetic success is not real-world accuracy validation.

## Public preparation lane

Before public claims, require documented value, qualifying data paths and exact coverage. Public P2 may be a one-merchant explainer after its gates pass; cross-store functionality additionally needs two independent eligible merchant/source integrations with overlap, not two marketplace sellers. Review source terms, grant expiry, Chrome policies and permissions again.

Resolve operator/contact details and the at-rest protection question. Final privacy notice, pre-install informed disclosure, store dashboard declarations and measured behavior must agree. Remove placeholders before publication. Do not invent a privacy certification or treat local storage as automatic compliance.

Verify publisher registration requirements and actual fee/payment readiness without making payment in this step. Secure the publisher account, provide a working support/deletion channel and establish rollback/incident ownership. Keep affiliate functionality excluded unless separately approved merchant terms and qualifying Chrome benefit/flow are evidenced.

If a backend exists, verify actual spend controls, log retention, free-quota degradation, licensed lineage and an authorized restore result. An emulator pass is not a live deployment test. Check the current pricing horizon before making a recurring-cost promise.

## Files and handoff

Prepare `docs/release/release-candidate.md`, a test-results report, artifact checksum, known limitations, rollback plan, permission rationale and draft listing/disclosure materials. Keep evidence proportional; link existing specs rather than duplicate them. Update `docs/research/progress.md`.

Acceptance means a concrete, reviewable candidate with honest completed/pending gates. It does not mean publication, deployment or a verified business.

Stop the public lane on unresolved source rights, privacy/at-rest protection, secrets, critical integrity failure, missing operational ownership or unsupported claims. Private synthetic work may remain useful; state that distinction clearly.

Publish, deploy, spend or contact third parties only when authorization explicitly covers the final action; honor existing authorization when applicable. Never infer approval from “prepare” or “harden.” Report what changed, what was tested, material limitations and the exact remaining next action. Do not automatically submit a store listing.

