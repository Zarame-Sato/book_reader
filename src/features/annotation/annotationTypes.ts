import { SIDECAR_SCHEMA_VERSION } from '@/config';
import type { BookKind } from '@/features/book-sources/bookKind';

/** Active reader tool. `hand` navigates; the rest draw or erase. */
export type ToolKind = 'hand' | 'pen' | 'highlighter' | 'eraser';
export type DrawTool = 'pen' | 'highlighter';

/** A point in normalized page coordinates: x,y in 0..1, pressure in 0..1. */
export type NormPoint = [x: number, y: number, pressure: number];

export interface Stroke {
  id: string;
  tool: DrawTool;
  color: string;
  /** Stroke width as a fraction of page width — survives zoom and DPR. */
  width: number;
  opacity: number;
  points: NormPoint[];
}

export interface PageAnnotations {
  strokes: Stroke[];
}

/** The on-Drive sidecar file format. Coordinates are page-relative. */
export interface SidecarDocument {
  schemaVersion: number;
  bookFileId: string;
  bookFileName: string;
  bookModifiedTime: string | null;
  bookKind: BookKind;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  /** Sparse map keyed by page index (string). */
  pages: Record<string, PageAnnotations>;
}

export interface SidecarMeta {
  bookFileId: string;
  bookFileName: string;
  bookModifiedTime: string | null;
  bookKind: BookKind;
  pageCount: number;
}

export function createSidecar(meta: SidecarMeta): SidecarDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    ...meta,
    createdAt: now,
    updatedAt: now,
    pages: {},
  };
}
