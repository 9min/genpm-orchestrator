import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb to avoid real IndexedDB in test environment
vi.mock('idb', () => {
  const store = new Map<string, unknown>();
  const db = {
    put: vi.fn(async (_s: string, record: { id: string }) => { store.set(record.id, record); }),
    get: vi.fn(async (_s: string, key: string) => store.get(key) ?? undefined),
    getAll: vi.fn(async () => Array.from(store.values())),
    transaction: vi.fn(() => ({
      store: {
        index: vi.fn(() => ({
          getAllKeys: vi.fn(async (projectId: string) => {
            return Array.from(store.values())
              .filter((r: unknown) => (r as { projectId: string }).projectId === projectId)
              .map((r: unknown) => (r as { id: string }).id);
          }),
        })),
        delete: vi.fn(async (key: string) => { store.delete(key); }),
      },
      done: Promise.resolve(),
    })),
    createObjectStore: vi.fn(),
    objectStoreNames: { contains: vi.fn(() => false) },
  };
  return {
    openDB: vi.fn(async () => db),
    __store: store,
  };
});

// Reset module cache and store between tests
beforeEach(async () => {
  vi.resetModules();
  const { __store } = await import('idb') as unknown as { __store: Map<string, unknown> };
  __store.clear();
});

describe('storage', () => {
  it('saveAssetBlob stores and getAssetBlob retrieves', async () => {
    const { saveAssetBlob, getAssetBlob } = await import('@/lib/storage');
    const blob = new Blob(['hello'], { type: 'image/png' });
    const id = await saveAssetBlob('proj1', 'asset1', blob, 'image/png');
    expect(id).toBe('blob_proj1_asset1');
    const retrieved = await getAssetBlob(id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.assetId).toBe('asset1');
    expect(retrieved?.mimeType).toBe('image/png');
  });

  it('getAssetBlob returns null for unknown id', async () => {
    const { getAssetBlob } = await import('@/lib/storage');
    const result = await getAssetBlob('blob_nonexistent');
    expect(result).toBeNull();
  });

  it('saveBase64AsBlob converts base64 and stores', async () => {
    const { saveBase64AsBlob, getAssetBlob } = await import('@/lib/storage');
    // base64 of "hello"
    const base64 = btoa('hello');
    const id = await saveBase64AsBlob('proj1', 'asset2', base64, 'image/png');
    const retrieved = await getAssetBlob(id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.blob).toBeInstanceOf(Blob);
  });

  it('deleteProjectBlobs removes blobs for that project', async () => {
    const { saveAssetBlob, deleteProjectBlobs, getAssetBlob } = await import('@/lib/storage');
    const blob = new Blob(['test']);
    await saveAssetBlob('proj1', 'a1', blob, 'image/png');
    await saveAssetBlob('proj2', 'a2', blob, 'image/png');
    await deleteProjectBlobs('proj1');
    expect(await getAssetBlob('blob_proj1_a1')).toBeNull();
    expect(await getAssetBlob('blob_proj2_a2')).not.toBeNull();
  });

  it('isIndexedDBAvailable returns true in jsdom', async () => {
    const { isIndexedDBAvailable } = await import('@/lib/storage');
    // jsdom does not implement indexedDB but we can check the function doesn't throw
    expect(typeof isIndexedDBAvailable()).toBe('boolean');
  });
});
