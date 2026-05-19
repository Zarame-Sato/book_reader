import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ReadingDirection } from '@/lib/idb';

interface PageNavigatorProps {
  visible: boolean;
  index: number;
  pageCount: number;
  direction: ReadingDirection;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (index: number) => void;
}

export function PageNavigator({
  visible,
  index,
  pageCount,
  direction,
  onPrev,
  onNext,
  onSeek,
}: PageNavigatorProps) {
  // The physically-left button advances in RTL books, goes back in LTR books.
  const leftAction = direction === 'rtl' ? onNext : onPrev;
  const rightAction = direction === 'rtl' ? onPrev : onNext;
  const max = Math.max(0, pageCount - 1);

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 px-4 py-3',
        'border-t border-stone-200/60 bg-stone-50/90 text-stone-700 backdrop-blur-md',
        'transition-all duration-300 dark:border-stone-800/60 dark:bg-stone-900/85 dark:text-stone-100',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
      )}
    >
      <button
        type="button"
        onClick={leftAction}
        className="grid size-9 shrink-0 place-items-center rounded-lg transition hover:bg-stone-200/70 dark:hover:bg-white/10"
        aria-label="ページ送り（左）"
      >
        <ChevronLeft size={20} />
      </button>

      <input
        type="range"
        min={0}
        max={max}
        value={index}
        dir={direction === 'rtl' ? 'rtl' : 'ltr'}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-stone-200 accent-accent-500 dark:bg-white/20"
        aria-label="ページ位置"
      />

      <span className="shrink-0 text-xs tabular-nums text-stone-500 dark:text-stone-300">
        {pageCount > 0 ? index + 1 : 0} / {pageCount}
      </span>

      <button
        type="button"
        onClick={rightAction}
        className="grid size-9 shrink-0 place-items-center rounded-lg transition hover:bg-stone-200/70 dark:hover:bg-white/10"
        aria-label="ページ送り（右）"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
