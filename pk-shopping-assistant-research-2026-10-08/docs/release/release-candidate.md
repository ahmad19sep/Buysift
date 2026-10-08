# Private release candidate — 8 October 2026

**Status: PRIVATE CANDIDATE, NOT PUBLISHED.** This records a reviewable private build. It is not a Chrome Web Store submission, a public release or evidence of customer value. Public distribution stays blocked; see [the public gates](#public-release-gates-still-closed).

## Candidate identity

| Item | Value |
| --- | --- |
| Source commit | `e31283d` on `claude/admiring-archimedes-n2l7xh` (stage 06 local lane) plus this documentation |
| Extension version | `0.1.0` (manifest `version`), minimum Chrome 155 |
| Storage schema | v1 envelopes, notice version 1; v0 records migrate through a staged copy |
| Toolchain | Exact lockfile pins: TypeScript 7.0.2, esbuild 0.28.2, @types/chrome 0.3.4, @types/node 24.19.1 |
| Build environment for these hashes | Linux x64 container, Node 22.22.0, npm 10.9.4 (outside the declared Node 24 engines) |

### Artifact checksums (SHA-256 of `dist/`)

```
19441b43939dfb9e7a824098c9b951b68779bb06ed2c26be2db3503baa09179a  manifest.json
c422235fcf6a6b89fffc95c020e05b793f9472c17b74513e37f8338af3e3dc86  ui/popup/index.css
5ac7846a8b0d710b18d1e1436faed489a9d7a1cac6308abce5e73ff11c400520  ui/popup/index.html
09eaf0a675b87a7099de4f27e62b245fecde289c14d61dfb344cd9f17867285a  ui/popup/index.js
```

A clean `git archive` of the commit was built in a separate directory with `npm ci --ignore-scripts` and `npm run build`. It produced byte-identical files. Builds on Windows/Node 24 have not been compared against these hashes.

## What the candidate does

One toolbar popup for a private, device-local notebook of new branded wireless-mouse offers:

- notice acceptance or decline;
- manual entry with separately saved drafts, editing, new observations and linked corrections;
- a saved list;
- provisional comparison of up to three offers;
- personal history with gaps and counted daily samples;
- JSON export, deletion of one offer or everything, and read-only recovery for unreadable, newer or unmigratable records.

Labeled synthetic sample data is shown separately and never saved.

It does **not** read shop pages, fetch entered links, run in the background, upload anything, track browsing, show ads or affiliate links, or send notifications.

## Permission and capability rationale

| Capability | Present | Why |
| --- | --- | --- |
| `storage` | Yes | Keeps the user's notebook in `chrome.storage.local`; access is restricted to trusted extension contexts at startup |
| Host permissions, `activeTab`, `scripting`, content scripts | No | No page reading; retailer access is not granted ([access gate](../02-data-access.md)) |
| Background service worker, alarms, notifications | No | No monitoring or alerts in P0 |
| `downloads`, clipboard | No | Export uses a standard download link and reports only "Download requested—check your downloads." |
| Network | None | CSP `connect-src 'none'`; the bundle test blocks fetch, XHR, sockets, eval, dynamic import and URL literals. Scripted runs recorded zero non-extension requests |

The shop link on an offer opens in a new tab only when the user clicks it.

## Verification summary

Detail is in the [private hardening report](../research/test-results/2026-10-08-private-hardening.md).

| Check | Result |
| --- | --- |
| Typecheck, 71 unit/integration tests, build | PASSED |
| Development benchmark, 120 synthetic cases | PASSED; 0 misclassified, 0 critical false positives |
| Sealed holdout benchmark, 80 synthetic cases (run once, rules unchanged since stage 02) | PASSED; 80/80 matched; 0 critical false positives |
| Reproducible build | PASSED; identical hashes |
| `npm audit` | 0 known vulnerabilities |
| Licences | All development tools MIT or Apache-2.0; the bundle contains only project source (19 files under `src/`) |
| Secrets / source maps | None found / none emitted |
| Scripted headless Chromium 141 runs (scratch copy with lowered minimum version) | PASSED; zero external requests, zero page errors |

Synthetic benchmark results are rule-regression evidence on invented cases. They are not real-world accuracy.

## Known limitations

- **Untested in Chrome 155.** It has never been installed in Chrome 155 or opened from the real toolbar popup, so popup focus-loss behavior is untested. The user has said they will not test by hand.
- **Accessibility unmeasured.** Screen-reader, contrast and zoom have not been measured; keyboard order was only spot-checked in a scripted run.
- **One editing window.** Two windows editing at once have no transaction guarantee.
- **Item price only for history.** History uses the item price, and corrections record no free-text reason (the contract has no reason field).
- **Larger bundle than needed.** The bundle includes some domain code the popup does not call, such as benchmark parsing.

## Rollback plan

- **Code.** Earlier builds are recoverable from git: `7798a05` (stages 01–02), `383460f` (stage 03), `e31283d` (stage 06). Check out the commit, run `npm ci --ignore-scripts --no-fund` and `npm run build`, then reload the unpacked extension.
- **Data.** The schema stayed at v1 from stage 03 to this candidate, so older stage-03 builds read data saved by this one. Corrections use the existing `replacesObservationId` field and older builds accept it. Stage-03 history views simply do not hide corrected entries.
- **Before any rollback**, export JSON from the Data tab. If a build cannot read a record, it opens read-only recovery instead of deleting anything.

## Public release gates still closed

- **Source rights.** No retailer has granted reading, history or comparison rights.
- **Validation.** There is no documented user-value evidence.
- **Operator details.** Contact, support and deletion channels are not set up.
- **Privacy and protection.** Final privacy notice and at-rest protection decisions are not made.
- **Store account.** There is no Chrome Web Store publisher account or listing.

See [prompt 08's public lane](../../prompts/08-release-hardening.md). Nothing was published, submitted, paid for or sent to third parties.
