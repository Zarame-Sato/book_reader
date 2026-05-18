import { create } from 'zustand';
import { DEFAULT_OAUTH_CLIENT_ID, STORAGE_KEYS } from '@/config';

export type AuthStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface AuthState {
  /** User-supplied OAuth Client ID (not a secret — persisted to localStorage). */
  clientId: string | null;
  /** Access token — kept in memory only, never persisted. */
  accessToken: string | null;
  /** Token expiry as epoch ms. */
  expiresAt: number | null;
  status: AuthStatus;
  error: string | null;

  setClientId: (id: string | null) => void;
  setToken: (accessToken: string, expiresAt: number) => void;
  setStatus: (status: AuthStatus, error?: string | null) => void;
  clearToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  clientId: localStorage.getItem(STORAGE_KEYS.oauthClientId) ?? DEFAULT_OAUTH_CLIENT_ID,
  accessToken: null,
  expiresAt: null,
  status: 'idle',
  error: null,

  setClientId: (id) => {
    if (id) localStorage.setItem(STORAGE_KEYS.oauthClientId, id);
    else localStorage.removeItem(STORAGE_KEYS.oauthClientId);
    set({ clientId: id, accessToken: null, expiresAt: null, status: 'idle', error: null });
  },

  setToken: (accessToken, expiresAt) =>
    set({ accessToken, expiresAt, status: 'connected', error: null }),

  setStatus: (status, error = null) => set({ status, error }),

  clearToken: () => set({ accessToken: null, expiresAt: null, status: 'idle', error: null }),
}));
