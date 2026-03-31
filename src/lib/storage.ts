import { openDB, type IDBPDatabase } from 'idb';
import type { StoredBlob } from './types';

const DB_NAME = 'genpm-assets';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveAssetBlob(
  projectId: string,
  assetId: string,
  blob: Blob,
  mimeType: string
): Promise<string> {
  const db = await getDB();
  const id = `blob_${projectId}_${assetId}`;
  const record: StoredBlob = {
    id,
    projectId,
    assetId,
    blob,
    mimeType,
    createdAt: Date.now(),
  };
  await db.put(STORE_NAME, record);
  return id;
}

export async function getAssetBlob(blobId: string): Promise<StoredBlob | null> {
  const db = await getDB();
  const record = await db.get(STORE_NAME, blobId);
  return record ?? null;
}

export async function getAssetBlobUrl(blobId: string): Promise<string | null> {
  const record = await getAssetBlob(blobId);
  if (!record) return null;
  return URL.createObjectURL(record.blob);
}

export async function deleteProjectBlobs(projectId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const index = tx.store.index('projectId');
  const keys = await index.getAllKeys(projectId);
  await Promise.all(keys.map((key) => tx.store.delete(key)));
  await tx.done;
}

export async function cleanupOldestProject(keepProjectIds: string[]): Promise<void> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  const toDelete = all.filter((r: StoredBlob) => !keepProjectIds.includes(r.projectId));
  if (toDelete.length === 0) return;

  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all(toDelete.map((r: StoredBlob) => tx.store.delete(r.id)));
  await tx.done;
}

// Convert base64 string (from API) to Blob and save to IndexedDB
export async function saveBase64AsBlob(
  projectId: string,
  assetId: string,
  base64: string,
  mimeType: string
): Promise<string> {
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeType });
  return saveAssetBlob(projectId, assetId, blob, mimeType);
}

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}
