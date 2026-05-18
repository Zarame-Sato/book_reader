import { DRIVE_SCOPE, GIS_SCRIPT_SRC } from '@/config';
import { useAuthStore } from './authStore';

/** Loads the Google Identity Services client script exactly once. */
let scriptPromise: Promise<void> | null = null;

export function loadGis(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Google 認証スクリプトの読み込みに失敗しました'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export interface AccessTokenResult {
  accessToken: string;
  expiresAt: number;
  scope: string;
}

let tokenClient: GoogleTokenClient | null = null;
let tokenClientId: string | null = null;
let pending: {
  resolve: (result: AccessTokenResult) => void;
  reject: (error: Error) => void;
} | null = null;

function getTokenClient(clientId: string): GoogleTokenClient {
  if (tokenClient && tokenClientId === clientId) return tokenClient;
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google 認証スクリプトが未読み込みです');
  }
  tokenClientId = clientId;
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: (response) => {
      const p = pending;
      pending = null;
      if (!p) return;
      if (response.error) {
        p.reject(new Error(response.error_description || response.error));
        return;
      }
      p.resolve({
        accessToken: response.access_token,
        expiresAt: Date.now() + response.expires_in * 1000,
        scope: response.scope,
      });
    },
    error_callback: (error) => {
      const p = pending;
      pending = null;
      p?.reject(new Error(error.message || error.type || '認証がキャンセルされました'));
    },
  });
  return tokenClient;
}

/**
 * Requests an access token via GIS.
 * `interactive: true` may show the Google consent popup;
 * `interactive: false` attempts a silent refresh using the existing session.
 */
export async function requestAccessToken(
  clientId: string,
  opts: { interactive: boolean },
): Promise<AccessTokenResult> {
  await loadGis();
  const client = getTokenClient(clientId);
  return new Promise<AccessTokenResult>((resolve, reject) => {
    if (pending) {
      reject(new Error('認証処理がすでに進行中です'));
      return;
    }
    pending = { resolve, reject };
    try {
      client.requestAccessToken({ prompt: opts.interactive ? '' : 'none' });
    } catch (e) {
      pending = null;
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

/**
 * Returns a currently-valid access token, refreshing silently if it is
 * missing or within 60s of expiry. Throws if no client ID is configured
 * or a silent refresh is not possible (caller should then sign in interactively).
 */
export async function getValidAccessToken(): Promise<string> {
  const { clientId, accessToken, expiresAt } = useAuthStore.getState();
  if (!clientId) throw new Error('OAuth クライアント ID が未設定です');
  if (accessToken && expiresAt && expiresAt - Date.now() > 60_000) {
    return accessToken;
  }
  const result = await requestAccessToken(clientId, { interactive: false });
  useAuthStore.getState().setToken(result.accessToken, result.expiresAt);
  return result.accessToken;
}

export function revokeToken(accessToken: string): void {
  window.google?.accounts.oauth2.revoke(accessToken);
}
