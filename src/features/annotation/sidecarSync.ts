import { SIDECAR_SUFFIX } from '@/config';
import {
  createJsonFile,
  downloadFile,
  findFileInFolder,
  getFileMeta,
  updateJsonFile,
} from '@/features/drive/driveClient';
import { getBookRecord, updateBookRecord } from '@/features/library/booksDb';
import type { SidecarDocument } from './annotationTypes';

function sidecarName(bookName: string): string {
  return `${bookName}${SIDECAR_SUFFIX}`;
}

/** Downloads a book's annotation sidecar from Drive, or null if none exists. */
export async function pullSidecar(fileId: string): Promise<SidecarDocument | null> {
  const record = await getBookRecord(fileId);
  let sidecarId = record?.sidecarFileId ?? null;

  if (!sidecarId) {
    const meta = await getFileMeta(fileId);
    const parent = meta.parents?.[0];
    if (!parent) return null;
    const found = await findFileInFolder(sidecarName(meta.name), parent);
    if (!found) return null;
    sidecarId = found.id;
    await updateBookRecord(fileId, { sidecarFileId: sidecarId });
  }

  const blob = await downloadFile(sidecarId);
  return JSON.parse(await blob.text()) as SidecarDocument;
}

/** Writes the sidecar to Drive (creating it next to the book if needed). */
export async function pushSidecar(
  fileId: string,
  doc: SidecarDocument,
): Promise<string> {
  const record = await getBookRecord(fileId);
  const meta = await getFileMeta(fileId);
  const parent = meta.parents?.[0];
  let sidecarId = record?.sidecarFileId ?? null;

  if (!sidecarId && parent) {
    const found = await findFileInFolder(sidecarName(meta.name), parent);
    if (found) sidecarId = found.id;
  }

  if (sidecarId) {
    await updateJsonFile(sidecarId, doc);
  } else {
    if (!parent) throw new Error('書籍の保存先フォルダを特定できません');
    const created = await createJsonFile(sidecarName(meta.name), [parent], doc);
    sidecarId = created.id;
  }
  await updateBookRecord(fileId, { sidecarFileId: sidecarId });
  return sidecarId;
}
