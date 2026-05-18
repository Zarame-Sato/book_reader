import { useState } from 'react';
import { BookOpenText, ChevronDown, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { APP_NAME } from '@/config';
import { useAuthStore } from './authStore';
import { useAuth } from './useAuth';

const ORIGIN = window.location.origin;

export function ConnectScreen() {
  const { clientId, status, error, signIn } = useAuth();
  const setClientId = useAuthStore((s) => s.setClientId);
  const [draft, setDraft] = useState(clientId ?? '');
  const connecting = status === 'connecting';

  const saveClientId = () => {
    const trimmed = draft.trim();
    if (trimmed) setClientId(trimmed);
  };

  return (
    <div className="grid min-h-full place-items-center bg-gradient-to-b from-slate-50 to-slate-100 px-5 py-12 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid size-16 place-items-center rounded-2xl bg-accent-600 text-white shadow-lg shadow-accent-600/30">
            <BookOpenText size={32} />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {APP_NAME}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Google Drive の書籍を、注釈しながら読む
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {clientId ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Google アカウントに接続して、Drive 内の書籍を開きます。
              </p>
              <Button size="lg" onClick={signIn} disabled={connecting}>
                {connecting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    接続中…
                  </>
                ) : (
                  'Google Drive に接続'
                )}
              </Button>
              <button
                type="button"
                onClick={() => setClientId(null)}
                className="text-xs text-slate-400 underline-offset-2 hover:underline"
              >
                クライアント ID を変更する
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                <KeyRound size={15} />
                OAuth クライアント ID
              </label>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="xxxxx.apps.googleusercontent.com"
                spellCheck={false}
                autoComplete="off"
                className="h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-accent-900"
              />
              <Button size="lg" onClick={saveClientId} disabled={!draft.trim()}>
                保存して続ける
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>

        <details className="mt-4 rounded-2xl border border-slate-200 bg-white/60 px-5 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
          <summary className="flex cursor-pointer items-center justify-between font-medium text-slate-700 dark:text-slate-200">
            クライアント ID の取得方法
            <ChevronDown size={16} className="text-slate-400" />
          </summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-slate-600 dark:text-slate-400">
            <li>
              Google Cloud Console でプロジェクトを作成し、「Google Drive API」を有効化します。
            </li>
            <li>「OAuth 同意画面」を構成し、自分のメールをテストユーザーに追加します。</li>
            <li>
              「認証情報」→「OAuth クライアント ID」→ アプリの種類「ウェブ アプリケーション」を作成します。
            </li>
            <li>
              「承認済みの JavaScript 生成元」に次を追加します:
              <code className="mt-1 block rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                {ORIGIN}
              </code>
            </li>
            <li>発行された <code>xxxxx.apps.googleusercontent.com</code> を上に貼り付けます。</li>
          </ol>
        </details>
      </div>
    </div>
  );
}
