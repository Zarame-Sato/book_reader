import { STORAGE_KEYS } from '@/config';

export type Theme = 'light' | 'dark' | 'system';

export function getStoredTheme(): Theme {
  const v = localStorage.getItem(STORAGE_KEYS.theme);
  // Default to light — a bright, resort-like reading mood.
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'light';
}

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', resolve(theme) === 'dark');
}

export function applyStoredTheme(): void {
  applyTheme(getStoredTheme());
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
  applyTheme(theme);
}
