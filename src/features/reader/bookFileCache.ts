import { type BookFileCacheRecord, getDb } from '@/lib/idb';

/** How many downloaded book blobs to keep cached locally. */
const MAX_CACHED_FILES = 12;

export async function getCachedBlob(
  fileId: string,
): Promise<BookFileCacheRecord | undefined> {
  return (await getDb()).get('book_files', fileId);
}

export async function putCachedBlob(record: BookFileCacheRecord): Promise<void> {
  const db = await getDb();
  await db.put('book_files', record);
  // Trim oldest entries when the cache grows past the limit.
  const all = await db.getAll('book_files');
  if (all.length > MAX_CACHED_FILES) {
    const sorted = all.slice().sort((a, b) => a.cachedAt - b.cachedAt);
    for (const old of sorted.slice(0, all.length - MAX_CACHED_FILES)) {
      await db.delete('book_files', old.fileId);
    }
  }
}

export async function evictCachedBlob(fileId: string): Promise<void> {
  await (await getDb()).delete('book_files', fileId);
}
