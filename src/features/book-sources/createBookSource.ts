import type { BookKind } from './bookKind';
import type { BookSource } from './BookSource';
import { CbzSource } from './CbzSource';
import { ImageSource } from './ImageSource';

/** Builds the appropriate BookSource for a downloaded book file. */
export async function createBookSource(kind: BookKind, blob: Blob): Promise<BookSource> {
  switch (kind) {
    case 'image':
      return ImageSource.create(blob);
    case 'cbz':
      return CbzSource.create(blob);
    case 'pdf': {
      const { PdfSource } = await import('./PdfSource');
      return PdfSource.create(blob);
    }
  }
}
