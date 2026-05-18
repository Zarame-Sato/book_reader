import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/Button';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/features/auth/authStore';
import { useAuth } from '@/features/auth/useAuth';
import { getStoredTheme, setTheme, type Theme } from '@/features/theme/theme';

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'ライト', icon: Sun },
  { value: 'dark', label: 'ダーク', icon: Moon },
  { value: 'system', label: 'システム', icon: Monitor },
];

export default function SettingsRoute() {
  const { clientId, isSignedIn, signOut } = useAuth();
  const setClientId = useAuthStore((s) => s.setClientId);
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const changeTheme = (next: Theme) => {
    setTheme(next);
    setThemeState(next);
  };

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

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">テーマ</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => changeTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition',
                  theme === value
                    ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
                )}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Google アカウント
          </h2>
          <p className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">
            クライアント ID: {clientId ?? '未設定'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {clientId && (
              <Button variant="secondary" size="sm" onClick={() => setClientId(null)}>
                クライアント ID を変更
              </Button>
            )}
            {isSignedIn && (
              <Button variant="danger" size="sm" onClick={signOut}>
                <LogOut size={15} />
                サインアウト
              </Button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
