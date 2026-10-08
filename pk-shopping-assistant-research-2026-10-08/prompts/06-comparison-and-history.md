# Prompt 06 — Make comparison and history trustworthy

**Current status:** the local P0 lane may follow prompt 03 directly. Live catalog/history work is BLOCKED unless its separate source/service gates pass. Execute only the lane explicitly requested; default to the local lane.

Read `AGENTS.md`, `docs/03-product-requirements.md`, `docs/04-ux-spec.md`, `docs/05-architecture.md`, `docs/06-data-and-api-contracts.md`, `docs/07-price-integrity.md`, `docs/08-security-privacy-policy.md` and `docs/11-testing-and-operations.md`.

## Local scope and files

Use the existing `src/domain/`, `src/storage/`, `src/ui/popup/`, `tests/domain/` and benchmark fixtures. Complete comparison explanations and the “your saved observations” view. Do not create a backend, reader, scheduler, Watch entity or second primary UI surface.

Show the records' source, selected model/variant, seller, condition, warranty/region, eligibility, known price components, observation/entry times and material unknowns. Enforce comparison of at most three offers. Manually confirmed pairs remain provisional; a checked box is not independently verified equivalence.

Never merge by similar titles or rank missing delivery as zero. A partial-known-cost view must say what is excluded. If identity or relevant purchase terms conflict or remain insufficient, abstain from a definitive cheapest-equivalent conclusion and explain the specific reason.

## History integrity

With no records, show no invented chart. With one record, show one observation and its time; do not infer a trend. With sparse records, preserve gaps. Never derive actual history from a crossed-out/list price or interpolate missing dates as observations.

Apply the domain's deduplication and comparable-bucket rules. Show the first recorded time, raw observation count, comparable daily-sample count, active window and last recorded time. Use Asia/Karachi daily buckets; repeated same-day checks do not create extra daily samples. Label any minimum “lowest in your saved comparable observations,” with its actual sample/window; do not claim “lowest ever,” a fake sale or future price prediction.

The active analysis window is 90 days. Older observations stay stored, exportable and counted toward caps until deletion. Reject a 26th offer, 501st observation or byte growth beyond 5 MiB. Existing-offer observations and metadata fixes may proceed when they fit; export/data-reducing deletion remain available. Warn at 4 MiB and follow the contracts' recovery reserve. Never silently discard evidence.

Corrections preserve what changed and why under the contract. Synthetic and manual histories remain distinct. Any graph/list uses actual observation times; an accessible table/text explanation must make the evidence understandable without visual color or hover alone.

## Live lane, only if independently qualified

Require eligible source records and a tested reader, or a separately gated P2 feed service. P1 merchant files support human-reviewed research/manual entry only; no customer import or hosted API. One merchant may support an explainer after value gates. Cross-store results require two independent eligible merchant/source integrations with exact overlap, not merely two marketplace sellers. Private choices stay local.

Apply the proposed partner freshness bands only to actual successful checks: fresh <=24 hours, delayed >24 to 72 hours, stale >72 hours. These are initial product thresholds, not a delivery SLA. Feed receipt is not proof of an observation time the source did not provide. Future history starts when authorized observations begin.

## Tests and stop conditions

Run typecheck, unit tests, `npm run benchmark` (120 development cases only) and build; fixture/backend tests apply only to present components. Cover mismatches, unknown totals, changed terms, corrections, duplicates, sparse/stale samples, the contracted time boundaries and interrupted saves. Inspect copy as carefully as calculations.

Keep the 80 holdout cases sealed until an explicit post-freeze `npm run benchmark:holdout` evaluation. Routine tests never call it. Report the core-terms/variant confusion matrix and separate stock/delivered-price results. Repeats are regression evidence, not independent validation. Zero critical false positives is necessary, not a 99% market claim.

Stop on ambiguous rights, missing comparability evidence, fabricated history requirements or a request for automatic predictions. Preserve the incomplete-but-honest state. Update progress and actual test reports, with local and live work clearly distinguished.

