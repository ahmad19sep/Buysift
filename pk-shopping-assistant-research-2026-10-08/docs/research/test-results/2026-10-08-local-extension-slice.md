# Local extension slice verification — 8 October 2026

**Outcome: stage 03 implemented. Typecheck, 63 tests, the 120-case development benchmark and the build passed. A scripted Chromium 141 smoke test of a scratch copy passed, but it is not Chrome 155 evidence. The holdout, an installed Chrome 155 popup, screen-reader and contrast checks were NOT EXECUTED.**

Stage 03 had been started in an earlier session (storage modules, form logic, popup markup) but was not logged and did not typecheck. The progress log and README still said "not started". This session read the existing work, kept it, repaired it and finished the slice under [prompt 03](../../../prompts/03-local-extension-slice.md). No adapter, backend, alert or release stage was started.

## State found at the start of this session

- `npm run typecheck` failed. `src/storage/notebook.ts` had two unused limit imports, and its delete-all path passed a union control type where only the delete-all variant fits.
- Three naming schemes disagreed. `src/ui/popup/index.html` used one set of control names (`retailerLabel`, `productUrl`, `sellerState`, `codFeeState`, …). `src/ui/popup/form.ts` used another (`retailer`, `url`, `feesMode`, …). The storage draft allowlist (`DRAFT_FIELD_NAMES`) used a third. With that mismatch, any saved draft would fail validation, and the HTML could not feed the form builder.
- The form called its access record `accessRecord`, but the storage contract calls it `access`.
- The popup entry (`index.ts`) was still the Foundation shell. It never called storage or the form.
- The form/selection tests existed but could not compile. The storage layer had no tests.

## Implemented scope

- **Field model reconciled.** `DRAFT_FIELD_NAMES` in `src/storage/types.ts` is now the single list of form fields. `form.ts` re-exports it and the HTML control `name`s match it exactly, so a draft restores without translation. Explicit `sellerMode`/`mpnMode` keep hidden text from becoming evidence.
- **Fee model follows the contracts.** Mandatory fees are known only if the user ticks "I entered every mandatory fee, including none" or enters a COD fee. A COD fee without that confirmation stays `complete: false`, so no delivered total is produced.
- **Storage (`src/storage/`).** Per-offer `offer:{id}` envelopes keep the immutable confirmed snapshot, a separate draft, observations and operation IDs. Writes are serialized, retries with the same operation ID are idempotent, and capacity is checked on the full candidate state. Consent is a separate record. Delete-all uses a prepared control record and resumes on reopen. v0→v1 migration is staged, and newer, corrupt or unmigratable records open read-only recovery with quarantine export.
  - Fixed this session: deleting with nothing stored (including declining on first use) now writes nothing.
  - Fixed this session: a 501st observation now reports `observation_limit` instead of leaking a format error.
  - Fixed this session: export lists each quarantined key only once.
- **Popup controller (`src/ui/popup/app.ts`, `index.ts`).**
  - **Onboarding:** Start, Cancel and the declined view. A failed acceptance write shows the existing error copy.
  - **Saved list:** count badge, storage/offer/observation limit messages, a waiting-draft notice and the synthetic sample view.
  - **Offer form:** add, edit and record-observation modes. Errors are linked to fields and focus moves to the first invalid field. The live price preview never treats unknowns as zero. Drafts save after a 500 ms pause with separate "Saving draft…", "Draft saved on this device." and "Draft could not be saved." states. "Saved on this device." appears only after `saveOffer` resolves. A failed save keeps the same operation ID for a safe retry.
  - **Edit rule:** an edit whose price and availability match the latest entry is saved as a metadata fix. This keeps corrections possible at the 500-observation cap.
  - **Detail view:** identity, terms, components, price conclusion, recorded time ("Not automatically checked") and grouped missing details. History marks entries made under earlier details and never claims a "lowest ever". An explicit "Open the shop page" link opens in a new tab. Delete has inline confirm and cancel.
  - **Comparison:** at most three selected offers; the fourth is rejected with visible text. Results are provisional, pair by pair, and put identity and terms before price. A lowest delivered amount is named only when every pair is ranking-eligible.
  - **Data view:** usage meter; export reports only "Download requested—check your downloads."; delete-all keeps the notice acceptance and says exported files are unaffected. Recovery view offers export and manage-data in read-only mode.
- **`src/ui/popup/view-model.ts`:** pure display helpers so readiness, comparison and history text are unit-tested. "Ready for provisional comparison" requires the same evidence the domain comparison requires (including region, receiver/pack and warranty scope).
- **Markup/CSS:** the renamed controls, a shop-link line, a draft-waiting notice, a saved-view comparison-limit notice, `.text-link` and a no-wrap heading button.

Manifest, permissions (`storage` only), CSP, build script, dependencies and lockfile are unchanged. No network client, worker, page reader, host permission, telemetry or affiliate behavior was added.

## Verification environment and commands

This session ran in a Linux cloud container with Node 22.22.0, npm 10.9.4 and TypeScript 7.0.2 from the existing lockfile. That is **outside the project's declared Node 24/npm 11 engines**. `npm ci --ignore-scripts --no-fund` installed the locked packages with an EBADENGINE warning. The commands below have not been re-run on the documented Windows/Node 24 environment.

| Command / check | Outcome |
| --- | --- |
| `npm run typecheck` | PASSED |
| `npm test` | PASSED; 63 tests, 0 failed/skipped/cancelled: 4 package-policy, 31 domain/fixture, 14 storage lifecycle, 8 form, 1 selection, 5 view-model |
| `npm run benchmark` | PASSED; 120 development cases, 0 misclassified, 0 critical false positives (unchanged rules) |
| `npm run build` | PASSED; same four-file package; popup bundle 171,440 bytes |
| Package-policy test on the new bundle | PASSED; storage-only manifest, package-local resources, no fetch/XHR/WebSocket/eval/dynamic-import/URL-literal tokens |
| `npm run benchmark:holdout` | **NOT EXECUTED**; sealed for a frozen-rule evaluation |

Storage tests use an in-memory area that serializes like `chrome.storage.local` and can fail on demand. They cover:

- consent: decline (no writes), failed acceptance write, and saving before acceptance;
- saves: acknowledged save across close/reopen, idempotent retry, failed write and retry;
- drafts: kept separate from the confirmed snapshot, restored after reopen, one new-offer draft at a time;
- rejection of invalid drafts and invalid records;
- limits: 26th offer, observation at 25 offers, 501st observation, metadata fix at the cap, byte cap with no eviction, 4 MiB warning;
- deletion: interrupted delete-all resumed on reopen, and a non-effective deletion reported as failure;
- migration: success, and a failed staging write that keeps the v0 record;
- recovery: newer/corrupt records, quarantine export, and recovery after cleanup;
- trusted-context and read failures.

## Scripted browser smoke test (limited)

Playwright 1.56.1 loaded a **scratch copy** of `dist/` as an unpacked extension in headless Chromium **141.0.7390.37**. Only `minimum_chrome_version` was lowered from 155 to 141 in that copy; the repository manifest still says 155. The popup page was opened as a tab at its `chrome-extension://` URL, not as a toolbar popup.

Observed:

- First open showed onboarding. Cancel left storage empty (`{}`). Start stored only the consent record.
- An empty submit listed five field errors and focused Brand. A draft was saved, survived closing and reopening the page, and restored the entered values.
- A bad price (`7,000.005`) showed the field error. The saved link had its tracking query and fragment removed.
- Four offers were saved. The fourth comparison selection was rejected and the count stayed at 3. Comparison reported different models as alternatives with no savings claim.
- A new observation produced two history entries.
- Export produced `pk-shopping-notebook-2026-10-08.json` containing four offers, with the "Download requested" status.
- Cancelling a delete changed nothing. Deleting one offer left three. Delete-all left only the consent record.
- A newer-schema record put the popup into recovery with a read-only notice.
- An offline pass (`setOffline(true)`) saved an offer and reopened it.
- **Zero non-`chrome-extension://` requests and zero page errors** were recorded across the scripted flow.
- Tab order on the saved view was nav (Saved, Compare, Data) then Add an offer and Try a sample. Screenshots were reviewed at 380 px width; this led to fixing the wrapped Edit button and condensing the comparison and attention text.

These are bounded automated observations in Chromium 141. They are not an installed Chrome 155 test, real toolbar-popup focus-loss behavior, a write-failure test in a real browser (covered only by unit tests), a screen-reader test or measured contrast.

## Manual checklist still NOT EXECUTED

1. Load `dist/` unpacked in Chrome 155+ and open it from the toolbar. Repeat the smoke flow, and confirm that closing the popup mid-typing loses at most the last unsaved change, as disclosed.
2. Use DevTools Network on the popup to confirm no extension-originated requests besides the user clicking "Open the shop page".
3. Keyboard-only pass over every view; NVDA or ChromeVox announcements for status and error regions; 200% zoom and reflow; measured contrast of warning and error messages.
4. Fill storage to the 4 MiB warning and 5 MiB cap in a real profile, and check that export and deletion still work.

## Open issues and limitations

- P0 supports one editing window. Two popups or tabs editing at once have no cross-window transaction guarantee.
- Edits that change identity or terms start a new revision. Earlier observations stay visible but are excluded from current-revision history summaries.
- Delete-all keeps the notice acceptance (`resetConsent: false`), because the on-screen copy promises record deletion, not a reset of the notice.
- The popup bundle includes domain modules that the popup does not call (for example benchmark parsing). Tree-shaking was not tuned.

Next eligible software milestone: [06 — Comparison and history](../../../prompts/06-comparison-and-history.md), local lane only. Adapter, backend, alert and public-release gates remain closed.
