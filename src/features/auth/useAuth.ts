import { useCallback } from 'react';
import { useAuthStore } from './authStore';
import { requestAccessToken, revokeToken } from './gisAuth';

export function useAuth() {
  const clientId = useAuthStore((s) => s.clientId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);

  const signIn = useCallback(async () => {
    const id = useAuthStore.getState().clientId;
    if (!id) {
      useAuthStore.getState().setStatus('error', 'OAuth クライアント ID を設定してください');
      return;
    }
    useAuthStore.getState().setStatus('connecting');
    try {
      const result = await requestAccessToken(id, { interactive: true });
      useAuthStore.getState().setToken(result.accessToken, result.expiresAt);
    } catch (e) {
      useAuthStore
        .getState()
        .setStatus('error', e instanceof Error ? e.message : String(e));
    }
  }, []);

  const signOut = useCallback(() => {
    const token = useAuthStore.getState().accessToken;
    if (token) revokeToken(token);
    useAuthStore.getState().clearToken();
  }, []);

  return {
    clientId,
    isSignedIn: accessToken !== null,
    status,
    error,
    signIn,
    signOut,
  };
}
