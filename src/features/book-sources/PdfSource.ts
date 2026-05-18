import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { BookSource, PageInfo } from './BookSource';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/** Backing-store resolution multiplier — pages render crisply up to ~2x zoom. */
const RENDER_SCALE = 2;

/** A PDF book, rendered via Mozilla's pdf.js. */
export class PdfSource implements BookSource {
  readonly kind = 'pdf' as const;

  private constructor(private doc: PDFDocumentProxy) {}

  get pageCount(): number {
    return this.doc.numPages;
  }

  static async create(blob: Blob): Promise<PdfSource> {
    const data = new Uint8Array(await blob.arrayBuffer());
    const doc = await pdfjsLib.getDocument({ data }).promise;
    return new PdfSource(doc);
  }

  async getPageInfo(index: number): Promise<PageInfo> {
    const page = await this.doc.getPage(index + 1);
    const viewport = page.getViewport({ scale: 1 });
    return { index, width: viewport.width, height: viewport.height };
  }

  async renderPage(index: number, canvas: HTMLCanvasElement): Promise<PageInfo> {
    const page = await this.doc.getPage(index + 1);
    const cssViewport = page.getViewport({ scale: 1 });
    const renderViewport = page.getViewport({ scale: RENDER_SCALE });
    canvas.width = Math.floor(renderViewport.width);
    canvas.height = Math.floor(renderViewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D コンテキストを取得できません');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport: renderViewport }).promise;
    return { index, width: cssViewport.width, height: cssViewport.height };
  }

  dispose(): void {
    void this.doc.destroy();
  }
}
