import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { STORAGE_WARNING_BYTES } from '../../src/domain/limits.js';
import { LocalNotebook } from '../../src/storage/notebook.js';
import { CONSENT_KEY, CONTROL_KEY, StorageError } from '../../src/storage/types.js';
import type { OfferEnvelopeV1 } from '../../src/storage/types.js';
import { FIXED_NOW, MemoryArea, idFactory, syntheticSave } from './helpers.js';

function notebook(area: MemoryArea, start = 9000): LocalNotebook {
  return new LocalNotebook(area, { now: () => FIXED_NOW, uuid: idFactory(start) });
}

async function consented(area = new MemoryArea()): Promise<{ area: MemoryArea; book: LocalNotebook }> {
  const book = notebook(area);
  assert.equal((await book.initialize()).state, 'ready');
  await book.acceptConsent(idFactory(8000)());
  return { area, book };
}

async function rejectsWith(promise: Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => error instanceof StorageError && error.code === code);
}

test('declining the notice on first use writes nothing and saving requires acceptance', async () => {
  const area = new MemoryArea();
  const book = notebook(area);
  await book.initialize();
  await book.declineConsent(idFactory(1)());
  assert.equal(area.data.size, 0);
  assert.equal(area.setCalls, 0);
  await rejectsWith(book.saveOffer(syntheticSave(idFactory(10))), 'consent_required');
  await rejectsWith(book.saveDraft(idFactory(50)(), { updatedAt: FIXED_NOW, fields: { brand: 'x' } }), 'consent_required');
  assert.equal(area.data.size, 0);
});

test('a failed notice write is reported and leaves no acceptance or shopping data', async () => {
  const area = new MemoryArea();
  const book = notebook(area);
  await book.initialize();
  area.failNextSets = 1;
  await rejectsWith(book.acceptConsent(idFactory(1)()), 'write_failed');
  assert.equal(await book.getConsent(), null);
  assert.equal(area.data.size, 0);
  const accepted = await book.acceptConsent(idFactory(2)());
  assert.equal(accepted.acceptedAt, FIXED_NOW);
  assert.notEqual(area.raw(CONSENT_KEY), undefined);
});

test('an acknowledged save survives closing and reopening the popup; retries are idempotent', async () => {
  const { area, book } = await consented();
  const input = syntheticSave(idFactory(10));
  const saved = await book.saveOffer(input);
  assert.equal(saved.duplicate, false);
  assert.equal(saved.capacity.offerCount, 1);
  assert.equal(saved.capacity.observationCount, 1);

  // A retry of the same operation (for example after an ambiguous failure) does not duplicate data.
  const retry = await book.saveOffer(input);
  assert.equal(retry.duplicate, true);
  assert.equal(retry.envelope.observations.length, 1);

  const reopened = notebook(area, 9500);
  assert.equal((await reopened.initialize()).state, 'ready');
  const offers = await reopened.listOffers();
  assert.equal(offers.length, 1);
  assert.deepEqual(offers[0]?.confirmed, saved.envelope.confirmed);
  assert.equal(offers[0]?.observations[0]?.price.item.amountMinor, 700_000);
});

test('a failed write is not acknowledged, stores nothing, and the same operation can be retried', async () => {
  const { area, book } = await consented();
  const input = syntheticSave(idFactory(10));
  area.failNextSets = 1;
  await rejectsWith(book.saveOffer(input), 'write_failed');
  assert.equal((await notebook(area).listOffers()).length, 0);
  const retry = await book.saveOffer(input);
  assert.equal(retry.duplicate, false);
  assert.equal((await book.listOffers()).length, 1);
});

test('drafts persist separately from the immutable confirmed snapshot and restore after reopening', async () => {
  const { area, book } = await consented();
  const input = syntheticSave(idFactory(10));
  const saved = await book.saveOffer(input);
  const offerId = saved.envelope.offerId;
  await book.saveDraft(offerId, { updatedAt: FIXED_NOW, fields: { model: 'Aster One L', itemPrice: '6,500' } });

  const reopened = notebook(area);
  const envelope = await reopened.getOffer(offerId) as OfferEnvelopeV1;
  assert.equal(envelope.draft?.fields.model, 'Aster One L');
  assert.equal(envelope.confirmed?.variant.model, 'Aster One S', 'draft edits do not alter confirmed records');
  assert.equal(envelope.observations[0]?.identitySnapshot.model, 'Aster One S');

  // Only one new-offer draft exists at a time in the single editing window.
  const newDraftId = idFactory(400)();
  await reopened.saveDraft(newDraftId, { updatedAt: FIXED_NOW, fields: { brand: 'Partial' } });
  await rejectsWith(reopened.saveDraft(idFactory(500)(), { updatedAt: FIXED_NOW, fields: {} }), 'draft_conflict');
  assert.equal((await reopened.listOffers()).length, 1, 'draft-only records are not saved offers');
  assert.equal((await reopened.getCapacity()).offerCount, 1);

  await reopened.clearDraft(newDraftId);
  await reopened.clearDraft(offerId);
  assert.equal(await reopened.getOffer(newDraftId), null);
  assert.equal((await reopened.getOffer(offerId))?.draft, null);
});

test('invalid drafts and invalid confirmed records are rejected without writing', async () => {
  const { area, book } = await consented();
  const before = area.setCalls;
  await rejectsWith(book.saveDraft(idFactory(1)(), { updatedAt: FIXED_NOW, fields: { unexpected: 'x' } as never }), 'invalid_draft');
  await rejectsWith(book.saveDraft(idFactory(1)(), { updatedAt: 'yesterday', fields: {} }), 'invalid_draft');
  const input = syntheticSave(idFactory(10));
  const tampered = structuredClone(input);
  tampered.confirmed.offer.canonicalUrl = 'javascript:alert(1)';
  await rejectsWith(book.saveOffer(tampered), 'invalid_record');
  const mismatched = structuredClone(input);
  mismatched.observation.identitySnapshot = { ...mismatched.observation.identitySnapshot, model: 'Other' };
  await rejectsWith(book.saveOffer(mismatched), 'invalid_record');
  assert.equal(area.setCalls, before);
});

test('the 26th offer is rejected while observations on existing offers still fit', async () => {
  const { book } = await consented();
  const ids = idFactory(100);
  let firstOffer = syntheticSave(ids);
  for (let index = 0; index < 25; index += 1) {
    const input = syntheticSave(ids, { model: `Aster ${index}` });
    if (index === 0) firstOffer = input;
    await book.saveOffer(input);
  }
  assert.equal((await book.getCapacity()).offerCount, 25);
  await rejectsWith(book.saveOffer(syntheticSave(ids, { model: 'Aster 26' })), 'offer_limit');

  const operationId = ids();
  const observation = { ...firstOffer.observation, id: ids(), operationId };
  const added = await book.saveOffer({ confirmed: firstOffer.confirmed, observation, operationId, draft: null });
  assert.equal(added.capacity.offerCount, 25);
  assert.equal(added.capacity.observationCount, 26);
});

test('the 501st observation is rejected; metadata fixes, export and deletion remain available', async () => {
  const { area, book } = await consented();
  const ids = idFactory(1000);
  const input = syntheticSave(ids);
  const saved = await book.saveOffer(input);
  const envelope = structuredClone(saved.envelope);
  while (envelope.observations.length < 500) {
    const operationId = ids();
    envelope.observations.push({ ...input.observation, id: ids(), operationId });
    envelope.operationIds.push(operationId);
  }
  area.put(`offer:${envelope.offerId}`, envelope);
  const reopened = notebook(area);
  assert.equal((await reopened.initialize()).state, 'ready');
  assert.equal((await reopened.getCapacity()).observationCount, 500);

  const operationId = ids();
  await rejectsWith(reopened.saveOffer({
    confirmed: input.confirmed,
    observation: { ...input.observation, id: ids(), operationId },
    operationId,
    draft: null,
  }), 'observation_limit');

  const fixed = structuredClone(input.confirmed);
  fixed.retailer.label = 'Fictional Cedar Shop (corrected)';
  const metadata = await reopened.saveOffer({ confirmed: fixed, observation: null, operationId: ids(), draft: null });
  assert.equal(metadata.capacity.observationCount, 500);
  assert.equal(metadata.envelope.observations[0]?.retailerSnapshot.label, 'Fictional Cedar Shop', 'history keeps the original label');

  const exported = await reopened.exportData();
  assert.equal(exported.offers[0]?.observations.length, 500);
  const afterDelete = await reopened.deleteOffer(envelope.offerId);
  assert.equal(afterDelete.observationCount, 0);
});

test('byte growth past the application cap is rejected and the 4 MiB warning is reported', async () => {
  const { area, book } = await consented();
  area.put('padding:test', 'x'.repeat(STORAGE_WARNING_BYTES));
  const capacity = await book.getCapacity();
  assert.equal(capacity.warning, true);
  const saved = await book.saveOffer(syntheticSave(idFactory(10)));
  assert.equal(saved.capacity.warning, true);

  area.put('padding:test', 'x'.repeat(5 * 1024 * 1024 - 64 * 1024));
  await rejectsWith(book.saveOffer(syntheticSave(idFactory(200), { model: 'Over cap' })), 'control_reserve');
  assert.equal((await book.listOffers()).length, 1, 'no silent eviction of the existing offer');
  const exported = await book.exportData();
  assert.equal(exported.offers.length, 1);
});

test('delete-all removes records, keeps consent unless reset, and resumes after interruption', async () => {
  const { area, book } = await consented();
  await book.saveOffer(syntheticSave(idFactory(10)));
  await book.saveOffer(syntheticSave(idFactory(100), { model: 'Second' }));

  // Interrupted after the control record was written: removal fails.
  area.failNextRemoves = 1;
  await rejectsWith(book.deleteAll(idFactory(700)()), 'delete_failed');
  assert.notEqual(area.raw(CONTROL_KEY), undefined, 'the prepared control record survives the failure');

  const reopened = notebook(area);
  const initialization = await reopened.initialize();
  assert.equal(initialization.resumedOperation, 'delete_all');
  assert.equal(initialization.state, 'ready');
  assert.equal((await reopened.listOffers()).length, 0);
  assert.equal(area.raw(CONTROL_KEY), undefined);
  assert.notEqual(await reopened.getConsent(), null);

  await reopened.saveOffer(syntheticSave(idFactory(300), { model: 'Third' }));
  await reopened.deleteAll(idFactory(701)(), true);
  assert.equal(area.data.size, 0);
});

test('a deletion that does not take effect is reported rather than claimed', async () => {
  const { area, book } = await consented();
  const saved = await book.saveOffer(syntheticSave(idFactory(10)));
  area.ignoreRemoves = true;
  await rejectsWith(book.deleteOffer(saved.envelope.offerId), 'delete_failed');
  area.ignoreRemoves = false;
  assert.equal((await book.listOffers()).length, 1);
});

test('a version 0 record migrates through a staged copy and the prior version is kept on failure', async () => {
  const { area, book } = await consented();
  const saved = await book.saveOffer(syntheticSave(idFactory(10)));
  const key = `offer:${saved.envelope.offerId}`;
  const { localPurposeVersion: _ignored, ...v0 } = { ...saved.envelope, schemaVersion: 0 };
  area.put(key, v0);

  const migrated = notebook(area);
  const result = await migrated.initialize();
  assert.equal(result.state, 'ready');
  assert.equal(result.resumedOperation, 'migration');
  assert.equal((area.raw(key) as { schemaVersion: number }).schemaVersion, 1);
  assert.equal(area.raw(CONTROL_KEY), undefined);

  // A failed staging write leaves the version 0 record untouched and opens read-only recovery.
  area.put(key, v0);
  area.failNextSets = 1;
  const failing = notebook(area);
  const failed = await failing.initialize();
  assert.equal(failed.state, 'recovery_read_only');
  assert.ok(failed.issues.some(issue => issue.kind === 'migration_failed'));
  assert.equal((area.raw(key) as { schemaVersion: number }).schemaVersion, 0);
  await rejectsWith(failing.saveOffer(syntheticSave(idFactory(500), { model: 'Blocked' })), 'recovery_read_only');
});

test('newer or corrupt records open read-only recovery and stay exportable, not silently cleared', async () => {
  const { area, book } = await consented();
  const saved = await book.saveOffer(syntheticSave(idFactory(10)));
  const newer = { ...saved.envelope, schemaVersion: 2 };
  area.put(`offer:${saved.envelope.offerId}`, newer);
  area.put('offer:00000000-0000-4000-8000-00000000abcd', { schemaVersion: 1, offerId: 'broken' });

  const reopened = notebook(area);
  const initialization = await reopened.initialize();
  assert.equal(initialization.state, 'recovery_read_only');
  assert.deepEqual(initialization.issues.map(issue => issue.kind).sort(), ['invalid_record', 'unsupported_schema']);
  await rejectsWith(reopened.saveOffer(syntheticSave(idFactory(200))), 'recovery_read_only');

  const exported = await reopened.exportData();
  assert.equal(exported.quarantined.length, 2);
  assert.equal(area.data.size, 3, 'records are preserved for recovery');

  await reopened.deleteOffer('00000000-0000-4000-8000-00000000abcd');
  await reopened.deleteOffer(saved.envelope.offerId);
  assert.equal((await reopened.initialize()).state, 'ready');
});

test('trusted-context or read failures open read-only recovery instead of guessing', async () => {
  const area = new MemoryArea();
  area.failRestrict = true;
  const restricted = await notebook(area).initialize();
  assert.equal(restricted.state, 'recovery_read_only');
  assert.equal(restricted.issues[0]?.kind, 'control_failure');

  const unreadable = new MemoryArea();
  unreadable.failReads = true;
  assert.equal((await notebook(unreadable).initialize()).state, 'recovery_read_only');
});
