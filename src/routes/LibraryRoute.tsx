import { Link } from 'react-router-dom';
import { Library, Settings } from 'lucide-react';
import { APP_NAME } from '@/config';

export default function LibraryRoute() {
  return (
    <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-5 py-3 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-accent-600 text-white">
            <Library size={20} />
          </span>
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <Link
          to="/settings"
          className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="設定"
        >
          <Settings size={20} />
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 py-20 text-center dark:border-slate-700">
          <p className="text-base font-medium">本棚はまだ空です</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Google Drive に接続すると書籍が表示されます
          </p>
        </div>
      </main>
    </div>
  );
}
