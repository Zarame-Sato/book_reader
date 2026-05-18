import { useEffect, useRef } from 'react';
import { useAnnotationStore } from './annotationStore';
import {
  buildSidecar,
  loadAnnotationCache,
  pagesFromSidecar,
  saveAnnotationCache,
} from './annotationsDb';
import type { SidecarDocument, SidecarMeta } from './annotationTypes';
import { pullSidecar, pushSidecar } from './sidecarSync';
import { useSyncStore } from './syncStore';

const SAVE_DEBOUNCE_MS = 2200;

/**
 * Loads a book's annotations (local cache first, then reconciled with the
 * Drive sidecar) and persists changes — to IndexedDB immediately and to the
 * Drive sidecar, debounced.
 */
export function useAnnotations(fileId: string, meta: SidecarMeta): void {
  const baseRef = useRef<SidecarDocument | null>(null);

  useEffect(() => {
    let active = true;
    baseRef.current = null;
    useSyncStore.getState().setStatus('idle');

    void (async () => {
      const cache = await loadAnnotationCache(fileId);
      if (!active) return;
      if (cache?.sidecar) {
        const local = cache.sidecar as SidecarDocument;
        baseRef.current = local;
        useAnnotationStore.getState().load(fileId, pagesFromSidecar(local));
      } else {
        useAnnotationStore.getState().load(fileId, {});
      }

      // Reconcile with the Drive sidecar; the newer copy wins.
      try {
        useSyncStore.getState().setStatus('syncing');
        const remote = await pullSidecar(fileId);
        if (!active) return;
        const localUpdated = baseRef.current?.updatedAt;
        if (remote && (!localUpdated || remote.updatedAt > localUpdated)) {
          baseRef.current = remote;
          useAnnotationStore.getState().load(fileId, pagesFromSidecar(remote));
          await saveAnnotationCache({
            fileId,
            sidecar: remote,
            dirty: false,
            updatedAt: Date.now(),
          });
        }
        if (active) useSyncStore.getState().setStatus('synced');
      } catch {
        if (active) useSyncStore.getState().setStatus('offline');
      }
    })();

    return () => {
      active = false;
      useAnnotationStore.getState().reset();
    };
  }, [fileId]);

  useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = useAnnotationStore.subscribe((state, prev) => {
      if (state.fileId !== fileId || state.pages === prev.pages) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void (async () => {
          const { pages } = useAnnotationStore.getState();
          const doc = buildSidecar(meta, pages, baseRef.current ?? undefined);
          baseRef.current = doc;
          await saveAnnotationCache({
            fileId,
            sidecar: doc,
            dirty: true,
            updatedAt: Date.now(),
          });
          useAnnotationStore.getState().markClean();
          try {
            useSyncStore.getState().setStatus('syncing');
            await pushSidecar(fileId, doc);
            await saveAnnotationCache({
              fileId,
              sidecar: doc,
              dirty: false,
              updatedAt: Date.now(),
            });
            useSyncStore.getState().setStatus('synced');
          } catch {
            useSyncStore.getState().setStatus('offline');
          }
        })();
      }, SAVE_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [fileId, meta]);
}
