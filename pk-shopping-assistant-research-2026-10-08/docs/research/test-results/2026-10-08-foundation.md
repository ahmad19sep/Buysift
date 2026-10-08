# Foundation verification — 8 October 2026

**Outcome: stage 01 implemented; typecheck, four package-policy tests and build passed. This is a private popup shell, not a working offer notebook or release approval.**

The user selected “next” after Foundation was identified. Work followed [prompt 01](../../../prompts/01-foundation.md) and the project working instructions. No later implementation prompt was executed.

## Changes and scope

- `package.json` / `package-lock.json`: private ESM package, exact development dependencies and real typecheck/test/build scripts.
- `tsconfig.json` / `tsconfig.test.json`: explicit browser versus Node declarations, strict checking, separate emitted test output.
- `scripts/build.mjs`: bundles only popup TypeScript for Chrome 155, rejects external executable imports, replaces the fixed generated project `dist/` child and copies only reviewed assets.
- `scripts/test.mjs`: builds fresh `dist/`, replaces only the fixed `.test-dist/` child, compiles source/tests and discovers explicit emitted test paths. Uses Node subprocesses with argument arrays and hidden Windows windows; no shell glob dependency or empty-suite pass.
- `src/manifest.json`: MV3, version 0.1.0, `storage` only, toolbar popup and Chrome 155 development minimum. CSP restricts scripts/styles/images to packaged resources and denies connections, objects, frames, forms and base-URL changes.
- `src/ui/popup/index.html`, `index.css`, `index.ts`: semantic, labeled private preview. No offer controls or shopping-data writes. Initialization awaits trusted-context storage restriction and displays success/failure without claiming a saved notebook.
- `tests/build-policy.test.ts`: four tests inspect packaged capability limits, local HTML/CSS references, bounded common JavaScript network/dynamic-code mechanisms and direct dependency/lock consistency.
- `.gitignore`: excludes dependencies and generated build/test output.
- `README.md`, `prompts/README.md` and `docs/research/progress.md`: development commands, current continuation point and outcomes separate from the preserved original research history.

No runtime dependencies, host scopes, page readers, background worker, React, telemetry, accounts, affiliate behavior, notification features or remote service were added. The original research pack was preserved. The project is untracked in the enclosing Git repository, so this build is identified by content hashes rather than a commit hash; no commit was created.

## Environment and provenance

Verification record timestamp: **8 October 2026, 14:17:48.869 Asia/Karachi** (`2026-10-08T09:17:48.869Z`). Individual command start timestamps were not captured.

| Component | Actual environment / selected pin | Evidence |
| --- | --- | --- |
| OS | Windows 11 Pro, 10.0.26200, x64 | Local OS query |
| Node | 24.19.0 | Existing runtime; not upgraded. [Official LTS release](https://nodejs.org/en/blog/release/v24.19.0) |
| npm | 11.17.0 | Existing package manager; not upgraded |
| Detected Chrome | 155.0.8059.40 | Installed executable metadata; NOT launched or tested |
| Browser build target | `chrome155`, manifest minimum `155` | Selected from detected development environment; no compatibility claim |
| TypeScript | 7.0.2; Apache-2.0; Node >=16.20.0 | [Versioned npm metadata](https://registry.npmjs.org/typescript/7.0.2), [official release](https://github.com/microsoft/TypeScript/releases/tag/v7.0.2). Local compiler printed `Version 7.0.2` |
| esbuild | 0.28.2; MIT; Node >=18 | [Versioned npm metadata](https://registry.npmjs.org/esbuild/0.28.2), [official release](https://github.com/evanw/esbuild/releases/tag/v0.28.2). Local executable printed `0.28.2` |
| Chrome declarations | @types/chrome 0.3.4; MIT | [Versioned npm metadata](https://registry.npmjs.org/@types%2Fchrome/0.3.4) |
| Node declarations | @types/node 24.19.1; MIT | [Versioned npm metadata](https://registry.npmjs.org/@types%2Fnode/24.19.1) |

The official [July 2026 Node security release](https://nodejs.org/en/blog/vulnerability/july-2026-security-releases) precedes installed 24.19.0; the bounded review found no current official advisory requiring replacement of this runtime. esbuild 0.28.2 exceeds the documented fixes for [development-server CORS](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99), [Windows development-server traversal](https://github.com/evanw/esbuild/security/advisories/GHSA-g7r4-m6w7-qqqr) and [Deno binary integrity](https://github.com/evanw/esbuild/security/advisories/GHSA-gv7w-rqvm-qjhr). No development server or Deno module is used. Audit results are dated evidence, not a security certification.

Every one of the 54 locked dependency records had an official `https://registry.npmjs.org/` tarball, SHA512 integrity and MIT or Apache-2.0 license. The lock includes platform alternatives; 10 applicable packages were installed. Only esbuild declares a lifecycle script, and all lifecycle scripts were skipped. Optional native packages remained enabled. TypeScript 7's actual `bin/tsc` JavaScript launcher was inspected before use; its native compiler does not require the older programmatic compiler API.

## Commands actually executed

All commands ran from the project directory using `npm.cmd` on PowerShell.

| Command / check | Outcome |
| --- | --- |
| `node --version`; `npm.cmd --version` | PASSED; 24.19.0 / 11.17.0 |
| `npm.cmd install --package-lock-only --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org/` | PASSED; generated lockfile without lifecycle execution |
| Node-based full lockfile provenance/license/integrity inspection | PASSED; 54 records checked |
| `npm.cmd ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org/` | PASSED; 10 packages installed from the lock |
| `node node_modules/typescript/bin/tsc --version` | PASSED; 7.0.2 |
| `node node_modules/esbuild/bin/esbuild --version` | PASSED; 0.28.2 |
| `npm.cmd audit --json --registry=https://registry.npmjs.org/` | PASSED; zero reported vulnerabilities |
| `npm.cmd audit signatures --registry=https://registry.npmjs.org/` | PASSED; 10 registry signatures and 3 attestations verified |
| `npm.cmd run typecheck` | PASSED; browser source and tests checked; final run included all completed test files |
| `npm.cmd test` | PASSED; fresh package build, test compilation and Node runner: 4 passed, 0 failed/skipped/cancelled |
| `npm.cmd run build` | PASSED; standalone final build |
| Generated file enumeration, hashes and complete JavaScript bundle inspection | PASSED; four reviewed package files; no remote executable imports, endpoints or secrets observed |
| Updated-document link and report-hash checks | PASSED; 59 local links resolved; artifact and lockfile hashes matched this report |
| Independent read-only Foundation code review | Completed; no concrete stage 01 defects reported; no browser outcome inferred |

The four tests cover the exact file set and MV3/storage-only manifest, parsed CSP, package-local HTML/CSS resource references and absence of inline handlers/scripts, bounded checks for common networking/dynamic-code/import mechanisms, and exact direct development pins against the npm lock. Static token checks do not prove absence of all malicious/aliased code or runtime traffic.

An immutable esbuild installer-source retrieval attempt returned HTTP 404. That retrieval is NOT verified; the installer was not run. An initial PowerShell `ConvertFrom-Json` lock inspection failed on the empty root key. A subsequent Node JSON inspection successfully checked every package record. Neither issue remains a build blocker, and neither failure is counted as a pass.

## Artifact identity

Total package: **5,639 bytes across four files**. No source maps, dependency directories, research material or secrets were copied into `dist/`.

| Packaged path | Bytes | SHA256 |
| --- | ---: | --- |
| `manifest.json` | 610 | `19441b43939dfb9e7a824098c9b951b68779bb06ed2c26be2db3503baa09179a` |
| `ui/popup/index.css` | 2,270 | `0901b9224fbc5646e52d15c578fc1f686b82dce8c927d5387741fccc89f6b697` |
| `ui/popup/index.html` | 2,113 | `33bcdc1a3090f3ce0215065b805f38c3d5d23eb9f651118e81f3447cba6d9a08` |
| `ui/popup/index.js` | 646 | `f11452e4b7438377e4acdb97c8b6875fdd5f41c62bde852479251883e09b4b9b` |

Artifact SHA256: `7ec2966a5c4c156d0366dcb0a548910e334dbf15a7b831950ff8b172cf294eb0`. Reproduce by sorting package-relative paths lexically, then hashing each UTF-8 path, a NUL byte, its exact file bytes and a NUL byte in sequence. This identifies the unpacked file set, not a generated ZIP.

Lockfile SHA256: `0a49f8f1e77282e3304a4b3c171676723213593844721a5660d9428a778cd4c7`.

## Limitations and next milestone

**NOT EXECUTED:** extension installation, Chrome popup rendering/interaction, actual storage-access initialization, observed extension-originated network traffic, keyboard/screen-reader/zoom/contrast checks, performance measurements, domain benchmarks, offer persistence, migrations, export/deletion, retailers, deployment or public distribution. No shopping fixtures or user data were created.

The shell is not a complete P0, and compile/package checks do not establish installed compatibility, accessibility conformance, privacy compliance, customer value or retailer rights. Existing public release and at-rest protection gates remain open.

Next eligible implementation: [02 — Domain and fixtures](../../../prompts/02-domain-and-fixtures.md). Keep the synthetic benchmark development/holdout separation and authoritative money/identity/provenance contracts. Stage 02 was not started in this turn.
