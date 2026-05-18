/** The reader treats every supported format as one of these page-based kinds. */
export type BookKind = 'pdf' | 'cbz' | 'image';

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp']);
const ARCHIVE_EXT = new Set(['zip', 'cbz']);

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** Returns the book kind for a file, or null if it is not a supported book. */
export function detectBookKind(name: string, mimeType?: string): BookKind | null {
  const ext = fileExtension(name);
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (ARCHIVE_EXT.has(ext) || mimeType === 'application/zip') return 'cbz';
  if (IMAGE_EXT.has(ext) || mimeType?.startsWith('image/')) return 'image';
  return null;
}

export const BOOK_KIND_LABEL: Record<BookKind, string> = {
  pdf: 'PDF',
  cbz: 'コミック',
  image: '画像',
};
