// Minimal ambient types for the Google Identity Services token client.
// https://developers.google.com/identity/oauth2/web/guides/use-token-model

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void;
}

interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  error_callback?: (error: { type: string; message?: string }) => void;
  prompt?: string;
}

interface GoogleAccountsOAuth2 {
  initTokenClient(config: GoogleTokenClientConfig): GoogleTokenClient;
  revoke(accessToken: string, done?: () => void): void;
}

interface Window {
  google?: {
    accounts: {
      oauth2: GoogleAccountsOAuth2;
    };
  };
}
