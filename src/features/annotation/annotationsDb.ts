import { type AnnotationCacheRecord, getDb } from '@/lib/idb';
import {
  createSidecar,
  type PageAnnotations,
  type SidecarDocument,
  type SidecarMeta,
  type Stroke,
} from './annotationTypes';

export async function loadAnnotationCache(
  fileId: string,
): Promise<AnnotationCacheRecord | undefined> {
  return (await getDb()).get('annotations', fileId);
}

export async function saveAnnotationCache(record: AnnotationCacheRecord): Promise<void> {
  await (await getDb()).put('annotations', record);
}

export async function listDirtyAnnotations(): Promise<AnnotationCacheRecord[]> {
  const all = await (await getDb()).getAll('annotations');
  return all.filter((record) => record.dirty);
}

/** Converts a sidecar document into the page-indexed store shape. */
export function pagesFromSidecar(doc: SidecarDocument): Record<number, Stroke[]> {
  const pages: Record<number, Stroke[]> = {};
  for (const [key, value] of Object.entries(doc.pages)) {
    pages[Number(key)] = value.strokes;
  }
  return pages;
}

/** Builds a sidecar document from the current page strokes. */
export function buildSidecar(
  meta: SidecarMeta,
  pages: Record<number, Stroke[]>,
  base?: SidecarDocument,
): SidecarDocument {
  const doc = base ? { ...base, ...meta } : createSidecar(meta);
  const pageMap: Record<string, PageAnnotations> = {};
  for (const [key, strokes] of Object.entries(pages)) {
    if (strokes.length > 0) pageMap[key] = { strokes };
  }
  return { ...doc, pages: pageMap, updatedAt: new Date().toISOString() };
}
