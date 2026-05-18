import { useEffect, useRef } from 'react';
import { useAnnotationStore } from './annotationStore';
import {
  buildSidecar,
  loadAnnotationCache,
  pagesFromSidecar,
  saveAnnotationCache,
} from './annotationsDb';
import type { SidecarDocument, SidecarMeta } from './annotationTypes';

const SAVE_DEBOUNCE_MS = 1500;

/**
 * Loads a book's annotations into the store and persists changes to
 * IndexedDB (debounced). Persisted records are flagged dirty for Drive sync.
 */
export function useAnnotations(fileId: string, meta: SidecarMeta): void {
  const baseRef = useRef<SidecarDocument | null>(null);

  useEffect(() => {
    let active = true;
    baseRef.current = null;
    void loadAnnotationCache(fileId).then((cache) => {
      if (!active) return;
      if (cache?.sidecar) {
        const doc = cache.sidecar as SidecarDocument;
        baseRef.current = doc;
        useAnnotationStore.getState().load(fileId, pagesFromSidecar(doc));
      } else {
        useAnnotationStore.getState().load(fileId, {});
      }
    });
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
        const { pages } = useAnnotationStore.getState();
        const sidecar = buildSidecar(meta, pages, baseRef.current ?? undefined);
        baseRef.current = sidecar;
        void saveAnnotationCache({
          fileId,
          sidecar,
          dirty: true,
          updatedAt: Date.now(),
        });
        useAnnotationStore.getState().markClean();
      }, SAVE_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [fileId, meta]);
}
