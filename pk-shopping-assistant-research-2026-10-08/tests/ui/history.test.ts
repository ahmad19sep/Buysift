import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { Observation } from '../../src/domain/types.js';
import type { OfferEnvelopeV1 } from '../../src/storage/types.js';
import { activeObservations, canCorrect, comparisonView, historyView, latestObservation } from '../../src/ui/popup/view-model.js';
import type { SavedOffer } from '../../src/ui/popup/view-model.js';
import { FIXED_NOW, idFactory, syntheticSave } from '../storage/helpers.js';

const NOW = new Date(FIXED_NOW); // 8 Oct 2026, 12:00 Pakistan time

function offerWith(entries: Array<{ at: string; price: number; replacesIndex?: number; revision?: number }>): SavedOffer {
  const ids = idFactory(5000);
  const base = syntheticSave(idFactory(10));
  const observations: Observation[] = [];
  for (const entry of entries) {
    const replaced = entry.replacesIndex === undefined ? null : observations[entry.replacesIndex]?.id ?? null;
    observations.push({
      ...base.observation,
      id: ids(),
      operationId: ids(),
      observedAt: entry.at,
      receivedAt: entry.at,
      variantRevision: entry.revision ?? 1,
      price: { ...base.observation.price, item: { amountMinor: entry.price * 100, currency: 'PKR', minorUnit: 2 } },
      replacesObservationId: replaced,
    });
  }
  const envelope: OfferEnvelopeV1 = {
    schemaVersion: 1,
    offerId: base.confirmed.offer.id,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    localPurposeVersion: 1,
    confirmed: base.confirmed,
    draft: null,
    observations,
    operationIds: observations.map(observation => observation.operationId),
  };
  return envelope as SavedOffer;
}

test('one entry shows its time and never a trend or lowest label', () => {
  const view = historyView(offerWith([{ at: '2026-10-08T06:00:00.000Z', price: 7000 }]), NOW);
  assert.equal(view.summary, '1 observation. One entry cannot show a trend.');
  assert.ok(view.facts.some(fact => fact.startsWith('First recorded: 8 Oct 2026, 11:00 PKT')));
  assert.equal(view.facts.filter(fact => /comparable observations/.test(fact)).length, 0, 'the headline states it once');
  assert.ok(!view.facts.some(fact => /lowest/i.test(fact)));
  assert.equal(view.entries[0]?.status, 'daily_sample');
});

test('sparse days keep their gaps and the lowest label names its sample and window', () => {
  const view = historyView(offerWith([
    { at: '2026-10-01T06:00:00.000Z', price: 7200 },
    { at: '2026-10-02T06:00:00.000Z', price: 6900 },
    { at: '2026-10-06T06:00:00.000Z', price: 7100 },
  ]), NOW);
  assert.equal(view.summary, '3 observations across 3 days with the current details.');
  assert.ok(view.facts.includes('Lowest in your 3 saved comparable daily samples (1 Oct–6 Oct): PKR 6,900 on 2 Oct 2026'));
  assert.ok(view.facts.some(fact => fact.startsWith('No entry on 3 days between 2 Oct and 6 Oct')));
  assert.ok(!view.facts.some(fact => /lowest ever/i.test(fact)));
});

test('repeated same-day entries count once, using the later entry on that Pakistan day', () => {
  // 19:30 and 20:30 UTC on 1 Oct are both 2 Oct in Pakistan (UTC+5).
  const view = historyView(offerWith([
    { at: '2026-10-01T19:30:00.000Z', price: 7000 },
    { at: '2026-10-01T20:30:00.000Z', price: 6800 },
  ]), NOW);
  assert.ok(view.facts.some(fact => fact.startsWith('Counted daily samples: 1')));
  const statuses = view.entries.map(entry => entry.status);
  assert.deepEqual(statuses, ['daily_sample', 'same_day']);
});

test('older, future and earlier-detail entries stay listed but are not counted', () => {
  const view = historyView(offerWith([
    { at: '2026-06-01T06:00:00.000Z', price: 6000 },
    { at: '2026-10-08T06:00:00.000Z', price: 7000 },
    { at: '2026-10-09T06:00:00.000Z', price: 5000 },
    { at: '2026-10-07T06:00:00.000Z', price: 6500, revision: 2 },
  ]), NOW);
  const byPrice = new Map(view.entries.map(entry => [entry.text.match(/Item (PKR [\d,]+)/)?.[1], entry]));
  assert.equal(byPrice.get('PKR 6,000')?.status, 'older');
  assert.equal(byPrice.get('PKR 5,000')?.status, 'future');
  assert.equal(byPrice.get('PKR 6,500')?.status, 'earlier_details');
  assert.equal(byPrice.get('PKR 6,500')?.correctable, false);
  assert.ok(view.facts.some(fact => fact.startsWith('Saved entries: 4')));
  assert.ok(view.facts.some(fact => fact.startsWith('Counted daily samples: 1')));
});

test('a correction replaces an entry in summaries while the original stays visible', () => {
  const offer = offerWith([
    { at: '2026-10-07T06:00:00.000Z', price: 70000 },
    { at: '2026-10-07T06:00:00.000Z', price: 7000, replacesIndex: 0 },
  ]);
  assert.equal(activeObservations(offer).length, 1);
  assert.equal(latestObservation(offer).price.item.amountMinor, 700_000);
  assert.equal(canCorrect(offer, offer.observations[0]!), false, 'a corrected entry cannot be corrected again');
  assert.equal(canCorrect(offer, offer.observations[1]!), true);
  const view = historyView(offer, NOW);
  const original = view.entries.find(entry => entry.observationId === offer.observations[0]!.id);
  const correction = view.entries.find(entry => entry.observationId === offer.observations[1]!.id);
  assert.equal(original?.status, 'corrected');
  assert.equal(correction?.status, 'daily_sample');
  assert.match(correction?.text ?? '', /Correction of the 7 Oct 2026, 11:00 PKT entry \(was item PKR 70,000/);
  assert.ok(view.facts.some(fact => fact === 'Saved entries: 2 (1 corrected)'));
});

test('comparison cards show source, seller, region/pack, eligibility and recorded time', () => {
  const view = comparisonView([offerWith([{ at: FIXED_NOW, price: 7000 }]), offerWith([{ at: FIXED_NOW, price: 6900 }])]);
  const card = view.offers[0]!;
  assert.equal(card.source, 'Entered by you · provisional');
  assert.equal(card.seller, 'Seller not entered');
  assert.equal(card.regionPack, 'region not entered / receiver/pack not entered');
  assert.equal(card.eligibility, 'Not entered');
  assert.equal(card.recorded, '8 Oct 2026, 12:00 PKT · not automatically checked');
  assert.doesNotMatch(view.summary, /Lowest/);
});
