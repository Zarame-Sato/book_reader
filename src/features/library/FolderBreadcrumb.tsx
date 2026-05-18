import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLibraryStore } from './libraryStore';

export function FolderBreadcrumb() {
  const path = useLibraryStore((s) => s.path);
  const goToCrumb = useLibraryStore((s) => s.goToCrumb);

  return (
    <nav className="flex flex-wrap items-center gap-0.5 text-sm">
      {path.map((crumb, i) => {
        const isCurrent = i === path.length - 1;
        return (
          <span key={crumb.id} className="flex items-center gap-0.5">
            {i > 0 && <ChevronRight size={14} className="shrink-0 text-slate-400" />}
            <button
              type="button"
              onClick={() => goToCrumb(i)}
              disabled={isCurrent}
              className={cn(
                'rounded-md px-1.5 py-0.5 transition',
                isCurrent
                  ? 'font-semibold text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800',
              )}
            >
              {crumb.name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
