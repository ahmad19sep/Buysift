# User experience specification

**Status: PROPOSED; the P0 popup was implemented in stage 03 (see the [local slice report](research/test-results/2026-10-08-local-extension-slice.md)); accessibility conformance has not been measured.** Read [requirements](03-product-requirements.md), [integrity](07-price-integrity.md) and [security](08-security-privacy-policy.md). Relevant sources: [M31], [T02–T04], [T32], [T40].

## One primary surface

Use one Chrome toolbar popup with an offer view, shortlist view and a small Data/settings view within it. Proposed viewport is approximately 380 CSS pixels wide, adapting to the browser's available popup height; do not rely on a fixed tall screen. One vertical scroll region, restrained typography, persistent field labels and no page overlay. A side panel may later solve evidence-backed focus-loss friction, but is not built alongside the popup.

The popup closes when focus moves outside it [T40]. Therefore explicit Save and honest draft state are fundamental: show “Saved on this device” only after the write finishes. Restore the last confirmed draft; do not promise the last unsaved keystroke will survive immediate closure. Avoid multi-step forms that force users to hold information in memory. Label price, model and link prominently; optional detail groups can expand inline.

## Main journey

1. User chooses the toolbar action. First use opens a short explanation, with a link to the full notice and explicit Start/Cancel choices.
2. User can try a labeled synthetic example or add a manual offer. P0 does not detect the active website.
3. User enters model and item price, then marks missing identity/price details as unknown. Save produces either “Ready for provisional comparison” or “Saved — details needed.”
4. User adds another offer and selects Compare. Identity differences appear before any price order. Unknowns explain why a complete comparison cannot be made.
5. On another visit, user records a new observation. The personal history shows real saved points and gaps.
6. User exports/deletes from Data settings. There are no requests to enable notifications or provide an email address in P0.

## Text wireframes

These ordered component tables are text wireframes, not screenshots. Values in the examples below are **synthetic test data**, not current retailer offers.

### A — First open

| Order | Element | Proposed copy / behavior |
| --- | --- | --- |
| 1 | Title | PK Shopping Assistant · Private prototype |
| 2 | Purpose | Compare the offers you choose, with the details that matter. |
| 3 | Explanation | Enter details yourself. This version saves them on this device and does not check shop prices automatically. |
| 4 | Data explanation | You can export or delete your entries at any time. Avoid account, payment or personal information. |
| 5 | Link | How your data is handled |
| 6 | Explicit choice | Start local notebook / Cancel |
| 7 | Secondary action after consent | Try a sample — uses invented demonstration prices |

This in-product step complements, rather than replaces, public pre-install disclosures and the reviewed consent implementation.

### B — Offer detail

| Area | Example |
| --- | --- |
| Header | Offer · Edit · Back to saved offers |
| Provenance | Entered by you · Example data |
| Identity | Example Mouse A · Small/medium · Right hand · Graphite · New |
| Evidence needing attention | Manufacturer part number not entered. Warranty provider not entered. |
| Item price | PKR 7,000 |
| Components | Delivery: not entered · Taxes: included per your entry · COD fee: not entered |
| Price conclusion | PKR 7,000 + delivery and payment charges not entered |
| Time | Recorded 8 Oct 2026, 12:00 PKT · Not automatically checked |
| Primary action | Save observation |
| Secondary action | Add to comparison |
| History summary | 1 observation · Since 8 Oct · More observations needed |

Unknowns are inline facts, not a large warning wall. The interface must not show “Verified,” “Best deal” or a green trust shield for manual evidence.

### C — Comparison

| Row | Offer A | Offer B |
| --- | --- | --- |
| Model / size | Example Mouse A / Small | Example Mouse A / Small |
| Condition / color | New / Graphite | New / Graphite |
| Warranty | Manufacturer, 12 months | Provider not entered |
| Item price | PKR 7,000 | PKR 6,850 |
| Shipping / all mandatory fees | Not entered | PKR 300 / None, explicitly confirmed |
| Other cost conditions | Still incomplete | Tax included, no extra discount, location and payment context confirmed |
| Known amount | PKR 7,000 + unknown delivery | PKR 7,150 delivered under entered conditions |
| Conclusion | “A complete comparison needs Offer A's delivery cost and Offer B's warranty provider.” | No savings claim |

Render mobile-width comparison as stacked offer sections with aligned field labels and a shared differences summary. Do not make the user horizontally scroll a dense table inside the popup. Maximum three offers. “Different model” is shown when size, handedness, condition or critical model evidence conflicts.

### D — Personal history

| Order | Element | Behavior |
| --- | --- | --- |
| 1 | Heading | Your saved observations |
| 2 | Summary | Tracking began 8 Oct · 4 observations across 3 days · Last recorded 12 Oct |
| 3 | Price basis | Item price only · Graphite / New / same seller |
| 4 | Main presentation | A small chronological list initially; an accessible point chart only if it improves the task |
| 5 | Gaps | No observation recorded 10–11 Oct; no connecting line implying a checked price |
| 6 | Lowest label | Lowest in your 3 comparable daily samples: PKR 6,900 |
| 7 | Limitation | These are your entries. Shop prices may have changed. |

There is no “Lowest ever.” Crossed-out list prices remain reference-price fields and never become dated observations. Historical minima must name the offer/variant, sample window, price basis and exclusions.

## Complete state and copy map

| State | Visible response | Action / acceptance |
| --- | --- | --- |
| Empty notebook | “No offers saved yet.” | Add an offer / Try a labeled sample. No empty chart. |
| Unsupported website, P0 | “This version uses details you enter.” | Manual entry remains available; there is no unsupported-site detector. |
| Unsupported website, future reader | “This shop is not supported yet.” | Do not request broader permissions; preserve manual path. |
| Page permission denied or revoked, future reader | “Page access is off. You can still enter an offer yourself.” | Explain the specific optional access only on explicit retry. |
| Missing identity | “We need the size/handedness to compare these as the same mouse.” | Focus the missing field; allow save as incomplete. |
| Critical identity conflict | “These are different models: M650 and M650 L.” | Separate alternatives; no exact-match or savings badge. |
| Missing shipping | “Delivery cost not entered.” | Known subtotal remains distinct from delivered total. |
| Personalized/conditional amount | “This price requires [stated condition].” | Keep separate from generally available prices. |
| Out of stock | “Not available in the recorded offer.” | Exclude from cheapest available ranking; retain evidence. |
| Unknown stock | “Availability not confirmed.” | No available label based only on a purchase button. |
| Zero history | “No observations yet.” | No synthetic history outside demo mode. |
| Sparse history | “Not enough comparable observations to assess this price.” | Show dates/counts, not a recommendation. |
| Old manual observation | “Recorded [date]. Check the shop before deciding.” | No automatic freshness claim. |
| Future feed delayed / stale | “Last source observation [time]. Updates are delayed.” | Label delay >24h; suppress current ranking >72h under proposed policy. |
| Variant changed | “This selection differs from the saved variant.” | Create a separate series; never attach to old history silently. |
| Parser failure, future reader | “We couldn't read this offer reliably.” | Keep old evidence dated; manual entry; no zero-price fallback. |
| Offline, P0 | “Saved offers are available offline.” | Local entry continues if storage works; outbound links need internet. |
| Future service outage | “Live data is temporarily unavailable.” | Show dated cached evidence; no fabricated refreshed time. |
| Future quota exhausted | “Updates are paused. Your saved offers are still available.” | Stop requests/retry loops; explain last source time. |
| Storage soft cap | “Your notebook is nearly full.” | Show count/size; Export and Manage data. |
| Offer count cap | “Your 25 saved offers are full.” | An existing offer can still receive observations if other limits permit; export/delete to add another offer. |
| Observation count cap | “Your 500 saved observations are full.” | Export/delete before adding another; other non-growing changes remain available. |
| Storage byte cap / recovery reserve | “Your notebook is full.” | Stop data-growing writes, preserve recovery room, keep reads/export/delete available. |
| Invalid input | “Enter a price with no more than 2 decimal places.” | Field-specific message, linked to input; preserve other fields. |
| Save failure | “This change wasn't saved. Try again.” | Retry idempotently; no success toast. |
| Deletion failure | “We couldn't delete these entries.” | Retain accurate counts; retry, do not claim completion. |

## Accessibility and attention

The proposed target is WCAG 2.2 AA [T32]. Use semantic buttons and headings, programmatic labels, visible unobscured focus and keyboard access to every action. Error messages reference their fields; focus moves to the first invalid field after submission. Announce successful saves and nonurgent state changes with a restrained status region; do not repeatedly interrupt screen readers.

Normal text should meet 4.5:1 contrast; large text and relevant component boundaries follow the applicable criterion. Status needs text as well as color. The 24-by-24 CSS pixel AA target-size rule has exceptions; prefer approximately 44-pixel-high main controls as a usability choice. Respect reduced-motion settings; animation must never be required to understand a result. Test zoom, wrapping, long model codes and local-number formatting.

Keyboard order follows visual order; opening a disclosure keeps focus in place. Avoid nested dialogs in the popup. Confirm destructive deletion inline with a clear Cancel action. Never obscure checkout, change cart state or add urgency countdowns.

## Language and mobile validation

English is the proposed interface language; optional Urdu/Roman Urdu interview explanations are research accommodations. Record terms users do not understand, especially “variant,” warranty type and price basis, then rewrite with familiar words. Do not infer a full translation requirement from country alone.

A later mobile companion could accept manually shared/pasted links and display licensed server facts. It would not gain Chrome desktop extension access or arbitrary retailer-app contents. Validate whether shoppers actually move between devices before adding another surface; record mobile-only recruits as out of segment, not failed extension users.

## Open UX decisions

Whether the popup's focus behavior makes comparison too awkward; whether manual evidence entry saves time; minimum useful identity fields; preferred language; whether a chronological list beats a chart; and whether a side panel is justified by observed use. Resolve in the study rather than implementing all alternatives.
