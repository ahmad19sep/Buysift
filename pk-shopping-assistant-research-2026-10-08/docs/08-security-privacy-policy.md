# Security, privacy and store-policy review

**Research date:** 8 October 2026. **Status:** design and review drafts, not implemented controls or legal clearance. P0 is the private manual/synthetic popup described in [architecture](05-architecture.md). Source IDs resolve in [sources](research/sources.md).

## 1. Purpose and current exposure

**DECISION:** the intended single purpose is to help a shopper organize offer facts and compare genuinely equivalent wireless-mouse variants. P0 accepts manual non-sensitive facts, displays labeled synthetic examples, stores a local notebook and supports export/deletion. Its manifest has only `storage`; its extension code makes no service requests. A normal user-initiated retailer link opens a website whose own data practices apply.

Chrome requires a narrow, understandable purpose and a complementary browsing experience [T08]. Every future feature must support that same job. An unrelated browsing-data business, injected advertising layer or general chat assistant would change both the risk and purpose assessment.

These specifications do not authorize browsing-trail collection. The working name is not a cleared trademark. Chrome permission and local execution do not establish retailer rights.

## 2. Policy-to-feature matrix

| Policy evidence | Product decision | Evidence needed before release |
|---|---|---|
| Minimum necessary permissions [T09] | P0 requests storage only; no permissions reserved for future features | Inspect final manifest and all bundled third-party code |
| Local handling still needs disclosure [T10] | Describe local notebook, drafts and exports accurately | Match policy, listing, dashboard answers and measured behavior |
| Limited Use applies to raw and derived information [T11] | No browsing-data sale, ad targeting or merchant intelligence derived from extension users | Review every field, recipient, purpose and retention rule |
| MV3 self-contained logic [T12] | Bundle adapters and libraries; forbid remote executable instructions | Inspect artifact, dependency output and network activity |
| Affiliate benefit/action/disclosure requirements [T13] | Affiliates excluded from P0 and base-case revenue | Exact flow, tangible benefit and merchant permission reviewed |
| Secure handling [T36] | Prevent injection; protect stored data; encrypt any future transport | Threat tests and documented at-rest decision |
| Pre-install disclosure and informed consent for user-data handling [T37] | Explain local handling before installation; disclose later practice changes | Consistent pre-install notice and onboarding; separate upload revocation/deletion |
| Developer registration [T14–T15] | Private testing precedes public distribution | Founder account, payment, listing review and publication approval |

No compliance badge or “Chrome approved” wording is permitted before actual approval. Policy pages establish requirements; they do not certify this proposed product.

## 3. Exact permission plan

| Permission or scope | P0 | Possible later justification | If unavailable |
|---|---|---|---|
| `storage` | Required | Local records, preferences and draft recovery | Persistence unavailable; show failure rather than fake success |
| `activeTab` | Absent | P1 explicit reader on user action | Manual entry remains |
| `scripting` | Absent | P1 bundled reader executed in the permitted tab | Manual entry remains |
| Retailer `host_permissions` | Empty | No standing retailer grant selected | No automatic reading |
| `optional_host_permissions` | Empty | Future implemented feature on an approved exact HTTPS origin | Feature stays off |
| API host permission | Empty | P2 licensed catalog read service on its exact origin | Local notebook remains usable |
| `alarms`, `notifications` | Absent | Separately approved reminder/check feature | In-popup status only |
| `sidePanel` | Absent | Surface was evaluated and rejected for P0 | Popup is the sole primary surface |
| `tabs`, `history`, `cookies`, `webRequest`, `debugger`, `unlimitedStorage`, clipboard-reading, native messaging | Absent | No current justification | No feature depends on them |
| `<all_urls>`, wildcard all-host patterns, file URLs | Absent | Not a proposed integration route | Unsupported sources remain unsupported |

The future pattern `https://<approved-retailer-host>/*` is explanatory, not a granted or valid manifest entry. Record actual origins before adding them. Host-permission paths do not constrain origin access [T39]. Check approved origin/path before invocation and inside the bundled reader before DOM access; validate document/frame/operation binding on return. Abort if navigation changes that context. Temporary active-tab access still needs these checks [T03–T04].

Do not read account areas, carts, checkout pages, payment forms, cookies, hidden authentication state or unrelated iframes. If the merchant's product page needs an account or access control, stop that adapter flow instead of obtaining more power.

## 4. Threat model

These are required design controls and future tests, not observed protection.

| Threat | Exposure and impact | Required control |
|---|---|---|
| Malicious manual input or page text | Script/HTML injection into popup | Treat content as text; schema, length and URL validation; no raw HTML rendering |
| Forged extension message | Later reader triggers privileged action | Validate type, sender, tab/document, phase and size; reject unknown message fields/actions |
| Compromised content-script context | Notebook or secrets leak into page | Keep storage trusted-context-only; return only requested non-sensitive fields |
| Misleading price or variant | False comparison changes purchasing decision | Exact identity requirements, provenance, abstention and quarantined corrections |
| Personalized price published as public | Privacy and price-integrity failure | Record eligibility; exclude account, membership and card-specific offers from general ranking |
| Dependency or release compromise | Extension becomes an extraction tool | Exact pins, integrity/license review, minimal build chain, human review of release artifact |
| Leaked publisher/API secret | Unauthorized deployment or data access | No secrets in bundle/repository/logs; protect publisher account and scope service credentials |
| Unauthorized private watch access | Future account data disclosure | Private-watch/account services are outside current scope; any future design needs user authentication and ownership checks |
| Quota abuse | Service unavailable or unexpected charges | Bounded queries, throttling, authentication for writes, circuit breakers and free-plan hard limits |
| Notification spam/replay | Repeated misleading alerts | Permission, cooldown, idempotency and unsubscribe before enabling alerts |
| Arbitrary URL fetching | Server used as proxy or reaches internal network | No fetch-any-URL endpoint; canonical merchant IDs only by default |
| Storage corruption/deletion mistake | Lost local evidence | Versioned records, recoverable migrations, export and verified deletion boundaries |

Chrome's messaging guidance explicitly treats content-script messages as potentially attacker-controlled [T38]. A matching extension ID, an embedded key or CORS allowlist does not authenticate a human user. With no private backend in P0, avoid building an unnecessary authentication scheme merely to address a future threat.

Release CSP should allow only necessary packaged resources and prohibit external connections in P0. No remote scripts, `eval`, dynamically downloaded parser programs, fetched WebAssembly or command interpreter are planned. Remote flags in a later phase may only select already reviewed behavior; schema validation must reject arbitrary selectors/commands that amount to executable logic [T12].

## 5. Data inventory and retention

The final limits are centralized in [contracts](06-data-and-api-contracts.md); do not duplicate competing cap values here.

| Data | Purpose and storage | Access/retention/deletion |
|---|---|---|
| Product model, variant, condition, seller, warranty | Local comparison inputs | User and trusted extension context; retain within notebook policy; delete with record |
| Entered price, delivery, tax/eligibility fields, stock and currency | Explain known cost and uncertainty | Local; missing stays missing; correction preserves explicit evidence history |
| Canonical public product URL | User reference | Strip secrets, tracking and personal query fields; never fetch in P0 |
| Observation time, source type and evidence notes | Explain what is known and when | Local; synthetic and manual evidence remain distinguishable |
| Watch reference and target | Deferred entity; absent in P0 | No current collection; separate feature review before implementation |
| Form draft and UI preferences | Recover interrupted work | Local draft until save/cancel/deletion; preferences until reset; disclose the implemented behavior |
| Export file | User-controlled backup | Generated only by explicit action; user controls copies outside extension |
| Support message, if voluntarily sent | Investigate a specific problem | Founder/support provider; separate disclosed retention; never request full notebook by default |
| Analytics, browsing history, cookies, credentials, payment details | No P0 purpose | Not intentionally collected or stored |
| Future API request metadata | Operate a disclosed service | Must specify actual provider logs and retention before activation; currently absent |

The 90-day window governs active local history analysis, not automatic deletion. Older observations remain until the user deletes them and count toward storage limits. Count caps block the excess entity being added; metadata fixes within the byte cap, export and data-reducing deletion remain available. No silent eviction is permitted.

Free-text entry may accidentally contain personal information. Instruct users to enter offer details only; keep fields narrowly structured and avoid an unlimited notes box. Redact secrets from diagnostic exports, URLs and errors. P0 diagnostics should be local error codes and counts, not raw source objects.

**At-rest gap:** the current User Data FAQ mentions strong encryption for stored user data, while the primary Handling Requirements more generally require secure handling [T10, T36]. `chrome.storage.local` is not by itself evidence of encrypted storage. Private synthetic development can proceed, but public launch requires an evidenced storage/key-management design or authoritative clarification for the exact local data. Do not claim encryption, treat a hardcoded key stored beside ciphertext as sufficient, or silently omit this issue. No sensitive-account-data pilot is authorized by this design.

## 6. Optional upload and remote access

P0 has no upload toggle because there is no server feature. Do not place a disabled cloud option in onboarding.

If a later user-facing feature actually needs upload, first establish source rights and permitted data use. Show the exact fields, recipient, purpose, retention and consequence before the user enables it. Use a separate unchecked control. Manual local features must remain usable without consent. Revocation stops new transmission immediately; deletion of already uploaded records is a separate visible action with completion status.

Consent cannot make a prohibited use acceptable. Browsing-derived observations must not become a merchant analytics dataset, even after aggregation or anonymization [T11]. A later business-to-business dataset needs a separately licensed source and lineage.

For any subsequently justified pasted-URL service, require HTTPS, an exact approved domain/port, canonical path, no userinfo, short inputs and strict time/byte limits. Reject IP literals, private/reserved/loopback/link-local destinations and non-network schemes. Disable redirects by default; if required, validate each destination and its DNS result, guard against DNS rebinding and ensure the connection uses the validated destination. If the selected runtime cannot enforce that boundary, do not implement arbitrary URL fetch. Use an approved feed endpoint or canonical ID instead.

## 7. Affiliate and ranking rules

Affiliate integration is **BLOCKED**, not an assumed funding mechanism. Chrome's current policy includes lack of discount, cashback or donation among affiliate-insertion violations [T13]. A useful comparison and a click alone do not establish that this exact flow qualifies.

Before any affiliate release, obtain confirmation of the merchant program's extension traffic rules, country/payout eligibility, approved link flow and benefit. Disclose the relationship before the click and in the listing. Keep commission independent of matching and price ordering. No background cookie updates, automatic URL rewriting, overwriting existing referrals or disguised sponsored ranking.

## 8. Draft P0 privacy notice

> **Review draft — replace every placeholder and verify implementation before publication.**
>
> **Operator:** [FOUNDER OR LEGAL ENTITY], [CONTACT ADDRESS IF REQUIRED].  
> **Contact:** [SUPPORT EMAIL]. **Effective date:** [DATE].
>
> PK Shopping Assistant is intended to help you organize shopping-offer details. This version stores the offer facts, reference links, observations and drafts you enter in this browser's local extension storage. Example data is labeled as synthetic.
>
> The extension does not automatically read retailer pages, monitor your browsing or send the notebook to our servers. We do not sell your information or use it for advertising profiles. Observations older than the 90-day analysis window remain stored until you delete them. You can export your notebook and delete individual records or all local data. Exported files remain under your control. Removing the extension removes its local extension data; browser/profile or device loss may also affect availability.
>
> Opening a retailer link contacts that retailer through your browser; its privacy policy applies there. If you contact support, we receive the information you choose to send and use it to answer that request. Please omit passwords, payment details and unnecessary personal information. Support retention: [REVIEWED PERIOD AND PROVIDERS].
>
> We will describe any future change in data handling before enabling it. Our use of information must follow the Chrome Web Store User Data Policy and its Limited Use restrictions. Storage protection details: [VERIFIED METHOD AND LIMITATIONS]. Questions or deletion requests: [SUPPORT EMAIL].

This notice must match the actual product. A developer cannot remotely delete a local-only notebook. Support should explain the on-device steps rather than request identity documents or pretend a server deletion occurred.

## 9. Draft terms and support workflow

> **Terms review draft.** [OPERATOR] provides an informational offer notebook. User entries and limited observations may be incomplete, outdated or incorrect. A comparison is limited to the stated variant, condition, seller, delivery area and price eligibility. Check the merchant's final checkout, stock, warranty and return terms before purchasing.
>
> We do not sell the retailer's goods, place orders, guarantee savings, guarantee future prices or certify sellers. No retailer partnership exists unless specifically identified. Users must have appropriate rights for material they supply. Nothing in these terms removes rights that cannot lawfully be excluded.
>
> Availability, governing law, dispute handling, age eligibility, liability limits and operator details require review for the actual launch jurisdiction. Contact [SUPPORT EMAIL] for corrections, accessibility issues or security reports.

Deletion flow: explain scope, offer export, obtain confirmation, remove only this extension's records and drafts, verify the empty state, and report failures. The confirmation must distinguish local records from user-held exports. Correction requests should identify the specific record and evidence; support access requires specific consent.

Before public launch, resolve Pakistan privacy/consumer/electronic-transactions requirements with qualified review, retailer licenses, operator identity, store disclosures and the at-rest question. International expansion needs its own assessment, including applicable trader-identification, data-transfer and consumer rules. This document supplies questions and controls; it does not assert legal clearance.

