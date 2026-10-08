# Implementation prompts

**Status: research output, with subsequent implementation updates on 8 October 2026.** Stages 01–02 were executed after separate implementation requests; their outcomes are recorded in the [foundation](../docs/research/test-results/2026-10-08-foundation.md) and [domain](../docs/research/test-results/2026-10-08-domain-and-fixtures.md) reports. Stages 03–08 have not been executed. Each prompt becomes implementation instructions when the founder requests the relevant stage and its dependencies are met.

Copy one complete prompt into the coding session whose workspace contains this document pack. Start by reading the project `AGENTS.md`. Preserve existing files and reconcile any conflicting specifications before edits. Resolve dependency versions from current official provenance at implementation time; this research's release observations are not a lockfile.

| Order | Prompt | Current eligibility |
|---|---|---|
| 01 | [Foundation](01-foundation.md) | Completed; typecheck, four package-policy tests and build passed; installed-browser verification remains pending |
| 02 | [Domain and fixtures](02-domain-and-fixtures.md) | Completed; 35 tests passed and the 120-case synthetic development benchmark matched all authored labels; holdout not executed |
| 03 | [Local extension slice](03-local-extension-slice.md) | Next eligible milestone; domain rules are available, storage/UI not started |
| 04 | [Eligible retailer adapter](04-eligible-retailer-adapter.md) | **BLOCKED:** no source grant demonstrated |
| 05 | [Optional backend](05-optional-backend.md) | **BLOCKED:** no qualifying feed/service decision |
| 06 | [Comparison and history](06-comparison-and-history.md) | Local lane can follow 03 directly; live lane remains blocked |
| 07 | [Achievable alerts](07-achievable-alerts.md) | **DEFERRED:** not part of P0 |
| 08 | [Release hardening](08-release-hardening.md) | Private lane follows local slice/history; public lane needs all public gates |

The first local sequence is **01 → 02 → 03 → 06 local → 08 private**. The numbering does not require a backend before local history. P1 uses an eligible reader or human-reviewed merchant-file research/manual entry, without customer import or a hosted API. Public P2 may be a one-merchant explainer after its value/release gates; cross-store comparisons additionally need two independent eligible merchant/source integrations with overlap, not merely two marketplace sellers.

P0 uses one popup, manual facts and synthetic fixtures, `storage` only, no worker and one editing window. Limits are 25 offers, 500 observations, three compared offers, 4 MiB warning and 5 MiB hard cap. Reject the excess entity addition or byte growth; permit fitting existing-offer observations, metadata fixes, export and data-reducing deletion. Older records remain until user deletion and count toward caps after leaving the 90-day active history window. Watch/Notification entities, browser reading, accounts, telemetry and production AI are outside P0.

After prompt 02, routine `npm run benchmark` uses only 120 development cases. `npm run benchmark:holdout` explicitly evaluates the 80 holdout cases after rule freeze; routine tests never call it. Repeats are regression evidence, not fresh independent validation.

Each prompt specifies paths, prerequisites, acceptance and stop conditions. Record executed commands separately from pending tests. A blocked gate produces a factual blocker and next action, not a scraping workaround or a completed-status claim. Local implementation does not authorize third-party contact, paid services, deployment, publication or public performance claims.

Relevant specifications: [architecture](../docs/05-architecture.md), [contracts](../docs/06-data-and-api-contracts.md), [integrity](../docs/07-price-integrity.md), [security](../docs/08-security-privacy-policy.md), [tests](../docs/11-testing-and-operations.md), [backlog](../docs/13-build-backlog.md).

