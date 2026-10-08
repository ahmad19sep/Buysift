# Prompt 07 — Evaluate and implement only achievable recheck notices

**Current status: DEFERRED.** P0 has no alerts, Watch entity, alarms or notifications. Do not execute this as an automatic next step. It needs a revised feature decision and an explicit implementation instruction.

Read `AGENTS.md`, `docs/02-data-access.md`, `docs/03-product-requirements.md`, `docs/04-ux-spec.md`, `docs/05-architecture.md`, `docs/06-data-and-api-contracts.md`, `docs/07-price-integrity.md`, `docs/08-security-privacy-policy.md`, `docs/10-business-and-costs.md` and `docs/11-testing-and-operations.md`.

## Prerequisite gate

Identify the exact approved user action, available source, freshness, threshold rule, UI surface and expected benefit. A local saved offer does not supply a new price. An open browser, a registered alarm and an eligible remote data source are different prerequisites.

Require current source rights for the requested check and a functioning, tested source path. Update the product/permission/data contracts before implementing a feature they currently exclude. If the only input is manual or synthetic, stop and preserve the notebook; do not call an old observation a newly detected price change.

## Smallest permitted scope

Prefer a user-triggered in-popup recheck notice after the user explicitly asks to check an eligible offer. Compare a fresh comparable observation with the stored threshold/previous evidence using shared domain rules. No alarm or desktop-notification permission is needed merely to display the result inside the popup.

Use existing domain/storage/UI modules. Add narrowly scoped notification-event or watch modules only when the revised approved specification requires them. Keep event identity, observation identity, threshold and delivery/display state separate. An observation that is stale, out of stock, incomparable, personalized or incomplete must not generate a misleading savings notice.

Show the source, actual check time, qualifying terms and reason for the notice. Allow clear disable/remove controls. Do not manufacture urgency or classify a merchant as fraudulent because a price moved.

## Additional scheduling gate

If a scheduled local reminder is explicitly requested, document why an in-popup action is insufficient. Then assess the minimum `alarms` and, only if necessary, `notifications` permissions. Explain denial and revocation. Read current Chrome documentation for minimum-version behavior, delayed alarms and persistence; do not assume Chrome 150 fields work on earlier versions.

Persist work state and idempotent event IDs. Check/recreate needed alarms on startup, bound retries and suppress duplicates after worker restarts or device sleep. A reminder to revisit an offer is not evidence that its price changed. If no permitted current source exists, show a reminder only and use that exact wording.

Browser-closed email, push or messaging delivery remains outside this prompt. It needs a separate provider, budget, durable outbox, identity/consent, unsubscribe and operations review. Do not add a service or recipient collection to overcome this boundary.

## Acceptance and verification

Establish focused tests and document commands. Run typecheck, tests, the development-only benchmark and build. Holdout requires an explicit post-freeze run; repeats are regression evidence. Test fresh/stale inputs, threshold crossing/rearming, duplicates, repeated rechecks, cooldown, disable/delete, offline/error/quota states and no misleading notice for a mismatch.

For a scheduled feature, additionally test denied permission, worker termination, missed alarms, device sleep, browser shutdown/reopen and deduplication. Report actual browser/version outcomes; mocks do not prove delivery. Check extension network requests against allowed source methods and budget assumptions.

Stop when requirements imply 24/7 delivery without infrastructure, an unapproved source, new private identity collection, unsupported policy benefit or unmeasured operating cost. Update scope, disclosures, permission explanation, progress and actual test reports. Do not claim any delivery guarantee not demonstrated.

