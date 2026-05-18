import { DRIVE_API, DRIVE_UPLOAD_API } from '@/config';
import { getValidAccessToken, requestAccessToken } from '@/features/auth/gisAuth';
import { useAuthStore } from '@/features/auth/authStore';
import type { DriveFile, DriveFileList } from './driveTypes';

export class DriveError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'DriveError';
    this.status = status;
  }
}

const FILE_FIELDS = 'id,name,mimeType,modifiedTime,size,iconLink,thumbnailLink,parents';

async function parseError(res: Response): Promise<DriveError> {
  let message = `Drive API エラー (${res.status})`;
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (body.error?.message) message = body.error.message;
  } catch {
    // non-JSON error body — keep the default message
  }
  return new DriveError(res.status, message);
}

/** Fetch wrapper that injects the bearer token and retries once on a 401. */
async function driveFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getValidAccessToken();
  const auth = (t: string): RequestInit => ({
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${t}` },
  });

  let res = await fetch(url, auth(token));
  if (res.status === 401) {
    const clientId = useAuthStore.getState().clientId;
    if (clientId) {
      const refreshed = await requestAccessToken(clientId, { interactive: false });
      useAuthStore.getState().setToken(refreshed.accessToken, refreshed.expiresAt);
      res = await fetch(url, auth(refreshed.accessToken));
    }
  }
  if (!res.ok) throw await parseError(res);
  return res;
}

/** Lists the direct children of a folder. Pass `'root'` for the Drive root. */
export async function listFolder(
  folderId: string,
  pageToken?: string,
): Promise<DriveFileList> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: `nextPageToken,files(${FILE_FIELDS})`,
    pageSize: '200',
    orderBy: 'folder,name_natural',
    spaces: 'drive',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  if (pageToken) params.set('pageToken', pageToken);
  const res = await driveFetch(`${DRIVE_API}/files?${params.toString()}`);
  return (await res.json()) as DriveFileList;
}

export async function getFileMeta(fileId: string): Promise<DriveFile> {
  const params = new URLSearchParams({ fields: FILE_FIELDS, supportsAllDrives: 'true' });
  const res = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
  );
  return (await res.json()) as DriveFile;
}

/** Downloads a file's binary content, optionally reporting progress. */
export async function downloadFile(
  fileId: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Blob> {
  const params = new URLSearchParams({ alt: 'media', supportsAllDrives: 'true' });
  const res = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
  );
  if (!res.body || !onProgress) return res.blob();

  const total = Number(res.headers.get('Content-Length') ?? 0);
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress(loaded, total);
  }
  return new Blob(chunks);
}

/** Escapes a value for use inside a Drive `q` query string literal. */
function escapeQuery(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Finds a file by exact name within a folder, or null if absent. */
export async function findFileInFolder(
  name: string,
  parentId: string,
): Promise<DriveFile | null> {
  const params = new URLSearchParams({
    q: `name='${escapeQuery(name)}' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id,name,modifiedTime)',
    spaces: 'drive',
    pageSize: '5',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  const res = await driveFetch(`${DRIVE_API}/files?${params.toString()}`);
  const list = (await res.json()) as DriveFileList;
  return list.files[0] ?? null;
}

/** Creates a new JSON file via multipart upload. */
export async function createJsonFile(
  name: string,
  parents: string[],
  content: unknown,
): Promise<DriveFile> {
  const boundary = `bookreader-${crypto.randomUUID()}`;
  const metadata = { name, parents, mimeType: 'application/json' };
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${JSON.stringify(content)}\r\n` +
    `--${boundary}--`;
  const res = await driveFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,modifiedTime&supportsAllDrives=true`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  return (await res.json()) as DriveFile;
}

/** Replaces a file's content with a JSON payload. */
export async function updateJsonFile(
  fileId: string,
  content: unknown,
): Promise<DriveFile> {
  const res = await driveFetch(
    `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,modifiedTime&supportsAllDrives=true`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    },
  );
  return (await res.json()) as DriveFile;
}
