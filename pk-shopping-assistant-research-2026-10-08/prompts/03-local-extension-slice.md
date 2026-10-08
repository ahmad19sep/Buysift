# Prompt 03 — Build the private local popup slice

**Current status:** eligible after the foundation and domain stages pass, with a new implementation instruction. This is P0 only.

Read applicable `AGENTS.md`, `docs/03-product-requirements.md`, `docs/04-ux-spec.md`, `docs/05-architecture.md`, `docs/06-data-and-api-contracts.md`, `docs/07-price-integrity.md`, `docs/08-security-privacy-policy.md` and `docs/11-testing-and-operations.md`. Reuse existing domain rules and fixture conventions.

## Scope and paths

Implement `src/storage/`, the existing `src/ui/popup/`, focused storage/UI tests and necessary packaged assets. The product has one popup with manual offer entry, saved-offer shortlist, comparison of at most three manually confirmed variants, observation capture, JSON export and deletion. Render labeled synthetic examples separately from user-entered data.

No background worker, browser page reader, Watch entity, alarms, notifications, host permissions, backend, account, telemetry or affiliate change. URLs are references; never fetch them. The only permission is `storage`. Keep source files and build output distinct.

## Required behavior

Use structured fields and the UX specification's actual copy. Explain local storage and manual/synthetic evidence before the user begins; support the pre-install notice without claiming the popup alone meets every store requirement. Persist no shopping records before explicit acceptance is saved successfully; decline leaves no shopping data.

A saved record contains only validated contract fields and its source/timestamps. Unknown delivery, warranty and identity remain visible unknowns. Comparisons remain provisional when supplied manually. Highlight material differences; do not produce a cheapest-equivalent recommendation when evidence is insufficient. Normal retailer navigation must be an explicit user action; synthetic examples must not present operational purchase links.

Persist valid draft changes separately from the immutable last confirmed snapshot, following the contracts' envelope/recovery protocol. Separate “Saving,” “Saved” and “Could not save.” Explicit Save acknowledges only a completed write. Closing during a pending write may lose the latest change; do not promise last-keystroke durability or rely on unload handlers. P0 supports one editing window; no cross-window transaction claim.

Enforce 25 offers, 500 observations, a 4 MiB warning and a 5 MiB application cap including the contracts' control reserve. Reject the 26th offer, 501st observation or excess byte growth. Existing-offer observations and metadata fixes remain possible when they fit; export and data-reducing deletion remain available. Older records outside the 90-day active window remain stored and count toward caps until explicit deletion. No silent eviction.

Apply trusted-context access and recoverable migrations. Export says “Download requested—check your downloads” unless completion is actually observable; JSON generation is not proof the file was saved. Deletion separately distinguishes local records from exports; cancelling changes nothing. No new download or clipboard permission.

## Acceptance and verification

Exercise consent acceptance/decline/write failure; empty, partial, complete and invalid forms; add/edit/delete/export; fourth-comparison rejection; count/byte limits; offline operation; failed writes; migration failure; and popup close/reopen before/after acknowledged persistence. Use shared domain validation for every input and display text safely.

Run `npm run typecheck`, `npm test`, `npm run benchmark` (120 development cases only) and `npm run build`. Leave holdout for an explicit frozen-rule evaluation. Perform authorized unpacked-browser tasks if available; record versions and failures. Otherwise provide a manual checklist and mark browser results NOT EXECUTED.

Verify keyboard order, visible focus, labels, status/error announcements, contrast and compact reflow. Inspect the built manifest and extension-originated network behavior. A local workflow must not initiate remote requests. Do not count ordinary browser traffic as extension telemetry.

## Stop conditions and handoff

Stop if the design requires new permissions, automatic retailer data, remote storage or an unexplained business rule. Do not solve popup limitations by adding a second primary surface. If a test cannot be performed, preserve that limitation instead of inventing a result.

Update progress and `docs/research/test-results/` with the implemented flows, tested behavior and open issues. Local history can proceed via prompt 06 without adapters or backend. Do not publish or automatically advance.

