# PK Shopping Assistant — research and specification pack

**Research date: 8 October 2026. Status: research complete for the accessible desk/public-interface scope; field validation and launch gates remain open.**

**Implementation update, 8 October 2026:** Foundation, domain/fixtures and the local extension slice (stages 01–03) are implemented following separate requests. The private popup now offers manual offer entry with separate drafts, a saved shortlist, provisional comparison of up to three offers, personal observation history, JSON export, deletion and read-only recovery, all stored only in `chrome.storage.local`. See the [foundation](docs/research/test-results/2026-10-08-foundation.md), [domain](docs/research/test-results/2026-10-08-domain-and-fixtures.md) and [local slice](docs/research/test-results/2026-10-08-local-extension-slice.md) verification reports. An installed Chrome 155 test has not been performed.

## Read this first

**Recommendation: NARROW.** Test a private local Chrome popup for Pakistani desktop/laptop shoppers comparing **new branded wireless mice**. Use manual facts and labeled synthetic examples first. There is no verified commercial retailer integration, customer validation or affiliate revenue for this project yet.

Start with [the decision brief](docs/00-decision-brief.md), then [data access](docs/02-data-access.md), [the proposed product](docs/03-product-requirements.md) and [validation](docs/09-validation-and-growth.md). The working name is not a cleared commercial brand.

The supplied brief, master prompt and prompt archive were read from the provided local copies and preserved. The pasted text has the same substantive assignment, with presentation changes and a clearer clicks-per-user unit. Earlier market/fee claims were treated as verification leads. No unrelated account profile or personal memory was used.

## What this pack contains

| Document | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Working rules and gates for a future coding agent |
| [00 — Decision](docs/00-decision-brief.md) | Recommendation, confidence, strongest evidence, blockers, founder actions |
| [01 — Market and competition](docs/01-market-and-competition.md) | Exact competitor identities, reach constraints, segment and entry strategies |
| [02 — Data access](docs/02-data-access.md) | Retailer/method permission matrix, fallback and unsent outreach |
| [03 — Product requirements](docs/03-product-requirements.md) | P0/P1/P2 boundaries, stories, failures and acceptance criteria |
| [04 — UX](docs/04-ux-spec.md) | Journeys, component wireframes, actual copy and state map |
| [05 — Architecture](docs/05-architecture.md) | Native MV3 stack, trust boundaries, storage and conditional services |
| [06 — Contracts](docs/06-data-and-api-contracts.md) | Draft types, identity/provenance model and gated API/schema specifications |
| [07 — Price integrity](docs/07-price-integrity.md) | Equivalence, known costs, history, freshness, abstention and benchmark |
| [08 — Security/privacy/policy](docs/08-security-privacy-policy.md) | Threat model, permissions, store policy and draft notices |
| [09 — Validation and growth](docs/09-validation-and-growth.md) | Interview/task/recruitment instruments, metrics and thresholds |
| [10 — Business and costs](docs/10-business-and-costs.md) | Zero-revenue base case, conditional economics and checked load arithmetic |
| [11 — Testing and operations](docs/11-testing-and-operations.md) | Future test matrix, benchmark, release and incident procedures |
| [12 — Launch and roadmap](docs/12-launch-and-roadmap.md) | Conditional 30/90-day sequence, effort and expansion gates |
| [13 — Build backlog](docs/13-build-backlog.md) | Small dependency-ordered tasks with blockers |
| [14 — Risks](docs/14-risks-and-open-questions.md) | Impact, evidence, mitigation and next verification |
| [Sources](docs/research/sources.md) | Publisher, URL, dates, sections and limitations |
| [Evidence register](docs/research/evidence-register.md) | Claim classifications, decisions and contradictions |
| [Public audit](docs/research/public-audit.md) | Reproducible bounded Farq/Flashi/retailer checks |
| [Progress](docs/research/progress.md) | Work actually completed, failures, pending fieldwork and continuation |
| [Coverage map](docs/research/coverage-map.md) | Master-prompt requirements mapped to substantive outputs |
| [Implementation prompts](prompts/README.md) | Eight copy-ready stages, with blocked/deferred lanes explicit |

## Evidence conventions

**VERIFIED FACT** means a source establishes the specific fact stated; a policy page verifies its wording, not this product's compliance. **COMPANY CLAIM** is a publisher's advertised capability or metric. **OBSERVED IN TEST** is bounded by its recorded procedure and sample. **INFERENCE** is a reasoned conclusion. **ASSUMPTION** is a chosen modeling or planning input. **UNKNOWN** is unresolved. Bracketed IDs such as M01, D01, T01 and R01 resolve in the source register; they are not quality scores.

Source access dates are not publication/effective dates. Statistics retain their original denominators. A retailer's displayed price is not completed checkout, stock confirmation or a transaction. Our two checked displayed-price agreements do not establish overall accuracy. Proposed acceptance criteria and targets are not executed results.

## Next action

Review the narrow experiment and the source-access gate. Customer/task research and merchant permission remain consequential. Foundation, domain/fixtures, the local extension slice, local comparison/history and automated private hardening are complete; see the [private release candidate](docs/release/release-candidate.md). **No further software stage is eligible until a retailer gives written permission**; the next action is the founder's outreach in [data access](docs/02-data-access.md) section 6. Completing local rules does not unlock live sources or public distribution.

Retailer adapters, a hosted feed service, public comparison/history, affiliates and background alerts cannot be unlocked just by reaching their prompt number. Each prompt lists its own prerequisites and stop conditions.

## Delivered versus not performed

The following describes the original research run. Subsequent implementation and actual checks are recorded separately in the [foundation](docs/research/test-results/2026-10-08-foundation.md), [domain](docs/research/test-results/2026-10-08-domain-and-fixtures.md) and [local slice](docs/research/test-results/2026-10-08-local-extension-slice.md) reports.

Delivered: source-backed findings, bounded public-interface observations, specifications, study instruments, calculations, source/evidence registers, a roadmap and future implementation prompts. The arithmetic and document checks are research verification.

Not performed: extension/package installation, application implementation/build, store submission, deployment, purchases, registrations, paid services, retailer/customer contact, customer interviews, account login, affiliate application, payout testing or legal clearance. There is no claim of a validated startup.

## Local development

Work from this directory using Node 24.19.0 or a later patched Node 24 release and npm 11. The checked environment is Windows 11 x64, Node 24.19.0 and npm 11.17.0. Dependencies are exact development pins with a lockfile; no runtime library is bundled.

```sh
npm ci --ignore-scripts --no-fund
npm run typecheck
npm test
npm run benchmark
npm run build
```

On PowerShell, `npm.cmd` can be used for these commands. Keep optional dependencies enabled: TypeScript and esbuild need their platform-specific native packages. Installation with lifecycle scripts disabled was verified in this environment.

`npm test` rebuilds the package, compiles tests to `.test-dist/` and runs Node's test runner against explicit file paths. `npm run benchmark` evaluates only the 120 synthetic development pairs. `npm run benchmark:holdout` is an explicit post-freeze command for the separate 80-case holdout; do not add it to routine tests. `npm run build` replaces only generated `dist/` and copies the manifest, popup HTML/CSS and bundled JavaScript. `node_modules/`, `dist/` and `.test-dist/` are ignored by Git. The selected development target is Chrome 155; the detected Chrome version is 155.0.8059.40, but the extension has not been installed or tested in it.

The popup requests only `storage` and restricts its access to trusted extension contexts. It writes nothing until the local notice is accepted, and it never fetches entered URLs; opening a shop link is an explicit user action. Shopping records stay in this browser profile until the user deletes them. P0 supports one editing window. Retailer adapters and publication remain separately gated.
