import { Link } from 'react-router-dom';
import { Library, Settings } from 'lucide-react';
import { APP_NAME } from '@/config';
import { useAuthStore } from '@/features/auth/authStore';
import { ConnectScreen } from '@/features/auth/ConnectScreen';
import { Bookshelf } from '@/features/library/Bookshelf';

export default function LibraryRoute() {
  const isSignedIn = useAuthStore((s) => s.accessToken !== null);
  return isSignedIn ? <LibraryHome /> : <ConnectScreen />;
}

function LibraryHome() {
  return (
    <div className="min-h-full bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200/70 bg-white/80 px-5 py-3 backdrop-blur dark:border-stone-800/70 dark:bg-stone-900/80">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-accent-600 text-white">
            <Library size={20} />
          </span>
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <Link
          to="/settings"
          className="grid size-9 place-items-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          aria-label="設定"
        >
          <Settings size={20} />
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <Bookshelf />
      </main>
    </div>
  );
}
