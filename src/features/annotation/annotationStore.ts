import { create } from 'zustand';
import type { Stroke, ToolKind } from './annotationTypes';
import { DEFAULT_HIGHLIGHTER_WIDTH, DEFAULT_PEN_WIDTH } from './strokeGeometry';

/** Ink color presets — black, red, blue, green, amber, white. */
export const ANNOTATION_COLORS = [
  '#1c1917',
  '#dc2626',
  '#2563eb',
  '#15803d',
  '#f59e0b',
  '#fafaf9',
];

interface AnnotationState {
  fileId: string | null;
  /** Strokes keyed by page index. */
  pages: Record<number, Stroke[]>;
  tool: ToolKind;
  color: string;
  penWidth: number;
  highlighterWidth: number;
  /** Set whenever annotations change since the last persisted save. */
  dirty: boolean;

  load: (fileId: string, pages: Record<number, Stroke[]>) => void;
  reset: () => void;
  setTool: (tool: ToolKind) => void;
  setColor: (color: string) => void;
  setWidth: (width: number) => void;
  addStroke: (page: number, stroke: Stroke) => void;
  eraseStroke: (page: number, strokeId: string) => void;
  undo: (page: number) => void;
  clearPage: (page: number) => void;
  markClean: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  fileId: null,
  pages: {},
  tool: 'hand',
  color: ANNOTATION_COLORS[0]!,
  penWidth: DEFAULT_PEN_WIDTH,
  highlighterWidth: DEFAULT_HIGHLIGHTER_WIDTH,
  dirty: false,

  load: (fileId, pages) => set({ fileId, pages, dirty: false }),
  reset: () => set({ fileId: null, pages: {}, tool: 'hand', dirty: false }),
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setWidth: (width) =>
    set((s) =>
      s.tool === 'highlighter' ? { highlighterWidth: width } : { penWidth: width },
    ),

  addStroke: (page, stroke) =>
    set((s) => ({
      pages: { ...s.pages, [page]: [...(s.pages[page] ?? []), stroke] },
      dirty: true,
    })),
  eraseStroke: (page, strokeId) =>
    set((s) => {
      const list = s.pages[page];
      if (!list) return {};
      return {
        pages: { ...s.pages, [page]: list.filter((st) => st.id !== strokeId) },
        dirty: true,
      };
    }),
  undo: (page) =>
    set((s) => {
      const list = s.pages[page];
      if (!list || list.length === 0) return {};
      return { pages: { ...s.pages, [page]: list.slice(0, -1) }, dirty: true };
    }),
  clearPage: (page) => set((s) => ({ pages: { ...s.pages, [page]: [] }, dirty: true })),
  markClean: () => set({ dirty: false }),
}));
