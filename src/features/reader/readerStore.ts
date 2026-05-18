import { create } from 'zustand';
import type { ReadingDirection } from '@/lib/idb';

function clamp(index: number, pageCount: number): number {
  if (pageCount <= 0) return 0;
  return Math.max(0, Math.min(index, pageCount - 1));
}

interface ReaderState {
  fileId: string | null;
  index: number;
  pageCount: number;
  direction: ReadingDirection;

  initBook: (params: {
    fileId: string;
    index: number;
    pageCount: number;
    direction: ReadingDirection;
  }) => void;
  setPageCount: (count: number) => void;
  setIndex: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  setDirection: (direction: ReadingDirection) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  fileId: null,
  index: 0,
  pageCount: 0,
  direction: 'ltr',

  initBook: ({ fileId, index, pageCount, direction }) =>
    set({ fileId, pageCount, direction, index: clamp(index, pageCount) }),
  setPageCount: (count) =>
    set((s) => ({ pageCount: count, index: clamp(s.index, count) })),
  setIndex: (index) => set((s) => ({ index: clamp(index, s.pageCount) })),
  goNext: () => set((s) => ({ index: clamp(s.index + 1, s.pageCount) })),
  goPrev: () => set((s) => ({ index: clamp(s.index - 1, s.pageCount) })),
  setDirection: (direction) => set({ direction }),
}));
