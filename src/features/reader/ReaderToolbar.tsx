import { Link } from 'react-router-dom';
import { BookText, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ReadingDirection } from '@/lib/idb';

interface ReaderToolbarProps {
  visible: boolean;
  title: string;
  direction: ReadingDirection;
  onToggleDirection: () => void;
}

export function ReaderToolbar({
  visible,
  title,
  direction,
  onToggleDirection,
}: ReaderToolbarProps) {
  return (
    <div
      className={cn(
        'absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-3 py-2.5',
        'bg-stone-900/85 text-stone-100 backdrop-blur-md transition-all duration-300',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0',
      )}
    >
      <Link
        to="/"
        className="grid size-9 shrink-0 place-items-center rounded-lg transition hover:bg-white/10"
        aria-label="本棚へ戻る"
      >
        <ChevronLeft size={20} />
      </Link>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
      <button
        type="button"
        onClick={onToggleDirection}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium transition hover:bg-white/15"
      >
        <BookText size={14} />
        {direction === 'rtl' ? '右開き' : '左開き'}
      </button>
    </div>
  );
}
