/** App-wide constants and configuration. */

export const APP_NAME = 'book_reader';

/**
 * Google Drive OAuth scope.
 * Full `drive` scope is required for browsing arbitrary folders (SideBooks-style)
 * and for creating/updating sidecar annotation files next to each book.
 */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

/** Google Identity Services client script. */
export const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

/** Drive REST API base URLs. */
export const DRIVE_API = 'https://www.googleapis.com/drive/v3';
export const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

/** Sidecar annotation files are named `<bookName>.bookreader-annot.json`. */
export const SIDECAR_SUFFIX = '.bookreader-annot.json';

/** Current sidecar JSON schema version. */
export const SIDECAR_SCHEMA_VERSION = 1;

/** localStorage keys (non-secret values only — tokens stay in memory). */
export const STORAGE_KEYS = {
  oauthClientId: 'book_reader.oauthClientId',
  theme: 'book_reader.theme',
} as const;

/** Lowercase file extensions the reader can open. */
export const SUPPORTED_EXTENSIONS = [
  'pdf',
  'zip',
  'cbz',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];
