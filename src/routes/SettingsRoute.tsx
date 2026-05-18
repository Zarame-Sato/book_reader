import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function SettingsRoute() {
  return (
    <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center gap-2 border-b border-slate-200/70 px-5 py-3 dark:border-slate-800/70">
        <Link
          to="/"
          className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="戻る"
        >
          <ChevronLeft size={20} />
        </Link>
        <span className="text-lg font-semibold tracking-tight">設定</span>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10">
        <p className="text-sm text-slate-500 dark:text-slate-400">設定項目は準備中です。</p>
      </main>
    </div>
  );
}
