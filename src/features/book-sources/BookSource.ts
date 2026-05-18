import type { BookKind } from './bookKind';

/** Intended on-screen dimensions of a page, in CSS pixels at zoom 1. */
export interface PageInfo {
  index: number;
  width: number;
  height: number;
}

/**
 * A format-agnostic, page-based view of a book. PDF, comic archives and
 * single images all implement this so the reader UI stays uniform.
 */
export interface BookSource {
  readonly kind: BookKind;
  readonly pageCount: number;

  /** Page dimensions without rendering — used for layout, covers, navigation. */
  getPageInfo(index: number): Promise<PageInfo>;

  /**
   * Renders a page into `canvas` (the canvas backing store is sized for HiDPI
   * internally) and returns the page's intended CSS dimensions.
   */
  renderPage(index: number, canvas: HTMLCanvasElement): Promise<PageInfo>;

  /** Releases decoded resources. */
  dispose(): void;
}
