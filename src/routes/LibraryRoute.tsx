import { Link } from 'react-router-dom';
import { BookOpenText, Settings } from 'lucide-react';
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
    <div className="min-h-full bg-gradient-to-b from-stone-50 via-stone-50 to-wood-100/60 text-stone-900 dark:from-stone-950 dark:via-stone-950 dark:to-stone-900 dark:text-stone-100">
      <header className="sticky top-0 z-10 border-b border-stone-200/60 bg-stone-50/85 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-950/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-sm shadow-accent-600/25">
              <BookOpenText size={19} />
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight">{APP_NAME}</p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">
                Drive のライブラリ
              </p>
            </div>
          </div>
          <Link
            to="/settings"
            className="grid size-9 place-items-center rounded-xl text-stone-400 transition hover:bg-stone-200/70 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            aria-label="設定"
          >
            <Settings size={19} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6">
        <Bookshelf />
      </main>
    </div>
  );
}
