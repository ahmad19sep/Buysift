# Prompt 04 — Add one eligible retailer adapter

**Current status: BLOCKED.** No retailer access grant was demonstrated in the research. Reading this prompt does not approve an integration. Stop at the gate unless the founder supplies qualifying evidence and explicitly requests implementation.

Read applicable `AGENTS.md`, `docs/02-data-access.md`, `docs/03-product-requirements.md`, `docs/04-ux-spec.md`, `docs/05-architecture.md`, `docs/06-data-and-api-contracts.md`, `docs/07-price-integrity.md`, `docs/08-security-privacy-policy.md` and `docs/11-testing-and-operations.md`.

## Prerequisite gate

Identify a dated source/access record with the merchant's actual identity, approved exact origins and paths, collection method, fields, display/redistribution rights, local/history storage rights, cadence, attribution, expiry and revocation process. Verify the intended browser reader is covered. An API for a seller's own inventory, affiliate acceptance, robots.txt or a working public page is not enough.

If permission covers only a merchant file, do not substitute a reader. P1 may use human review for research/manual entry; it has no customer import UI or hosted API. Record that study option and stop this adapter prompt. Hosted feed service is gated P2. No unauthorized outreach, agreements, bypass or broader access.

## Exact implementation

After the gate passes, implement one bundled reader under `src/adapters/<approvedMerchantId>.ts`, an explicit `src/adapters/registry.ts`, fixture tests and minimal orchestration in `src/background/` only if actually needed. The placeholder merchant ID must be replaced from the approved record; never create a fictitious granted domain.

Use an explicit “Read this offer” action and only justified `activeTab`/`scripting` capabilities. Check exact origin, product path and document before invocation. The bundled top-frame isolated reader must recheck its actual location/path before reading DOM; reject navigation or excluded contexts. Validate document/frame/operation binding again on the structured result before saving.

Never read account, cart, checkout, payment, cookie, authentication or unrelated frame data. No permanent all-sites access, hidden polling, auto-clicking, cart changes or uploaded observations. The reader is not a license to build a shared catalog from browsing.

Return bounded facts through runtime validators. Preserve SKU, seller, variant, condition, warranty, eligibility, stock, actual observation time and parser version. Confirm or abstain on ambiguity. One merchant enables an offer explanation; cross-store results need a second independent eligible merchant/source integration, not a second seller in the same marketplace.

## Acceptance and tests

Create permission-cleared HTML/structured fixtures under `fixtures/retailers/<approvedMerchantId>/` with access lineage. Add `npm run test:fixtures` without live HTTP. Cover changed selectors, SPA variant changes, same-title near-matches, seller changes, missing prices, personalized terms, hostile markup, unsupported pages and restricted browser URLs.

Test denied/revoked access, document navigation during extraction, forged/oversized messages, unexpected frames and duplicate saves. If a worker is introduced, test restart and reconstruct state from storage; do not depend on globals.

Run typecheck, unit tests, fixture tests, the development-only benchmark and build. Never run holdout automatically; evaluate it separately after an explicit rule freeze. Browser tests need an authorized page/profile or remain pending. Fixtures do not prove a live integration. Verify manual/offline behavior when the adapter is disabled.

## Stop and handoff

Stop on unclear/revoked rights, an access-control wall, material missing identity, broader permission need or unreadable price eligibility. Expose unsupported/unavailable copy instead of guessing. No remote parser download, command interpreter, affiliate rewrite or data upload.

Update the access record, supported-source statement, permission justification, progress and test report. Document exactly what was tested and the source's limitations. Do not claim a partnership, market-wide coverage, public launch or automatically run the backend stage.

