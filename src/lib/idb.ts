import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { BookKind } from '@/features/book-sources/bookKind';

export type ReadingDirection = 'rtl' | 'ltr';
export type ViewMode = 'single' | 'spread';

/** Per-book state and settings, persisted locally. */
export interface BookRecord {
  fileId: string;
  name: string;
  kind: BookKind;
  readingDirection: ReadingDirection;
  viewMode: ViewMode;
  lastReadPage: number;
  pageCount: number | null;
  /** Drive modifiedTime when last opened — used to detect stale annotations. */
  modifiedTime: string | null;
  /** Cached id of the sidecar annotation file on Drive. */
  sidecarFileId: string | null;
  /** Cover thumbnail generated from the first page. */
  cover: Blob | null;
  lastOpenedAt: number;
}

/** Local cache of a book's annotation sidecar, with an offline dirty flag. */
export interface AnnotationCacheRecord {
  fileId: string;
  sidecar: unknown;
  dirty: boolean;
  updatedAt: number;
}

interface BookReaderDB extends DBSchema {
  books: {
    key: string;
    value: BookRecord;
    indexes: { 'by-lastOpened': number };
  };
  annotations: {
    key: string;
    value: AnnotationCacheRecord;
  };
}

const DB_NAME = 'book_reader';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BookReaderDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<BookReaderDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BookReaderDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const books = db.createObjectStore('books', { keyPath: 'fileId' });
        books.createIndex('by-lastOpened', 'lastOpenedAt');
        db.createObjectStore('annotations', { keyPath: 'fileId' });
      },
    });
  }
  return dbPromise;
}
