# Synthetic matching benchmark

These fixtures are owned, fictional development material. They contain no retailer observations, market prices, merchant relationships or permission claims. Success measures only whether the current deterministic rules reproduce these authored cases; it is not evidence of real-market accuracy.

`development.jsonl` contains 120 cases across 24 model families: 48 comparable, 48 mismatch and 24 insufficient-evidence pairs. Routine `npm run benchmark` evaluates only this file.

`holdout.jsonl` contains 80 cases across 16 different model families: 32 comparable, 32 mismatch and 16 insufficient-evidence pairs. It is evaluated only through the explicit `npm run benchmark:holdout` command after a rule freeze. Routine tests treat it as opaque bytes: they verify its frozen hash and record count without parsing labels. If holdout results influence a rule change, future runs are regression evidence and a fresh holdout is required for a new independent claim.

Each model family contributes two comparable cases, two material mismatches and one deliberate evidence gap. Mismatches rotate across model/MPN, size, handedness, receiver/connectivity pack, region, color, condition, warranty and eligibility. Shipping and stock vary separately and do not define the target class. Unknown delivery can block delivered-price ranking while the underlying pair remains comparable.

`splits.json` records the class counts, disjoint family lists and SHA256 of each frozen JSONL file. `generate.mjs` deterministically reproduces the current files, but it is a fixture-authoring tool rather than a routine test command. One coding agent authored both populations, so label independence is limited.

The evaluator reports a three-class confusion matrix, comparable precision numerator/denominator, comparable recall numerator/denominator, coverage, abstention, delivered-ranking eligibility, misclassifications and critical false positives. Zero critical false positives on the holdout is a proposed necessary gate; it cannot establish 99% accuracy.
