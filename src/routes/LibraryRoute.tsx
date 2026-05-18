import { Link } from 'react-router-dom';
import { FileText, FolderClosed, Library, Loader2, Settings } from 'lucide-react';
import { APP_NAME } from '@/config';
import { useAuthStore } from '@/features/auth/authStore';
import { ConnectScreen } from '@/features/auth/ConnectScreen';
import { isFolder } from '@/features/drive/driveTypes';
import { useDriveList } from '@/features/drive/useDriveList';

export default function LibraryRoute() {
  const isSignedIn = useAuthStore((s) => s.accessToken !== null);
  return isSignedIn ? <LibraryHome /> : <ConnectScreen />;
}

function LibraryHome() {
  const { data, isLoading, error } = useDriveList('root');
  const files = data?.files ?? [];

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

      <main className="mx-auto max-w-5xl px-5 py-8">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Google Drive を読み込み中…
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            読み込みに失敗しました: {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {!isLoading && !error && (
          <ul className="divide-y divide-slate-200/70 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800/70 dark:border-slate-800 dark:bg-slate-900">
            {files.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-slate-500">
                このフォルダは空です
              </li>
            )}
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="text-slate-400">
                  {isFolder(file) ? (
                    <FolderClosed size={18} />
                  ) : (
                    <FileText size={18} />
                  )}
                </span>
                <span className="truncate">{file.name}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
