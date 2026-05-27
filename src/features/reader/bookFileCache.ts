import { type BookFileCacheRecord, getDb } from '@/lib/idb';

/** Skip caching for blobs over this size — they're not worth the storage churn. */
export const MAX_CACHEABLE_BYTES = 150 * 1024 * 1024;

export async function getCachedBlob(
  fileId: string,
): Promise<BookFileCacheRecord | undefined> {
  return (await getDb()).get('book_files', fileId);
}

export async function putCachedBlob(record: BookFileCacheRecord): Promise<void> {
  // Storage growth is bounded by the browser's quota — when full, put() throws
  // and the caller's .catch() silently drops it. That's fine.
  await (await getDb()).put('book_files', record);
}

export async function evictCachedBlob(fileId: string): Promise<void> {
  await (await getDb()).delete('book_files', fileId);
}
