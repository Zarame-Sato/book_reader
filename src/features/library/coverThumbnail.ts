import type { BookSource } from '@/features/book-sources/BookSource';

const TARGET_WIDTH = 480;

/** Renders the first page and downscales it to a cover thumbnail Blob. */
export async function generateCover(source: BookSource): Promise<Blob | null> {
  const work = document.createElement('canvas');
  await source.renderPage(0, work);
  if (work.width === 0 || work.height === 0) return null;

  const scale = Math.min(1, TARGET_WIDTH / work.width);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(work.width * scale));
  out.height = Math.max(1, Math.round(work.height * scale));
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(work, 0, 0, out.width, out.height);

  return new Promise((resolve) => {
    out.toBlob((blob) => resolve(blob), 'image/webp', 0.82);
  });
}
