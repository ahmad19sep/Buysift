# Prompt 01 — Establish the private extension foundation

**Current status:** documentation prerequisites met for a synthetic-only foundation. Execute only after a new implementation instruction. Do not automatically continue into later prompts.

You are implementing the smallest foundation for PK Shopping Assistant in this workspace. First inspect the repository, applicable `AGENTS.md` files and existing changes. Preserve the research documents and unrelated work. Read `README.md`, `docs/00-decision-brief.md`, `docs/03-product-requirements.md`, `docs/05-architecture.md`, `docs/06-data-and-api-contracts.md`, `docs/08-security-privacy-policy.md` and `docs/11-testing-and-operations.md`.

## Prerequisites and scope

Confirm P0 remains a private founder prototype: native MV3, TypeScript, semantic HTML/CSS, one popup, manual/synthetic inputs and local storage only. No retailer permission, service account or production API is required for this foundation. If the requested scope includes live data, stop and identify its missing gate.

Establish a minimal toolchain using a patched Node 24 LTS release, TypeScript compiler, esbuild as a development bundler, appropriate browser/Node declarations and Node's built-in test runner. Check official package/release provenance, license, supported engines and current security information; choose exact compatible versions and lock them. Do not blindly install this research's observed “Latest” versions or silently upgrade the user's system runtime. If a required runtime is unavailable, document the specific requirement and safe next step.

## Files and implementation

Create or minimally update `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.test.json`, `scripts/build.mjs`, `scripts/test.mjs`, `src/manifest.json`, `src/ui/popup/index.html`, `src/ui/popup/index.ts`, `src/ui/popup/index.css` and `tests/build-policy.test.ts`. Adapt existing equivalent files rather than duplicate them.

The initial popup is a small labeled private-prototype shell, not a feature-complete application. Build output goes under `dist/`; emitted test JavaScript goes under `.test-dist/`. Keep generated files separate from source. Establish the three script contracts:

- `npm run typecheck`: compiler verification without emitting release output.
- `npm test`: compile relevant tests/domain code and run `node --test` against emitted test paths.
- `npm run build`: bundle packaged JavaScript and copy only required manifest/HTML/CSS/assets.

Avoid shell-specific glob assumptions in the test runner. If package-policy tests inspect `dist/`, their script must build it first; never depend on stale output. Establish meaningful package/manifest checks rather than a fake passing test or invented business helper.

## Acceptance and verification

The built manifest uses MV3 and only `storage`; no host permissions, content scripts, background worker, side panel, telemetry, remote code or external service endpoint. Use an explicit browser/JavaScript target selected from the documented initial test environment. The popup loads only packaged assets; its CSP disallows external connections.

Run the established typecheck, test and build commands. Inspect the output for unexpected permissions, executable downloads, secrets and unnecessary files. Record exact versions and artifact hash. If a browser check is available and authorized, report its actual version/outcome; otherwise mark it NOT EXECUTED. Compiling successfully does not establish installed compatibility.

## Constraints and handoff

Do not add React, WXT, accounts, product parsers, Watch/Notification functionality, paid APIs or deployment automation. Do not install an extension, register a publisher, contact a merchant or publish as part of this prompt without authorization covering that action. Never disable security controls to make setup pass.

Stop on conflicting scope, untrusted package provenance or a required permission expansion. Update `docs/research/progress.md` and add a factual report under `docs/research/test-results/`: files changed, commands and outcomes, open failures, limitations and the next eligible prompt. Do not say “ready for launch.”

