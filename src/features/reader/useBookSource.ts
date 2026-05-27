import { useEffect, useState } from 'react';
import type { BookKind } from '@/features/book-sources/bookKind';
import type { BookSource } from '@/features/book-sources/BookSource';
import { createBookSource } from '@/features/book-sources/createBookSource';
import { downloadFile } from '@/features/drive/driveClient';
import { getBookRecord } from '@/features/library/booksDb';
import { getCachedBlob, MAX_CACHEABLE_BYTES, putCachedBlob } from './bookFileCache';

export interface LoadedBook {
  source: BookSource;
  name: string;
  kind: BookKind;
}

export type BookSourceState =
  | { status: 'loading'; progress: number }
  | { status: 'ready'; book: LoadedBook }
  | { status: 'error'; error: string };

/**
 * Downloads a book from Drive (or serves it from the local blob cache) and
 * builds its BookSource. The source is disposed on unmount.
 */
export function useBookSource(fileId: string): BookSourceState {
  const [state, setState] = useState<BookSourceState>({
    status: 'loading',
    progress: 0,
  });

  useEffect(() => {
    let cancelled = false;
    let created: BookSource | null = null;
    setState({ status: 'loading', progress: 0 });

    void (async () => {
      const record = await getBookRecord(fileId);
      if (!record) {
        throw new Error('書籍情報が見つかりません。本棚から開き直してください。');
      }

      // 1. Try the local blob cache — instant if the Drive modifiedTime matches.
      let blob: Blob | null = null;
      const expectedMtime = record.modifiedTime ?? null;
      try {
        const cache = await getCachedBlob(fileId);
        if (cache && cache.modifiedTime === expectedMtime) {
          blob = cache.blob;
          setState({ status: 'loading', progress: 1 });
        }
      } catch {
        /* ignore cache read errors */
      }

      // 2. Otherwise download from Drive and cache for next time.
      if (!blob) {
        blob = await downloadFile(fileId, (loaded, total) => {
          if (!cancelled && total > 0) {
            setState({ status: 'loading', progress: loaded / total });
          }
        });
        if (blob.size <= MAX_CACHEABLE_BYTES) {
          void putCachedBlob({
            fileId,
            blob,
            modifiedTime: expectedMtime,
            cachedAt: Date.now(),
          }).catch(() => {
            /* cache writes are best-effort (quota, etc.) */
          });
        }
      }

      const source = await createBookSource(record.kind, blob);
      if (cancelled) {
        source.dispose();
        return;
      }
      created = source;
      setState({
        status: 'ready',
        book: { source, name: record.name, kind: record.kind },
      });
    })().catch((e: unknown) => {
      console.error('[book_reader] failed to load book', fileId, e);
      if (!cancelled) {
        setState({
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });

    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, [fileId]);

  return state;
}
