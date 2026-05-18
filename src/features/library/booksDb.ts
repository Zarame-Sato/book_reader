import { type BookRecord, getDb, type ReadingDirection } from '@/lib/idb';
import type { BookKind } from '@/features/book-sources/bookKind';
import type { DriveFile } from '@/features/drive/driveTypes';

/** Comics and images default to right-bound (manga); PDFs to left-bound. */
export function defaultDirection(kind: BookKind): ReadingDirection {
  return kind === 'pdf' ? 'ltr' : 'rtl';
}

export async function getBookRecord(fileId: string): Promise<BookRecord | undefined> {
  return (await getDb()).get('books', fileId);
}

export async function putBookRecord(record: BookRecord): Promise<void> {
  await (await getDb()).put('books', record);
}

export async function listRecentBooks(limit = 12): Promise<BookRecord[]> {
  const all = await (await getDb()).getAllFromIndex('books', 'by-lastOpened');
  return all.reverse().slice(0, limit);
}

/** Creates a record on first open, or refreshes metadata on subsequent opens. */
export async function openBookRecord(file: DriveFile, kind: BookKind): Promise<BookRecord> {
  const existing = await getBookRecord(file.id);
  const record: BookRecord = existing
    ? {
        ...existing,
        name: file.name,
        modifiedTime: file.modifiedTime ?? null,
        lastOpenedAt: Date.now(),
      }
    : {
        fileId: file.id,
        name: file.name,
        kind,
        readingDirection: defaultDirection(kind),
        viewMode: 'single',
        lastReadPage: 0,
        pageCount: null,
        modifiedTime: file.modifiedTime ?? null,
        sidecarFileId: null,
        cover: null,
        lastOpenedAt: Date.now(),
      };
  await putBookRecord(record);
  return record;
}

export async function updateBookRecord(
  fileId: string,
  patch: Partial<BookRecord>,
): Promise<void> {
  const existing = await getBookRecord(fileId);
  if (!existing) return;
  await putBookRecord({ ...existing, ...patch });
}
