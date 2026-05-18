import type { BookSource, PageInfo } from './BookSource';
import { drawBitmap } from './canvasUtils';

/** A single-image "book" (JPG/PNG/WebP/…). */
export class ImageSource implements BookSource {
  readonly kind = 'image' as const;
  readonly pageCount = 1;

  private bitmap: ImageBitmap | null = null;
  private info: PageInfo | null = null;

  private constructor() {}

  static async create(blob: Blob): Promise<ImageSource> {
    const source = new ImageSource();
    source.bitmap = await createImageBitmap(blob);
    source.info = {
      index: 0,
      width: source.bitmap.width,
      height: source.bitmap.height,
    };
    return source;
  }

  async getPageInfo(): Promise<PageInfo> {
    if (!this.info) throw new Error('画像が読み込まれていません');
    return this.info;
  }

  async renderPage(_index: number, canvas: HTMLCanvasElement): Promise<PageInfo> {
    if (!this.bitmap || !this.info) throw new Error('画像が読み込まれていません');
    drawBitmap(canvas, this.bitmap);
    return this.info;
  }

  dispose(): void {
    this.bitmap?.close();
    this.bitmap = null;
  }
}
