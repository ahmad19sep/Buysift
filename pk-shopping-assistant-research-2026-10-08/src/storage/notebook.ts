import {
  MAX_OBSERVATIONS,
  MAX_ORDINARY_DATA_BYTES,
  STORAGE_CONTROL_RESERVE_BYTES,
  STORAGE_HARD_LIMIT_BYTES,
  STORAGE_WARNING_BYTES,
  assessCapacityMutation,
} from '../domain/limits.js';
import { LOCAL_PURPOSE_DECLARATION_VERSION } from '../domain/provenance.js';
import {
  CONSENT_KEY,
  CONTROL_KEY,
  MIGRATION_STAGE_KEY_PREFIX,
  NOTICE_VERSION,
  OFFER_KEY_PREFIX,
  STORAGE_SCHEMA_VERSION,
  StorageError,
} from './types.js';
import type {
  ConsentRecordV1,
  DeleteAllControlV1,
  InitializationResult,
  MigrationControlV1,
  NotebookExportV1,
  OfferDraft,
  OfferEnvelopeV1,
  RecoveryControlV1,
  RecoveryIssue,
  SaveOfferInput,
  SaveResult,
  StorageArea,
  StorageCapacity,
  StorageErrorCode,
} from './types.js';
import {
  StorageValidationError,
  migrateEnvelopeV0,
  migrationStageKey,
  offerIdFromKey,
  offerKey,
  storedSchemaVersion,
  validateConfirmedOffer,
  validateConsent,
  validateControl,
  validateDraft,
  validateEnvelopeV1,
  validateNewObservation,
  validateUtc,
  validateUuid,
} from './validation.js';

interface NotebookOptions {
  now?: () => string;
  uuid?: () => string;
}

interface CapacityState extends StorageCapacity {
  snapshot: {
    offerCount: number;
    observationCount: number;
    comparisonCount: number;
    ordinaryBytes: number;
    controlBytes: number;
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function entryBytes(key: string, value: unknown): number {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new StorageValidationError(key, 'cannot be serialized for local storage');
  return new TextEncoder().encode(JSON.stringify(key)).byteLength + new TextEncoder().encode(serialized).byteLength;
}

function isControlKey(key: string): boolean {
  return key === CONTROL_KEY || key.startsWith(MIGRATION_STAGE_KEY_PREFIX);
}

function storageMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function capacityError(reasons: readonly string[]): StorageError {
  let code: StorageErrorCode = 'storage_limit';
  let message = 'The notebook cannot store this change.';
  if (reasons.includes('offer_limit')) {
    code = 'offer_limit';
    message = 'The 25 saved-offer limit has been reached.';
  } else if (reasons.includes('observation_limit')) {
    code = 'observation_limit';
    message = 'The 500-observation limit has been reached.';
  } else if (reasons.includes('control_reserve')) {
    code = 'control_reserve';
    message = 'This change would consume the notebook recovery reserve.';
  }
  return new StorageError(code, message, reasons);
}

function controlIssue(message: string): RecoveryIssue {
  return { key: CONTROL_KEY, kind: 'control_failure', message };
}

export class LocalNotebook {
  private readonly area: StorageArea;
  private readonly now: () => string;
  private readonly uuid: () => string;
  private sequence: Promise<void> = Promise.resolve();
  private initialization: InitializationResult | null = null;

  constructor(area: StorageArea, options: NotebookOptions = {}) {
    this.area = area;
    this.now = options.now ?? (() => new Date().toISOString());
    this.uuid = options.uuid ?? (() => crypto.randomUUID());
  }

  initialize(): Promise<InitializationResult> {
    return this.enqueue(async () => await this.initializeUnsafe(true));
  }

  getInitializationResult(): InitializationResult | null {
    return this.initialization === null ? null : clone(this.initialization);
  }

  getConsent(): Promise<ConsentRecordV1 | null> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      const entries = await this.readAll();
      return this.consentFromEntries(entries);
    });
  }

  acceptConsent(operationId: string): Promise<ConsentRecordV1> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      this.requireWritable();
      const validatedOperationId = validateUuid(operationId, 'operationId');
      const entries = await this.readAll();
      const existing = this.consentFromEntries(entries);
      if (existing !== null && existing.noticeVersion === NOTICE_VERSION) return existing;
      const consent: ConsentRecordV1 = validateConsent({
        schemaVersion: STORAGE_SCHEMA_VERSION,
        noticeVersion: NOTICE_VERSION,
        acceptedAt: validateUtc(this.now(), 'acceptedAt'),
        operationId: validatedOperationId,
      });
      await this.write({ [CONSENT_KEY]: consent }, 'write_failed', 'The local notice acceptance could not be saved.');
      return consent;
    });
  }

  declineConsent(operationId: string): Promise<StorageCapacity> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      validateUuid(operationId, 'operationId');
      return await this.deleteAllUnsafe(operationId, true);
    });
  }

  listOffers(): Promise<OfferEnvelopeV1[]> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      const { envelopes } = this.readEnvelopes(await this.readAll());
      return envelopes.filter(envelope => envelope.confirmed !== null).map(clone);
    });
  }

  listDrafts(): Promise<Array<{ offerId: string; draft: OfferDraft; confirmed: boolean }>> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      const { envelopes } = this.readEnvelopes(await this.readAll());
      return envelopes
        .filter((envelope): envelope is OfferEnvelopeV1 & { draft: OfferDraft } => envelope.draft !== null)
        .map(envelope => ({ offerId: envelope.offerId, draft: clone(envelope.draft), confirmed: envelope.confirmed !== null }));
    });
  }

  getOffer(offerId: string): Promise<OfferEnvelopeV1 | null> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      const id = validateUuid(offerId, 'offerId');
      const key = offerKey(id);
      const raw = (await this.area.get(key))[key];
      if (raw === undefined) return null;
      try {
        return validateEnvelopeV1(raw, id, key);
      } catch (error) {
        throw new StorageError('invalid_record', `The stored offer ${id} is not valid.`, [storageMessage(error)]);
      }
    });
  }

  getDraft(offerId: string): Promise<OfferDraft | null> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      const id = validateUuid(offerId, 'offerId');
      const key = offerKey(id);
      const raw = (await this.area.get(key))[key];
      if (raw === undefined) return null;
      try {
        const envelope = validateEnvelopeV1(raw, id, key);
        return envelope.draft === null ? null : clone(envelope.draft);
      } catch (error) {
        throw new StorageError('invalid_record', `The stored draft ${id} is not valid.`, [storageMessage(error)]);
      }
    });
  }

  saveDraft(offerId: string, value: OfferDraft): Promise<{ envelope: OfferEnvelopeV1; capacity: StorageCapacity }> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      this.requireWritable();
      await this.requireConsent();
      const id = validateUuid(offerId, 'offerId');
      let draft: OfferDraft;
      try {
        draft = validateDraft(value);
      } catch (error) {
        throw new StorageError('invalid_draft', 'The draft contains an invalid field.', [storageMessage(error)]);
      }
      const entries = await this.readAll();
      const { envelopes } = this.readEnvelopes(entries);
      const draftOnly = envelopes.find(envelope => envelope.confirmed === null && envelope.offerId !== id);
      if (draftOnly !== undefined) {
        throw new StorageError('draft_conflict', 'Finish or cancel the existing new-offer draft first.');
      }
      const key = offerKey(id);
      const existingRaw = entries[key];
      let existing: OfferEnvelopeV1 | null = null;
      if (existingRaw !== undefined) existing = validateEnvelopeV1(existingRaw, id, key);
      const timestamp = validateUtc(this.now(), 'updatedAt');
      const candidate = validateEnvelopeV1({
        schemaVersion: STORAGE_SCHEMA_VERSION,
        offerId: id,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        localPurposeVersion: LOCAL_PURPOSE_DECLARATION_VERSION,
        confirmed: existing?.confirmed ?? null,
        draft,
        observations: existing?.observations ?? [],
        operationIds: existing?.operationIds ?? [],
      }, id);
      const candidateEntries = { ...entries, [key]: candidate };
      const before = this.capacityFromEntries(entries);
      const after = this.capacityFromEntries(candidateEntries);
      const assessment = assessCapacityMutation(before.snapshot, after.snapshot, 'metadata_fix');
      if (!assessment.allowed) throw capacityError(assessment.reasons);
      await this.write({ [key]: candidate }, 'write_failed', 'The draft could not be saved.');
      return { envelope: clone(candidate), capacity: this.publicCapacity(after) };
    });
  }

  clearDraft(offerId: string): Promise<StorageCapacity> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      const id = validateUuid(offerId, 'offerId');
      const key = offerKey(id);
      const entries = await this.readAll();
      const raw = entries[key];
      if (raw === undefined) return this.publicCapacity(this.capacityFromEntries(entries));
      let envelope: OfferEnvelopeV1;
      try {
        envelope = validateEnvelopeV1(raw, id, key);
      } catch (error) {
        throw new StorageError('invalid_record', 'The invalid record can be removed with delete offer.', [storageMessage(error)]);
      }
      if (envelope.draft === null) return this.publicCapacity(this.capacityFromEntries(entries));
      if (envelope.confirmed === null) {
        await this.remove(key, 'delete_failed', 'The draft could not be removed.');
        delete entries[key];
        return this.publicCapacity(this.capacityFromEntries(entries));
      }
      const candidate = validateEnvelopeV1({ ...envelope, draft: null, updatedAt: validateUtc(this.now(), 'updatedAt') }, id);
      await this.write({ [key]: candidate }, 'write_failed', 'The draft could not be cleared.');
      entries[key] = candidate;
      return this.publicCapacity(this.capacityFromEntries(entries));
    });
  }

  saveOffer(input: SaveOfferInput): Promise<SaveResult> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      this.requireWritable();
      await this.requireConsent();
      const operationId = validateUuid(input.operationId, 'operationId');
      let confirmed;
      let draft;
      try {
        confirmed = validateConfirmedOffer(input.confirmed);
        draft = input.draft === null ? null : validateDraft(input.draft);
      } catch (error) {
        throw new StorageError('invalid_record', 'The confirmed offer contains invalid data.', [storageMessage(error)]);
      }
      const id = confirmed.offer.id;
      const key = offerKey(id);
      const entries = await this.readAll();
      const existingRaw = entries[key];
      const existing = existingRaw === undefined ? null : validateEnvelopeV1(existingRaw, id, key);
      if (existing?.operationIds.includes(operationId) === true) {
        return { envelope: clone(existing), capacity: this.publicCapacity(this.capacityFromEntries(entries)), duplicate: true };
      }
      if (existing?.confirmed === null || existing === null) {
        if (input.observation === null) throw new StorageError('invalid_record', 'A new confirmed offer needs its first observation.');
      }
      let observation = null;
      if (input.observation !== null) {
        try {
          observation = validateNewObservation(input.observation, confirmed);
        } catch (error) {
          throw new StorageError('invalid_record', 'The observation does not match the confirmed offer.', [storageMessage(error)]);
        }
        if (observation.operationId !== operationId) {
          throw new StorageError('invalid_record', 'The observation operation ID does not match the save operation.');
        }
      }
      const timestamp = validateUtc(this.now(), 'updatedAt');
      const observations = [...(existing?.observations ?? [])];
      if (observation !== null) observations.push(observation);
      // The envelope validator also bounds this list; report it as the user-facing limit, not a format error.
      if (observations.length > MAX_OBSERVATIONS) throw capacityError(['observation_limit']);
      const candidate = validateEnvelopeV1({
        schemaVersion: STORAGE_SCHEMA_VERSION,
        offerId: id,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        localPurposeVersion: LOCAL_PURPOSE_DECLARATION_VERSION,
        confirmed,
        draft,
        observations,
        operationIds: [...(existing?.operationIds ?? []), operationId],
      }, id);
      const candidateEntries = { ...entries, [key]: candidate };
      const before = this.capacityFromEntries(entries);
      const after = this.capacityFromEntries(candidateEntries);
      const mutation = existing?.confirmed === null || existing === null
        ? 'create_offer'
        : observation === null ? 'metadata_fix' : 'add_observation';
      const assessment = assessCapacityMutation(before.snapshot, after.snapshot, mutation);
      if (!assessment.allowed) throw capacityError(assessment.reasons);
      await this.write({ [key]: candidate }, 'write_failed', 'The offer could not be saved.');
      return { envelope: clone(candidate), capacity: this.publicCapacity(after), duplicate: false };
    });
  }

  deleteOffer(offerId: string): Promise<StorageCapacity> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      const id = validateUuid(offerId, 'offerId');
      const key = offerKey(id);
      const entries = await this.readAll();
      if (entries[key] === undefined) return this.publicCapacity(this.capacityFromEntries(entries));
      await this.remove(key, 'delete_failed', 'The offer could not be deleted.');
      const verification = await this.area.get(key);
      if (verification[key] !== undefined) throw new StorageError('delete_failed', 'The offer is still present after deletion.');
      delete entries[key];
      this.initialization = null;
      return this.publicCapacity(this.capacityFromEntries(entries));
    });
  }

  deleteAll(operationId: string, resetConsent = false): Promise<StorageCapacity> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      return await this.deleteAllUnsafe(validateUuid(operationId, 'operationId'), resetConsent);
    });
  }

  getCapacity(): Promise<StorageCapacity> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      return this.publicCapacity(this.capacityFromEntries(await this.readAll()));
    });
  }

  exportData(): Promise<NotebookExportV1> {
    return this.enqueue(async () => {
      await this.ensureInitializedUnsafe();
      const entries = await this.readAll();
      const { envelopes, issues } = this.readEnvelopes(entries);
      const initializationIssues = this.initialization?.issues ?? [];
      // One quarantine entry per stored key; the initialization diagnosis takes precedence.
      const allIssues = [...initializationIssues, ...issues].filter((issue, index, array) =>
        array.findIndex(candidate => candidate.key === issue.key) === index);
      const quarantined = allIssues
        .filter(issue => Object.hasOwn(entries, issue.key))
        .map(issue => ({ key: issue.key, value: clone(entries[issue.key]), issue: clone(issue) }));
      return {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        exportedAt: validateUtc(this.now(), 'exportedAt'),
        notice: this.consentFromEntries(entries),
        offers: envelopes.map(clone),
        quarantined,
      };
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.sequence.then(task, task);
    this.sequence = result.then(() => undefined, () => undefined);
    return result;
  }

  private async initializeUnsafe(force: boolean): Promise<InitializationResult> {
    if (!force && this.initialization !== null) return clone(this.initialization);
    const issues: RecoveryIssue[] = [];
    let resumedOperation: InitializationResult['resumedOperation'] = null;
    try {
      await this.area.restrictToTrustedContexts?.();
    } catch (error) {
      const result: InitializationResult = {
        state: 'recovery_read_only',
        issues: [controlIssue(`Trusted-context storage access could not be applied: ${storageMessage(error)}`)],
        resumedOperation,
      };
      this.initialization = result;
      return clone(result);
    }
    let entries: Record<string, unknown>;
    try {
      entries = await this.readAll();
    } catch (error) {
      const result: InitializationResult = {
        state: 'recovery_read_only',
        issues: [controlIssue(`Local storage could not be read: ${storageMessage(error)}`)],
        resumedOperation,
      };
      this.initialization = result;
      return clone(result);
    }
    if (entries[CONTROL_KEY] !== undefined) {
      let control: RecoveryControlV1;
      try {
        control = validateControl(entries[CONTROL_KEY]);
      } catch (error) {
        const result: InitializationResult = {
          state: 'recovery_read_only',
          issues: [controlIssue(`The recovery control record is invalid: ${storageMessage(error)}`)],
          resumedOperation,
        };
        this.initialization = result;
        return clone(result);
      }
      try {
        if (control.type === 'delete_all') {
          await this.resumeDeleteAll(control);
          resumedOperation = 'delete_all';
        } else {
          await this.resumeMigration(control, entries);
          resumedOperation = 'migration';
        }
        entries = await this.readAll();
      } catch (error) {
        const result: InitializationResult = {
          state: 'recovery_read_only',
          issues: [controlIssue(`Recovery could not finish: ${storageMessage(error)}`)],
          resumedOperation,
        };
        this.initialization = result;
        return clone(result);
      }
    }
    const offerKeys = Object.keys(entries).filter(key => key.startsWith(OFFER_KEY_PREFIX)).sort();
    for (const key of offerKeys) {
      const raw = entries[key];
      let id: string;
      try {
        id = offerIdFromKey(key);
      } catch (error) {
        issues.push({ key, kind: 'invalid_record', message: storageMessage(error) });
        continue;
      }
      const version = storedSchemaVersion(raw);
      if (version === 0) {
        try {
          await this.startMigration(key, id, raw, entries);
          resumedOperation = 'migration';
          entries = await this.readAll();
        } catch (error) {
          issues.push({ key, kind: 'migration_failed', message: storageMessage(error) });
        }
      } else if (version === STORAGE_SCHEMA_VERSION) {
        try {
          validateEnvelopeV1(raw, id, key);
        } catch (error) {
          issues.push({ key, kind: 'invalid_record', message: storageMessage(error) });
        }
      } else if (version !== null && version > STORAGE_SCHEMA_VERSION) {
        issues.push({ key, kind: 'unsupported_schema', message: `Schema version ${version} is newer than supported version ${STORAGE_SCHEMA_VERSION}.` });
      } else {
        issues.push({ key, kind: 'invalid_record', message: 'The record has no supported schema version.' });
      }
    }
    for (const key of Object.keys(entries).filter(key => key.startsWith(MIGRATION_STAGE_KEY_PREFIX))) {
      issues.push({ key, kind: 'migration_failed', message: 'An orphaned migration stage was preserved for recovery.' });
    }
    if (entries[CONSENT_KEY] !== undefined && !this.isOlderConsent(entries[CONSENT_KEY])) {
      try {
        validateConsent(entries[CONSENT_KEY]);
      } catch (error) {
        issues.push({ key: CONSENT_KEY, kind: 'invalid_record', message: storageMessage(error) });
      }
    }
    const result: InitializationResult = {
      state: issues.length === 0 ? 'ready' : 'recovery_read_only',
      issues,
      resumedOperation,
    };
    this.initialization = result;
    return clone(result);
  }

  private async ensureInitializedUnsafe(): Promise<void> {
    if (this.initialization === null) await this.initializeUnsafe(false);
  }

  private requireWritable(): void {
    if (this.initialization === null) throw new StorageError('not_initialized', 'Initialize local storage before writing.');
    if (this.initialization.state !== 'ready') {
      throw new StorageError('recovery_read_only', 'Local storage is in read-only recovery.', this.initialization.issues.map(issue => issue.message));
    }
  }

  private async requireConsent(): Promise<void> {
    const consent = this.consentFromEntries(await this.readAll());
    if (consent === null) throw new StorageError('consent_required', 'Accept the current local-data notice before saving shopping data.');
  }

  private consentFromEntries(entries: Readonly<Record<string, unknown>>): ConsentRecordV1 | null {
    const raw = entries[CONSENT_KEY];
    if (raw === undefined || this.isOlderConsent(raw)) return null;
    try {
      return validateConsent(raw);
    } catch {
      return null;
    }
  }

  private isOlderConsent(value: unknown): boolean {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const noticeVersion = (value as Record<string, unknown>).noticeVersion;
    return Number.isSafeInteger(noticeVersion) && (noticeVersion as number) >= 0 && (noticeVersion as number) < NOTICE_VERSION;
  }

  private readEnvelopes(entries: Readonly<Record<string, unknown>>): { envelopes: OfferEnvelopeV1[]; issues: RecoveryIssue[] } {
    const envelopes: OfferEnvelopeV1[] = [];
    const issues: RecoveryIssue[] = [];
    for (const key of Object.keys(entries).filter(candidate => candidate.startsWith(OFFER_KEY_PREFIX)).sort()) {
      try {
        const id = offerIdFromKey(key);
        envelopes.push(validateEnvelopeV1(entries[key], id, key));
      } catch (error) {
        const version = storedSchemaVersion(entries[key]);
        issues.push({
          key,
          kind: version !== null && version > STORAGE_SCHEMA_VERSION ? 'unsupported_schema' : 'invalid_record',
          message: storageMessage(error),
        });
      }
    }
    return { envelopes, issues };
  }

  private capacityFromEntries(entries: Readonly<Record<string, unknown>>): CapacityState {
    let ordinaryBytes = 0;
    let controlBytes = 0;
    for (const [key, value] of Object.entries(entries)) {
      const bytes = entryBytes(key, value);
      if (isControlKey(key)) controlBytes += bytes;
      else ordinaryBytes += bytes;
    }
    const { envelopes } = this.readEnvelopes(entries);
    const confirmed = envelopes.filter(envelope => envelope.confirmed !== null);
    const offerCount = confirmed.length;
    const observationCount = confirmed.reduce((total, envelope) => total + envelope.observations.length, 0);
    const totalBytes = ordinaryBytes + controlBytes;
    return {
      offerCount,
      observationCount,
      ordinaryBytes,
      controlBytes,
      totalBytes,
      warning: totalBytes >= STORAGE_WARNING_BYTES,
      ordinaryBytesRemaining: Math.max(0, MAX_ORDINARY_DATA_BYTES - ordinaryBytes),
      hardBytesRemaining: Math.max(0, STORAGE_HARD_LIMIT_BYTES - totalBytes),
      snapshot: { offerCount, observationCount, comparisonCount: 0, ordinaryBytes, controlBytes },
    };
  }

  private publicCapacity(capacity: CapacityState): StorageCapacity {
    const { snapshot: _snapshot, ...result } = capacity;
    return result;
  }

  private async readAll(): Promise<Record<string, unknown>> {
    return await this.area.get(null);
  }

  private async write(items: Record<string, unknown>, code: StorageErrorCode, message: string): Promise<void> {
    try {
      await this.area.set(items);
    } catch (error) {
      throw new StorageError(code, message, [storageMessage(error)]);
    }
  }

  private async remove(keys: string | string[], code: StorageErrorCode, message: string): Promise<void> {
    try {
      await this.area.remove(keys);
    } catch (error) {
      throw new StorageError(code, message, [storageMessage(error)]);
    }
  }

  private async deleteAllUnsafe(operationId: string, resetConsent: boolean): Promise<StorageCapacity> {
    const existing = await this.readAll();
    if (this.deleteAllTargets(existing, resetConsent).length === 0) {
      // Nothing to remove: declining on first use or deleting an empty notebook writes nothing.
      return this.publicCapacity(this.capacityFromEntries(existing));
    }
    const control = validateControl({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      operationId,
      type: 'delete_all',
      phase: 'prepared',
      resetConsent,
    }) as DeleteAllControlV1;
    await this.write({ [CONTROL_KEY]: control }, 'delete_failed', 'Deletion could not be prepared.');
    try {
      await this.resumeDeleteAll(control);
    } catch (error) {
      throw error instanceof StorageError
        ? error
        : new StorageError('delete_failed', 'The local records could not be deleted.', [storageMessage(error)]);
    }
    this.initialization = { state: 'ready', issues: [], resumedOperation: 'delete_all' };
    return this.publicCapacity(this.capacityFromEntries(await this.readAll()));
  }

  private deleteAllTargets(entries: Readonly<Record<string, unknown>>, resetConsent: boolean): string[] {
    const targets = Object.keys(entries).filter(key => key.startsWith(OFFER_KEY_PREFIX)
      || key.startsWith(MIGRATION_STAGE_KEY_PREFIX) || key.startsWith('draft:'));
    if (resetConsent && entries[CONSENT_KEY] !== undefined) targets.push(CONSENT_KEY);
    return targets;
  }

  private async resumeDeleteAll(control: DeleteAllControlV1): Promise<void> {
    const entries = await this.readAll();
    const targets = this.deleteAllTargets(entries, control.resetConsent);
    if (targets.length > 0) await this.remove(targets, 'delete_failed', 'The local records could not be deleted.');
    const verification = await this.readAll();
    const remaining = targets.filter(key => verification[key] !== undefined);
    if (remaining.length > 0) throw new StorageError('delete_failed', 'Some local records remain after deletion.', remaining);
    await this.remove(CONTROL_KEY, 'delete_failed', 'Deletion finished, but its recovery marker could not be cleared.');
  }

  private async startMigration(
    pendingKey: string,
    offerId: string,
    raw: unknown,
    entries: Record<string, unknown>,
  ): Promise<void> {
    const candidate = migrateEnvelopeV0(raw, offerId, pendingKey);
    const control: MigrationControlV1 = validateControl({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      operationId: validateUuid(this.uuid(), 'migration operationId'),
      type: 'migrate_offer',
      phase: 'prepared',
      pendingKey,
      stageKey: migrationStageKey(offerId),
      fromVersion: 0,
      toVersion: STORAGE_SCHEMA_VERSION,
    }) as MigrationControlV1;
    const stagedEntries = { ...entries, [CONTROL_KEY]: control, [control.stageKey]: candidate, [pendingKey]: candidate };
    const stagedCapacity = this.capacityFromEntries(stagedEntries);
    if (stagedCapacity.totalBytes > STORAGE_HARD_LIMIT_BYTES
      || stagedCapacity.controlBytes > STORAGE_CONTROL_RESERVE_BYTES
      || stagedCapacity.ordinaryBytes > MAX_ORDINARY_DATA_BYTES) {
      throw new StorageError('migration_failed', 'Migration needs more temporary storage headroom.');
    }
    await this.write({ [CONTROL_KEY]: control }, 'migration_failed', 'Migration could not be prepared.');
    await this.resumeMigration(control, { ...entries, [CONTROL_KEY]: control });
  }

  private async resumeMigration(control: MigrationControlV1, initialEntries: Record<string, unknown>): Promise<void> {
    let entries = initialEntries;
    const offerId = offerIdFromKey(control.pendingKey);
    const active = entries[control.pendingKey];
    if (storedSchemaVersion(active) === STORAGE_SCHEMA_VERSION) {
      validateEnvelopeV1(active, offerId, control.pendingKey);
    } else {
      let candidate: OfferEnvelopeV1;
      const staged = entries[control.stageKey];
      if (staged === undefined) {
        candidate = migrateEnvelopeV0(active, offerId, control.pendingKey);
        const stagedEntries = { ...entries, [control.stageKey]: candidate, [control.pendingKey]: candidate };
        const capacity = this.capacityFromEntries(stagedEntries);
        if (capacity.totalBytes > STORAGE_HARD_LIMIT_BYTES
          || capacity.controlBytes > STORAGE_CONTROL_RESERVE_BYTES
          || capacity.ordinaryBytes > MAX_ORDINARY_DATA_BYTES) {
          throw new StorageError('migration_failed', 'Migration needs more temporary storage headroom.');
        }
        await this.write({ [control.stageKey]: candidate }, 'migration_failed', 'The migrated record could not be staged.');
      } else {
        candidate = validateEnvelopeV1(staged, offerId, control.stageKey);
      }
      const verifiedStage = (await this.area.get(control.stageKey))[control.stageKey];
      candidate = validateEnvelopeV1(verifiedStage, offerId, control.stageKey);
      await this.write({ [control.pendingKey]: candidate }, 'migration_failed', 'The migrated record could not replace the prior version.');
      const verifiedActive = (await this.area.get(control.pendingKey))[control.pendingKey];
      validateEnvelopeV1(verifiedActive, offerId, control.pendingKey);
      entries = await this.readAll();
    }
    if (entries[control.stageKey] !== undefined) {
      await this.remove(control.stageKey, 'migration_failed', 'The migration stage could not be cleared.');
    }
    await this.remove(CONTROL_KEY, 'migration_failed', 'The migration control record could not be cleared.');
  }
}

export function serializeNotebookExport(bundle: NotebookExportV1): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}
