# Comparison and history (local lane) verification — 8 October 2026

**Outcome: the local lane of stage 06 is implemented. Typecheck, 71 tests, the 120-case development benchmark and the build passed. A scripted Chromium 141 run of the new flows passed. The live lane was not started.**

The user asked for any further work that needs no retailer permission, without anything they would have to test by hand. That authorized the local lane of [prompt 06](../../../prompts/06-comparison-and-history.md). There is no reader, backend, scheduler, Watch entity or second UI surface, and the domain rules in `src/domain/` are unchanged since stage 02.

## Implemented

- **Comparison cards** now show:
  - source ("Entered by you · provisional");
  - model/size, seller, region and receiver/pack;
  - condition/color and warranty;
  - who can use the price, including the stated condition;
  - item price, delivery/fees and known amount with what it excludes;
  - recorded time ("not automatically checked").

  Each pair gets one line. Identity and term conflicts come first, then missing evidence by name, then price-ranking blockers. A provisional lowest amount appears only when every pair is ranking-eligible.
- **History view.** It shows the first recorded time, last counted entry, saved-entry count (with corrections), counted daily samples (one per Asia/Karachi day, 90-day window, current identity/terms revision), and the price basis (item price only).
  - Each entry carries a status: counted, same day, corrected, earlier details, older than 90 days, future time, or duplicate.
  - One entry says it cannot show a trend.
  - A lowest value appears only with three or more daily samples, labeled "Lowest in your N saved comparable daily samples (date–date)". It is never "lowest ever".
  - Missing days are listed as gaps; nothing is filled in for them.
- **Corrections.** "Correct" on a history entry opens a correction form with source, identity and terms locked. Saving appends a new entry that keeps the original observation time and links `replacesObservationId` to the entry it fixes.
  - The original stays stored, exported and visible as "Corrected by a later entry — kept, not counted".
  - Storage rejects a correction that points to nothing, or a second correction of the same entry.
  - Corrections count toward the 500-observation cap.
  - Entries from an earlier identity or terms revision cannot be corrected through this form.
- **"Add this mouse from another shop".** This copies only the mouse identity fields into a new offer, so two shops' entries can match exactly instead of differing by typos.
- **Storage fix found by the new tests.** A save whose combined record would be invalid (such as a second correction) now returns the storage error the popup handles, instead of an internal validation error.

## Commands and checks

These ran in the same Linux container as stage 03: Node 22.22.0 and npm 10.9.4, outside the declared Node 24 engines.

| Command / check | Outcome |
| --- | --- |
| `npm run typecheck` | PASSED |
| `npm test` | PASSED; 71 tests, 0 failed. New: 6 history/comparison view tests, 1 storage correction test, 1 form correction test; one older view-model assertion updated to the new wording |
| `npm run benchmark` | PASSED; 120 development cases, 0 misclassified, 0 critical false positives |
| `npm run build` | PASSED; same four-file storage-only package, popup bundle 182,001 bytes |
| Scripted headless Chromium 141 (scratch copy, minimum version lowered only there) | PASSED. A complete offer read "Ready for provisional comparison"; the other-shop shortcut copied model, part number and region with the shop left empty; correction mode locked identity fields; history showed counted, corrected and same-day statuses; two matching offers produced one provisional lowest-amount line; no non-extension requests and no page errors |
| `npm run benchmark:holdout` | Not run in this stage |

## Limitations

- **No correction reason.** The observation contract has no reason field, so a correction records what changed and when, not why. Adding a reason needs a schema version change and migration.
- **Item-price basis only.** History uses item price, because delivered totals depend on location and payment context.
- **Not tested in Chrome 155.** No installed Chrome 155 toolbar-popup, screen-reader or contrast measurement was performed. The user has said they will not test by hand.

Next eligible software work: the private hardening lane of [prompt 08](../../../prompts/08-release-hardening.md). Live comparison and history stay blocked until a retailer grant exists.
