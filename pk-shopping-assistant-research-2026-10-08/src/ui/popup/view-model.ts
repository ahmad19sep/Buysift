import {
  compareOffers,
  summarizeHistory,
  summarizePriceComponents,
} from '../../domain/index.js';
import type {
  ComparableOfferSnapshot,
  ComparisonResult,
  Money,
  Observation,
  PriceComponents,
} from '../../domain/index.js';
import type { ConfirmedOffer, OfferEnvelopeV1 } from '../../storage/types.js';
import { formatPkr } from './form.js';

/** A saved envelope that has a confirmed offer; draft-only envelopes are not notebook offers. */
export type SavedOffer = OfferEnvelopeV1 & { confirmed: ConfirmedOffer };

const SIZE_LABELS: Record<string, string> = { small_medium: 'Small/medium', large: 'Large' };
const HAND_LABELS: Record<string, string> = { right: 'Right hand', left: 'Left hand', ambidextrous: 'Ambidextrous' };
const CONDITION_LABELS: Record<string, string> = { new: 'New', refurbished: 'Refurbished', used: 'Used' };
const STOCK_LABELS: Record<string, string> = {
  in_stock: 'In stock, per your entry',
  out_of_stock: 'Not available in the recorded offer.',
  preorder: 'Preorder',
  unknown: 'Availability not confirmed.',
};
const PAYMENT_LABELS: Record<string, string> = {
  standard: 'standard payment',
  cod: 'cash on delivery',
  specified_card: 'specified card',
};
const MISSING_LABELS: Record<string, string> = {
  item: 'Item price',
  shipping: 'Delivery cost not entered.',
  tax: 'Tax treatment not entered.',
  mandatory_fees: 'Mandatory fees not confirmed complete.',
  additional_discount: 'Additional discount not confirmed.',
  location_scope: 'Delivery area not entered.',
  payment_context: 'Payment method not entered.',
};

export function isSavedOffer(envelope: OfferEnvelopeV1): envelope is SavedOffer {
  return envelope.confirmed !== null;
}

/** The most recently observed accepted entry; ties keep the later saved entry. */
export function latestObservation(envelope: SavedOffer): Observation {
  let latest = envelope.observations[0] as Observation;
  for (const observation of envelope.observations) {
    if (Date.parse(observation.observedAt) >= Date.parse(latest.observedAt)) latest = observation;
  }
  return latest;
}

export function formatRecordedAt(iso: string): string {
  const epoch = Date.parse(iso);
  if (!Number.isFinite(epoch)) return 'Time unavailable';
  const text = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(epoch);
  return `${text} PKT`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function identityText(confirmed: ConfirmedOffer): string {
  const { variant, offer } = confirmed;
  return [
    `${confirmed.product.brand} ${variant.model}`,
    variant.size.state === 'known' ? SIZE_LABELS[variant.size.value] ?? variant.size.value : 'Size not entered',
    variant.handedness.state === 'known'
      ? HAND_LABELS[variant.handedness.value] ?? variant.handedness.value
      : 'Handedness not entered',
    variant.color.state === 'known' ? variant.color.value : 'Color not entered',
    offer.condition.state === 'known'
      ? CONDITION_LABELS[offer.condition.value] ?? offer.condition.value
      : 'Condition not entered',
  ].join(' · ');
}

export function warrantyText(confirmed: ConfirmedOffer): string {
  const warranty = confirmed.offer.warranty;
  if (warranty.state === 'unknown') return 'Provider not entered';
  const kind = warranty.value.kind === 'seller' ? 'Seller' : 'Manufacturer';
  return `${kind} (${warranty.value.provider}), ${warranty.value.months} months`;
}

export function termsText(confirmed: ConfirmedOffer): string {
  const seller = confirmed.seller.label.state === 'known' ? `Seller: ${confirmed.seller.label.value}` : 'Seller not entered';
  const eligibility = {
    public: 'Price available to anyone under the entered conditions',
    conditional: `This price requires ${confirmed.offer.eligibilityDetails.join('; ') || 'a stated condition'}`,
    personalized: 'Personalized price',
    unknown: 'Who can use this price is not entered',
  }[confirmed.offer.eligibility];
  return [`${confirmed.retailer.label}`, seller, `Warranty: ${warrantyText(confirmed)}`, eligibility].join(' · ');
}

function moneyOrNone(money: Money, noneLabel: string): string {
  return money.amountMinor === 0 ? noneLabel : formatPkr(money);
}

export function componentsText(price: PriceComponents): string {
  const delivery = price.shipping.state === 'known'
    ? `Delivery: ${moneyOrNone(price.shipping.value, 'free, explicitly confirmed')}`
    : 'Delivery: not entered';
  let tax = 'Tax: not entered';
  if (price.tax.state === 'known') {
    tax = price.tax.value.includedInItem
      ? 'Tax: included per your entry'
      : `Tax: ${formatPkr(price.tax.value.additional)} additional`;
  }
  let fees = 'Mandatory fees: not entered';
  if (price.mandatoryFees.state === 'known') {
    const cod = price.mandatoryFees.value.items.find(fee => fee.kind === 'cod');
    const codText = cod === undefined ? 'no COD fee' : `COD fee ${formatPkr(cod.amount)}`;
    fees = price.mandatoryFees.value.complete
      ? `Mandatory fees: ${codText}, list confirmed complete`
      : `Mandatory fees: ${codText}, list not confirmed complete`;
  }
  let discount = 'Additional discount: not confirmed';
  if (price.additionalDiscount.state === 'known') {
    const value = price.additionalDiscount.value;
    discount = value.amount.amountMinor === 0 && value.conditions.length === 0
      ? 'Additional discount: none'
      : `Additional discount: ${formatPkr(value.amount)}${value.conditions.length > 0 ? ` if ${value.conditions.join('; ')}` : ''}`;
  }
  const area = price.locationScope.state === 'known' ? `Area: ${price.locationScope.value}` : 'Area: not entered';
  const payment = price.paymentContext.state === 'known'
    ? `Payment: ${PAYMENT_LABELS[price.paymentContext.value] ?? price.paymentContext.value}`
    : 'Payment: not entered';
  return [delivery, tax, fees, discount, area, payment].join(' · ');
}

/** States the known amount without turning unknown components into zero. */
export function priceConclusion(price: PriceComponents): string {
  const summary = summarizePriceComponents(price);
  if (summary.deliveredTotal !== null) return `${formatPkr(summary.deliveredTotal)} delivered under entered conditions`;
  if (summary.item === null) return 'Not enough information yet';
  const missing = summary.missing.filter(entry => entry !== 'item');
  const words: Record<string, string> = {
    shipping: 'delivery',
    tax: 'tax',
    mandatory_fees: 'mandatory fees',
    additional_discount: 'additional discount',
    location_scope: 'delivery area',
    payment_context: 'payment method',
  };
  return `${formatPkr(summary.item)} + ${missing.map(entry => words[entry] ?? entry).join(', ')} not entered`;
}

export function attentionItems(envelope: SavedOffer): string[] {
  const { confirmed } = envelope;
  const observation = latestObservation(envelope);
  const items: string[] = [];
  // Mirrors the evidence the domain comparison requires before it can call two offers the same.
  const evidence = [
    confirmed.variant.mpn,
    confirmed.variant.size,
    confirmed.variant.handedness,
    confirmed.variant.color,
    confirmed.variant.region,
    confirmed.variant.receiverOrPack,
    confirmed.seller.label,
    confirmed.offer.condition,
    confirmed.offer.warranty,
  ];
  for (const entry of evidence) if (entry.state === 'unknown') items.push(entry.reason);
  const warranty = confirmed.offer.warranty;
  if (warranty.state === 'known' && warranty.value.scope.state === 'unknown') items.push(warranty.value.scope.reason);
  if (confirmed.offer.eligibility === 'unknown') items.push('Who can use this price is not entered.');
  const summary = summarizePriceComponents(observation.price);
  for (const missing of summary.missing) {
    const label = MISSING_LABELS[missing];
    if (label !== undefined && missing !== 'item') items.push(label);
  }
  if (observation.stock === 'unknown' || observation.stock === 'out_of_stock') {
    items.push(STOCK_LABELS[observation.stock] as string);
  }
  return items;
}

/** Groups missing details into at most four short lines instead of a warning wall. */
export function attentionSummary(envelope: SavedOffer): string[] {
  const { confirmed } = envelope;
  const observation = latestObservation(envelope);
  const lines: string[] = [];
  const missing = (entries: ReadonlyArray<[boolean, string]>): string[] =>
    entries.filter(([isMissing]) => isMissing).map(([, label]) => label);
  const { variant, offer, seller } = confirmed;
  const identity = missing([
    [variant.mpn.state === 'unknown', 'part number'],
    [variant.size.state === 'unknown', 'size'],
    [variant.handedness.state === 'unknown', 'handedness'],
    [variant.color.state === 'unknown', 'color'],
    [variant.region.state === 'unknown', 'region'],
    [variant.receiverOrPack.state === 'unknown', 'receiver or pack'],
  ]);
  if (identity.length > 0) lines.push(`Identity not entered: ${identity.join(', ')}.`);
  const terms = missing([
    [seller.label.state === 'unknown', 'seller'],
    [offer.condition.state === 'unknown', 'condition'],
    [offer.warranty.state === 'unknown', 'warranty provider'],
    [offer.warranty.state === 'known' && offer.warranty.value.scope.state === 'unknown', 'warranty scope'],
    [offer.eligibility === 'unknown', 'who can use this price'],
  ]);
  if (terms.length > 0) lines.push(`Offer terms not entered: ${terms.join(', ')}.`);
  const summary = summarizePriceComponents(observation.price);
  const words: Record<string, string> = {
    shipping: 'delivery cost',
    tax: 'tax',
    mandatory_fees: 'complete mandatory fees',
    additional_discount: 'additional discount',
    location_scope: 'delivery area',
    payment_context: 'payment method',
  };
  const price = summary.missing.filter(entry => entry !== 'item').map(entry => words[entry] ?? entry);
  if (price.length > 0) lines.push(`Price details not entered: ${price.join(', ')}.`);
  if (observation.stock === 'unknown' || observation.stock === 'out_of_stock') lines.push(stockText(observation));
  return lines;
}

export function recordStateText(envelope: SavedOffer): string {
  return attentionItems(envelope).length === 0 ? 'Ready for provisional comparison.' : 'Saved — details needed.';
}

export function stockText(observation: Observation): string {
  return STOCK_LABELS[observation.stock] ?? 'Availability not confirmed.';
}

export interface HistoryEntryView {
  text: string;
  earlier: boolean;
}

export interface HistoryView {
  summary: string;
  entries: HistoryEntryView[];
}

/** Lists the user's own entries; it never fills gaps or claims a lowest-ever price. */
export function historyView(envelope: SavedOffer, now: Date): HistoryView {
  const { variant, offer } = envelope.confirmed;
  const sorted = [...envelope.observations].sort((left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt));
  const entries = sorted.map(observation => {
    const earlier = observation.variantRevision !== variant.identityRevision
      || observation.offerContextRevision !== offer.contextRevision;
    const prefix = earlier ? 'Earlier details · ' : '';
    return {
      text: `${prefix}${formatRecordedAt(observation.observedAt)} · Item ${formatPkr(observation.price.item)} · ${priceConclusion(observation.price)} · ${stockText(observation)}`,
      earlier,
    };
  });
  const summary = summarizeHistory(envelope.observations, {
    offerId: offer.id,
    variantRevision: variant.identityRevision,
    offerContextRevision: offer.contextRevision,
    priceBasis: 'item',
    locationScope: null,
    paymentContext: null,
  }, now);
  if (envelope.observations.length === 0) return { summary: 'No observations yet.', entries };
  const parts: string[] = [];
  const count = envelope.observations.length;
  parts.push(`${count} observation${count === 1 ? '' : 's'} saved`);
  if (summary.dailyCount > 0 && summary.firstObservedAt !== null && summary.lastObservedAt !== null) {
    parts.push(`${summary.dailyCount} day${summary.dailyCount === 1 ? '' : 's'} with current details in the 90-day window`);
    parts.push(`last recorded ${formatRecordedAt(summary.lastObservedAt)}`);
  }
  if (summary.dailyCount < 3) parts.push('Not enough comparable observations to assess this price');
  if (summary.excludedContextCount > 0) {
    parts.push(`${summary.excludedContextCount} recorded under earlier identity or offer details`);
  }
  if (summary.olderCount > 0) parts.push(`${summary.olderCount} older than 90 days, still stored`);
  if (summary.futureCount > 0) parts.push(`${summary.futureCount} with a future time, excluded`);
  if (summary.gaps.length > 0) {
    const gap = summary.gaps[summary.gaps.length - 1] as typeof summary.gaps[number];
    parts.push(`no observation recorded between ${gap.afterDate} and ${gap.beforeDate}`);
  }
  return { summary: `${parts.join(' · ')}.`, entries };
}

export function snapshotFor(envelope: SavedOffer): ComparableOfferSnapshot {
  const observation = latestObservation(envelope);
  const { product, variant, retailer, seller, offer } = envelope.confirmed;
  return { product, variant, retailer, seller, offer, price: observation.price, stock: observation.stock, sourceKind: 'manual' };
}

export interface ComparisonOfferView {
  heading: string;
  modelSize: string;
  conditionColor: string;
  warranty: string;
  itemPrice: string;
  deliveryFees: string;
  knownAmount: string;
}

export interface ComparisonView {
  summary: string;
  differences: string[];
  offers: ComparisonOfferView[];
}

const OFFER_LETTERS = ['A', 'B', 'C'] as const;

function deliveryFeesText(price: PriceComponents): string {
  const delivery = price.shipping.state === 'known' ? moneyOrNone(price.shipping.value, 'Free') : 'Not entered';
  let fees = 'fees not entered';
  if (price.mandatoryFees.state === 'known') {
    const total = price.mandatoryFees.value.items.reduce((sum, fee) => sum + fee.amount.amountMinor, 0);
    const amount = total === 0 ? 'none' : formatPkr({ amountMinor: total, currency: 'PKR', minorUnit: 2 });
    fees = price.mandatoryFees.value.complete ? `${amount} confirmed` : `${amount}, list incomplete`;
  }
  return `${delivery} / ${fees}`;
}

const CONTEXT_DIFFERENCE = 'delivery location or payment context differs';

const MISSING_REASONS = new Set([
  'no shared evidenced manufacturer identifier',
  'price eligibility is unknown',
  'identity is marked ambiguous',
]);

function missingLabel(reason: string): string {
  if (reason === 'no shared evidenced manufacturer identifier') return 'a shared part number';
  if (reason === 'price eligibility is unknown') return 'who can use the price';
  if (reason === 'identity is marked ambiguous') return 'an unambiguous identity';
  return reason.replace(/ is missing evidence$/, '');
}

const PRICE_REASON_TEXT: Record<string, string> = {
  'both offers are not evidenced in stock': 'availability is not confirmed for both',
  'both prices are not generally available': 'a price is conditional, personalized or not entered',
  'delivered price components are incomplete': 'delivered price details are incomplete',
  [CONTEXT_DIFFERENCE]: 'delivery area or payment method differs or is not entered',
};

/** One short line per pair: identity and terms first, price-ranking blockers only after they match. */
function describePair(heading: string, result: ComparisonResult): string {
  const termDifferences = result.reasons.filter(reason => reason.endsWith(' differs') && reason !== CONTEXT_DIFFERENCE);
  if (result.classification === 'mismatch') return `${heading} are different: ${termDifferences.join(', ')}.`;
  if (result.classification === 'insufficient_evidence') {
    const missing = result.reasons
      .filter(reason => reason.endsWith('missing evidence') || MISSING_REASONS.has(reason))
      .map(missingLabel);
    return `${heading} cannot be confirmed as the same mouse and terms. Missing: ${missing.join(', ')}.`;
  }
  if (result.rankingEligible) return `${heading} match on the entered identity and terms.`;
  const blockers = result.reasons.map(reason => PRICE_REASON_TEXT[reason]).filter((text): text is string => text !== undefined);
  return `${heading} match on the entered identity and terms, but their prices cannot be ranked: ${blockers.join('; ')}.`;
}

/**
 * Compares two or three saved offers pairwise. Identity and terms are reported before
 * prices, and a lowest amount is named only when every pair is ranking-eligible.
 */
export function comparisonView(envelopes: readonly SavedOffer[]): ComparisonView {
  const labelled = envelopes.slice(0, 3).map((envelope, index) => ({
    envelope,
    letter: OFFER_LETTERS[index] as string,
    snapshot: snapshotFor(envelope),
  }));
  const pairs: Array<{ left: string; right: string; result: ComparisonResult }> = [];
  for (let left = 0; left < labelled.length; left += 1) {
    for (let right = left + 1; right < labelled.length; right += 1) {
      const a = labelled[left] as typeof labelled[number];
      const b = labelled[right] as typeof labelled[number];
      pairs.push({ left: a.letter, right: b.letter, result: compareOffers(a.snapshot, b.snapshot, 'delivered') });
    }
  }
  const differences = pairs.map(pair => describePair(`Offer ${pair.left} and Offer ${pair.right}`, pair.result));

  let summary: string;
  if (pairs.length === 0) {
    summary = 'Select two or three offers to compare.';
  } else if (pairs.some(pair => pair.result.classification === 'mismatch')) {
    summary = 'These are not the same mouse and terms. Treat them as alternatives; no savings claim can be made.';
  } else if (pairs.some(pair => pair.result.classification === 'insufficient_evidence')) {
    summary = 'A complete comparison needs more entered details. No savings claim can be made.';
  } else if (pairs.every(pair => pair.result.rankingEligible)) {
    const amounts = labelled.map(entry => ({
      letter: entry.letter,
      amount: summarizePriceComponents(entry.snapshot.price).deliveredTotal as Money,
    }));
    const lowest = Math.min(...amounts.map(entry => entry.amount.amountMinor));
    const winners = amounts.filter(entry => entry.amount.amountMinor === lowest);
    const lowestMoney = (winners[0] as typeof winners[number]).amount;
    summary = winners.length === amounts.length
      ? `All selected offers have the same known delivered amount: ${formatPkr(lowestMoney)}. Provisional, based on your entries.`
      : `Lowest known delivered amount: Offer ${winners.map(entry => entry.letter).join(' and Offer ')}, ${formatPkr(lowestMoney)} under entered conditions. Provisional, based on your entries; check the shop before deciding.`;
  } else {
    summary = 'The entered identity and terms match, but these prices cannot be ranked yet. No savings claim can be made.';
  }

  const offers = labelled.map(entry => {
    const { confirmed } = entry.envelope;
    const price = entry.snapshot.price;
    const summaryPrice = summarizePriceComponents(price);
    const size = confirmed.variant.size.state === 'known'
      ? SIZE_LABELS[confirmed.variant.size.value] ?? confirmed.variant.size.value
      : 'size not entered';
    const condition = confirmed.offer.condition.state === 'known'
      ? CONDITION_LABELS[confirmed.offer.condition.value] ?? confirmed.offer.condition.value
      : 'Condition not entered';
    const color = confirmed.variant.color.state === 'known' ? confirmed.variant.color.value : 'color not entered';
    return {
      heading: `Offer ${entry.letter} · ${confirmed.retailer.label}`,
      modelSize: `${confirmed.product.brand} ${confirmed.variant.model} / ${size}`,
      conditionColor: `${condition} / ${color}`,
      warranty: warrantyText(confirmed),
      itemPrice: summaryPrice.item === null ? 'Not entered' : formatPkr(summaryPrice.item),
      deliveryFees: deliveryFeesText(price),
      knownAmount: `${priceConclusion(price)} · ${stockText(latestObservation(entry.envelope))}`,
    };
  });
  return { summary, differences, offers };
}
