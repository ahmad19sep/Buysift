# Private hardening verification — 8 October 2026

**Outcome: the automated parts of prompt 08's private lane are complete. The build is reproducible, the dependency, secret and source-map review is clean, and the sealed 80-case holdout matched all labels with zero critical false positives. Installed-browser and accessibility checks were NOT EXECUTED; the user has said they will not test by hand.**

The user asked for remaining work that needs no retailer permission and nothing they would test manually. This covers [prompt 08](../../../prompts/08-release-hardening.md) private lane only. The public lane was not started. Nothing was published, submitted, deployed, paid for or sent to anyone. The candidate record is [release-candidate.md](../../release/release-candidate.md).

## Environment

The checks ran in a Linux x64 cloud container with Node 22.22.0 and npm 10.9.4. That is outside the declared Node 24/npm 11 engines; `npm ci` warned EBADENGINE. Dependencies came from the unchanged lockfile, so the tool versions are the locked pins listed in the candidate record. Results have not been repeated on the documented Windows/Node 24 environment.

## Checks and outcomes

| Check | Method | Outcome |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | PASSED |
| Tests | `npm test` | PASSED; 71 tests, 0 failed/skipped |
| Development benchmark | `npm run benchmark` | PASSED; 120 cases, 0 misclassified, 0 critical false positives |
| Build | `npm run build` | PASSED; four files, no source maps |
| Reproducible build | `git archive` of the commit into a separate directory, `npm ci --ignore-scripts`, `npm run build`, SHA-256 of every `dist/` file | PASSED; byte-identical to the working build |
| Bundle inputs | esbuild metafile for `src/ui/popup/index.ts` | 19 inputs, all under `src/`; no third-party runtime code |
| Licences | `package.json` licence field of every installed package | TypeScript and its Linux binary Apache-2.0; esbuild, its Linux binary, all `@types` packages and `undici-types` MIT. All are development-only |
| Vulnerabilities | `npm audit --json` | 0 info/low/moderate/high/critical |
| Secrets | Regex scan of every tracked file for private keys and AWS, GitHub, OpenAI-style and Slack token formats, plus a keyword scan of source/tests | No matches |
| Manifest/CSP | Package-policy tests plus review | `storage` only, one popup, explicit CSP with `connect-src 'none'`; no worker, content script, host or download permission |
| Sealed holdout | `npm run benchmark:holdout`, run once | PASSED; see below |

## Holdout benchmark

- **Run.** Once, explicitly, after confirming `src/domain/` is unchanged since the stage 02 rule freeze (`git diff 7798a05 -- src/domain` empty).
- **Fixture.** `holdout.jsonl`, SHA-256 `e9fc1279ccbb5fa68c4e8ee711cc136fb3c3e604f048ad50a5cd08e1c071ab70`, matching the frozen value in `splits.json`.
- **Results:**
  - **Confusion matrix:** comparable 32/32, mismatch 32/32, insufficient evidence 16/16; no off-diagonal cells.
  - **Predicted-comparable precision:** 32/32. **Comparable recall:** 32/32.
  - **Coverage:** 64/80. **Abstention:** 16/80.
  - **Delivered ranking-eligible:** 16. **Critical false positives:** none. **Misclassified:** none.

The holdout uses 16 invented model families kept apart from the development set. It shows the frozen rules generalize across this synthetic set. With 32 positive cases it cannot support a real-world precision claim. Any future rule change makes these numbers regression evidence, not a fresh independent evaluation.

## Behavior already covered by automated tests

The checks prompt 08 lists are covered by unit, integration and scripted-browser tests from stages 03 and 06:

- zero data, unknown costs and variant conflicts;
- sparse history, same-day repeats, the 90-day window and future times;
- corrections;
- failed saves and retries;
- interrupted delete-all;
- migration success and failure;
- newer or corrupt records;
- count and byte caps without silent deletion;
- export wording;
- separately confirmed deletion.

## NOT EXECUTED

- Installing in Chrome 155 and using it from the real toolbar popup, including focus-loss closing.
- Screen reader, measured contrast, zoom and reflow.
- Network observation in a real Chrome DevTools session. The scripted Chromium 141 runs recorded zero non-extension requests.
- Checking these hashes against a Windows/Node 24 build.
- Everything in the public lane.
