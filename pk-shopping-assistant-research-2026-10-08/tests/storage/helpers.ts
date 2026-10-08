import type { StorageArea } from '../../src/storage/types.js';
import { buildManualOffer, emptyOfferForm } from '../../src/ui/popup/form.js';
import type { OfferFormFields } from '../../src/ui/popup/form.js';

/** In-memory stand-in for chrome.storage.local that serializes values like the real area and can fail on demand. */
export class MemoryArea implements StorageArea {
  readonly data = new Map<string, string>();
  failNextSets = 0;
  failNextRemoves = 0;
  /** Simulates a removal promise that resolves without deleting anything. */
  ignoreRemoves = false;
  failRestrict = false;
  failReads = false;
  setCalls = 0;

  async restrictToTrustedContexts(): Promise<void> {
    if (this.failRestrict) throw new Error('access level unavailable');
  }

  async get(keys: string | string[] | null = null): Promise<Record<string, unknown>> {
    if (this.failReads) throw new Error('read failed');
    const wanted = keys === null ? [...this.data.keys()] : Array.isArray(keys) ? keys : [keys];
    const result: Record<string, unknown> = {};
    for (const key of wanted) {
      const value = this.data.get(key);
      if (value !== undefined) result[key] = JSON.parse(value) as unknown;
    }
    return result;
  }

  async set(items: Record<string, unknown>): Promise<void> {
    this.setCalls += 1;
    if (this.failNextSets > 0) {
      this.failNextSets -= 1;
      throw new Error('QUOTA_BYTES quota exceeded');
    }
    for (const [key, value] of Object.entries(items)) this.data.set(key, JSON.stringify(value));
  }

  async remove(keys: string | string[]): Promise<void> {
    if (this.failNextRemoves > 0) {
      this.failNextRemoves -= 1;
      throw new Error('remove failed');
    }
    if (this.ignoreRemoves) return;
    for (const key of Array.isArray(keys) ? keys : [keys]) this.data.delete(key);
  }

  async getBytesInUse(): Promise<number> {
    let total = 0;
    for (const [key, value] of this.data) total += key.length + value.length;
    return total;
  }

  raw(key: string): unknown {
    const value = this.data.get(key);
    return value === undefined ? undefined : JSON.parse(value) as unknown;
  }

  put(key: string, value: unknown): void {
    this.data.set(key, JSON.stringify(value));
  }
}

export function idFactory(start = 1): () => string {
  let next = start;
  return () => `00000000-0000-4000-8000-${(next++).toString(16).padStart(12, '0')}`;
}

export const FIXED_NOW = '2026-10-08T07:00:00.000Z';

export function syntheticFields(overrides: Partial<OfferFormFields> = {}): OfferFormFields {
  return {
    ...emptyOfferForm(),
    brand: 'Fictional Northstar',
    model: 'Aster One S',
    retailer: 'Fictional Cedar Shop',
    url: 'https://cedar.example.invalid/products/aster-one-s',
    itemPrice: '7,000',
    ...overrides,
  };
}

/** Builds a validated synthetic manual offer ready for LocalNotebook.saveOffer. */
export function syntheticSave(createId: () => string, overrides: Partial<OfferFormFields> = {}) {
  const operationId = createId();
  const result = buildManualOffer(syntheticFields(overrides), {
    createId,
    now: () => new Date(FIXED_NOW),
    operationId,
  });
  if (!result.ok) throw new Error(`Synthetic offer failed: ${JSON.stringify(result.issues)}`);
  return { confirmed: result.confirmed, observation: result.observation, operationId, draft: null };
}
