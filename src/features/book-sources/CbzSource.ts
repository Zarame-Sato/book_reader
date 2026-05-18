import { unzip, type Unzipped } from 'fflate';
import { naturalCompare } from '@/lib/naturalSort';
import type { BookSource, PageInfo } from './BookSource';
import { drawBitmap } from './canvasUtils';

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;

function isPageEntry(name: string): boolean {
  return IMAGE_RE.test(name) && !name.startsWith('__MACOSX') && !name.includes('/.');
}

/** A comic archive (ZIP/CBZ of page images). */
export class CbzSource implements BookSource {
  readonly kind = 'cbz' as const;

  private pages: Uint8Array[] = [];
  private infoCache = new Map<number, PageInfo>();

  get pageCount(): number {
    return this.pages.length;
  }

  private constructor() {}

  static async create(blob: Blob): Promise<CbzSource> {
    const source = new CbzSource();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const files = await new Promise<Unzipped>((resolve, reject) => {
      unzip(bytes, { filter: (file) => isPageEntry(file.name) }, (err, data) => {
        if (err) reject(new Error('アーカイブの展開に失敗しました'));
        else resolve(data);
      });
    });
    source.pages = Object.keys(files)
      .sort(naturalCompare)
      .map((name) => files[name]!);
    if (source.pages.length === 0) {
      throw new Error('アーカイブ内に画像ページが見つかりませんでした');
    }
    return source;
  }

  private async decode(index: number): Promise<ImageBitmap> {
    const bytes = this.pages[index];
    if (!bytes) throw new Error(`ページ ${index + 1} が存在しません`);
    return createImageBitmap(new Blob([bytes as BlobPart]));
  }

  async getPageInfo(index: number): Promise<PageInfo> {
    const cached = this.infoCache.get(index);
    if (cached) return cached;
    const bitmap = await this.decode(index);
    const info: PageInfo = { index, width: bitmap.width, height: bitmap.height };
    bitmap.close();
    this.infoCache.set(index, info);
    return info;
  }

  async renderPage(index: number, canvas: HTMLCanvasElement): Promise<PageInfo> {
    const bitmap = await this.decode(index);
    const { width, height } = drawBitmap(canvas, bitmap);
    bitmap.close();
    const info: PageInfo = { index, width, height };
    this.infoCache.set(index, info);
    return info;
  }

  dispose(): void {
    this.pages = [];
    this.infoCache.clear();
  }
}
