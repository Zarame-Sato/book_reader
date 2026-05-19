import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { BookSource, PageInfo } from './BookSource';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/** Backing-store resolution multiplier — pages render crisply up to ~2x zoom. */
const RENDER_SCALE = 2;
/** How many rendered pages to keep cached. */
const MAX_CACHE = 14;

interface RenderedPage {
  bitmap: ImageBitmap;
  info: PageInfo;
}

/** A PDF book, rendered via Mozilla's pdf.js with a rendered-page cache. */
export class PdfSource implements BookSource {
  readonly kind = 'pdf' as const;

  private rendered = new Map<number, RenderedPage>();
  private inFlight = new Map<number, Promise<RenderedPage>>();
  private order: number[] = [];

  private constructor(private doc: PDFDocumentProxy) {}

  get pageCount(): number {
    return this.doc.numPages;
  }

  static async create(blob: Blob): Promise<PdfSource> {
    const data = new Uint8Array(await blob.arrayBuffer());
    const doc = await pdfjsLib.getDocument({ data }).promise;
    return new PdfSource(doc);
  }

  private async renderToBitmap(index: number): Promise<RenderedPage> {
    const page = await this.doc.getPage(index + 1);
    const cssViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D コンテキストを取得できません');
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const bitmap = await createImageBitmap(canvas);
    return {
      bitmap,
      info: { index, width: cssViewport.width, height: cssViewport.height },
    };
  }

  private getRendered(index: number): Promise<RenderedPage> {
    const cached = this.rendered.get(index);
    if (cached) return Promise.resolve(cached);
    const pending = this.inFlight.get(index);
    if (pending) return pending;

    const promise = this.renderToBitmap(index).then((result) => {
      this.rendered.set(index, result);
      this.order.push(index);
      this.inFlight.delete(index);
      this.evict();
      return result;
    });
    this.inFlight.set(index, promise);
    return promise;
  }

  private evict(): void {
    while (this.order.length > MAX_CACHE) {
      const oldest = this.order.shift()!;
      if (this.order.includes(oldest)) continue;
      this.rendered.get(oldest)?.bitmap.close();
      this.rendered.delete(oldest);
    }
  }

  async getPageInfo(index: number): Promise<PageInfo> {
    const cached = this.rendered.get(index);
    if (cached) return cached.info;
    const page = await this.doc.getPage(index + 1);
    const viewport = page.getViewport({ scale: 1 });
    return { index, width: viewport.width, height: viewport.height };
  }

  async renderPage(index: number, canvas: HTMLCanvasElement): Promise<PageInfo> {
    const { bitmap, info } = await this.getRendered(index);
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D コンテキストを取得できません');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    return info;
  }

  /** Renders a page ahead of time so the next turn is instant. */
  prefetch(index: number): void {
    if (index < 0 || index >= this.pageCount) return;
    if (this.rendered.has(index) || this.inFlight.has(index)) return;
    void this.getRendered(index).catch(() => undefined);
  }

  dispose(): void {
    for (const entry of this.rendered.values()) entry.bitmap.close();
    this.rendered.clear();
    this.inFlight.clear();
    this.order = [];
    void this.doc.destroy();
  }
}
