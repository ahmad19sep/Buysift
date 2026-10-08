# Bounded public-interface audit

**Date: 8 October 2026. Browser-observation window: approximately 07:45–07:57 UTC (12:45–12:57 Pakistan time). Classification: OBSERVED IN TEST.** This is a small purposive interface/content check, not an installed-extension test, checkout audit or representative competitor benchmark.

## Procedure and boundaries

The sample was chosen from manufacturer-distinguishable mouse models identified during desk research. Public Farq and Flashi pages were opened in a remote Chrome browser. The same query, `Logitech M650`, was submitted to each site's visible search form. After the page finished populating, displayed product/offer information was inspected and one relevant outbound retailer link per service was followed. A second Farq product page for M185 was inspected for internal stock/price consistency.

Two comparison services, two search queries, two Farq product-detail pages and two linked retailer product pages were involved. Only two retailer item-price comparisons were completed. No random sampling, signed-in personalization controls, location selection, cart/checkout, stock reservation, warranty adjudication, purchase, notification signup, software download or extension installation occurred.

Initial Farq search showed zero products before asynchronous results appeared. The later populated state controls this record. An initial loading state must not be reported as missing product coverage.

## Observations

| ID | Page / action | Bounded observation | What it does not establish |
| --- | --- | --- | --- |
| UI01 / R01 | Farq search `Logitech M650` | Populated page showed 12 products and 9 stores, including relevant M650 variants and other mice/webcams. | Store count was not independently audited. Related search results are not evidence of an automatic exact-match error. |
| UI02 / R02–R03 | Farq M650 Graphite, then its TechArc link | Farq showed PKR 7,000 for TechArc; linked TechArc page also displayed PKR 7,000 for the graphite M650. TechArc displayed SKU 910-006262 and a one-year warranty. | No complete manufacturer/region/pack equivalence or delivered-cost check. A retailer badge/description is a retailer claim, not independently verified authorization. |
| UI03 / R02–R03 | Same offer, availability/context | Farq marked TechArc in stock and free delivery. TechArc asked visitors to confirm price/stock; the inspected area did not establish universally free shipping. | No confirmed stock or delivery-price agreement. An add-to-cart control is not a stock guarantee. |
| UI04 / R04 | Farq M185 | Best-price headline PKR 2,900 from Galaxy.pk; the same page marked both listed offers out of stock and its breakdown reported zero in stock. | An internal presentation discrepancy, not independently established retailer stock or a site-wide error rate. |
| UI05 / R05 | Flashi search `Logitech M650` | Three cards: M650 L grey at PKR 8,930, M650 white at PKR 8,930, and M650 graphite at PKR 9,999. A global price-range saving of PKR 1,069 was shown. | The result set contains different variants; search results may legitimately be related. No claim that a dedicated exact-match engine merged them was tested. |
| UI06 / R05–R06 | Flashi M650 white, then its Naheed link | Both displayed PKR 8,930. Flashi labeled the offer in stock; Naheed's product page explicitly displayed out of stock. | This is one stock-label disagreement. Timing, refresh policy and other context could explain it; cause and true inventory were not established. |

**Interpretation:** the services returned meaningful public results, and both checked item amounts agreed at the time observed. There were material availability/presentation questions. Price, stock, variant and delivered-cost accuracy must therefore be measured separately. Do not publish a “100% accurate” price claim or a “50% inaccurate” competitor stock claim from these two purposive checks.

## Exact navigation references

These are the observed public URLs, preserved for reproducibility. They are evidence references, not approved integration targets or a licensed product dataset.

- **R01:** [Farq query](https://farq.pk/search?q=Logitech%20M650)
- **R02:** [Farq M650 Graphite](https://farq.pk/product/logitech-signature-m650-wireless-mouse-graphite)
- **R03:** [Linked TechArc offer](https://techarc.pk/logitech-signature-m650-wireless-mouse-graphite/?utm_source=farq)
- **R04:** [Farq M185](https://farq.pk/product/logitech-m185-wireless-mouse)
- **R05:** [Flashi query](https://flashi.pk/?q=Logitech+M650)
- **R06:** [Linked Naheed offer](https://www.naheed.pk/logitech-signature-wireless-mouse-white-m650)

Later text-retrieval requests for the five product/query pages R02–R06 failed, although the browser views above were accessible. Browser observations and web-retrieval results are kept distinct. No access-control workaround was used.

## Separate desk-content check

PUB-FARQ-001, recorded in [M33](sources.md#m33), inspected a retrieved AX55 router page. It showed an out-of-stock offer in its best-price presentation. This was outside the chosen mouse category and involved zero outbound retailer checks. It is separate from the live mouse sample and is not added to its denominator.

## Reproducible next audit

Before any broad performance claim, pre-register a small set of exact mouse model/MPN/variant tasks, including M650 versus M650 L, M185 color/pack cases and at least one unavailable offer. For each service record query, timestamp, locale, exact URL, result type, manufacturer identity evidence, seller, stock, item price, eligibility, shipping scope, observation age and correction route. Visit each selected retailer within a bounded time interval and record what remains unverifiable without checkout.

Record price agreement, stock-label agreement, exact-variant precision, delivered-price completeness and abstention as separate measures with denominators. Do not count missing/blocked pages as incorrect prices. Repeat on another date and retain contradictory outcomes. Functional history/alerts tests require additional approved accounts or installation and remain NOT EXECUTED.
