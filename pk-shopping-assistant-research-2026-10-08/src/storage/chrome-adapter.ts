import type { StorageArea } from './types.js';

/** The only browser persistence adapter in P0. It performs no network access. */
export class ChromeStorageArea implements StorageArea {
  async restrictToTrustedContexts(): Promise<void> {
    await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  }

  async get(keys: string | string[] | null = null): Promise<Record<string, unknown>> {
    return await chrome.storage.local.get(keys) as Record<string, unknown>;
  }

  async set(items: Record<string, unknown>): Promise<void> {
    await chrome.storage.local.set(items);
  }

  async remove(keys: string | string[]): Promise<void> {
    await chrome.storage.local.remove(keys);
  }

  async getBytesInUse(keys: string | string[] | null = null): Promise<number> {
    return await chrome.storage.local.getBytesInUse(keys);
  }
}
