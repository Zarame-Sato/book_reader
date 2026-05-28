import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
// page-flip's CSS sets `transform-style: preserve-3d` on the leaf elements.
// Without it the library's internal rotateY transforms collapse to a 2D
// mirror (scaleX) and pages render flipped.
import 'page-flip/src/Style/stPageFlip.css';
import { Spinner } from '@/components/Spinner';
import type { BookSource } from '@/features/book-sources/BookSource';
import type { ReadingDirection } from '@/lib/idb';
import { FlipPage } from './FlipPage';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const BOOK_PADDING = 12;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

function distance(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Map a book-index to the lib's index, taking into account RTL reversal and
 * padding (we pad odd-count books to an even libCount so page-flip doesn't
 * mark the lone last page "hard" — that gave the cover a rigid flip).
 */
function bookToLib(
  bookIndex: number,
  libCount: number,
  direction: ReadingDirection,
): number {
  return direction === 'rtl' ? libCount - 1 - bookIndex : bookIndex;
}

/** Reverse mapping. Returns null when the lib-index is a padding page. */
function libToBook(
  libIndex: number,
  libCount: number,
  pageCount: number,
  direction: ReadingDirection,
): number | null {
  const candidate = direction === 'rtl' ? libCount - 1 - libIndex : libIndex;
  return candidate >= 0 && candidate < pageCount ? candidate : null;
}

/** A blank padding page used to keep the page count even. */
const BlankPage = forwardRef<HTMLDivElement>(function BlankPage(_, ref) {
  return <div ref={ref} className="size-full bg-white" />;
});

interface FlipReaderProps {
  source: BookSource;
  index: number;
  direction: ReadingDirection;
  onPageChange: (index: number) => void;
  /** Tapping the central area (away from flip corners) toggles the UI. */
  onCenterTap?: () => void;
}

interface BookDimensions {
  pageWidth: number;
  pageHeight: number;
  bookWidth: number;
  isPortrait: boolean;
}

/** Realistic page-curl + auto two-page spread reader (react-pageflip). */
export function FlipReader({
  source,
  index,
  direction,
  onPageChange,
  onCenterTap,
}: FlipReaderProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pageAspect, setPageAspect] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(index);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const onCenterTapRef = useRef(onCenterTap);
  onCenterTapRef.current = onCenterTap;

  // Measure the container; only re-set state when the numbers actually change
  // so iOS Safari's URL-bar wiggle doesn't churn the flipbook.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setContainerSize((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h },
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // First page's aspect ratio drives the book proportions.
  useEffect(() => {
    let active = true;
    void source
      .getPageInfo(0)
      .then((info) => {
        if (active && info.height > 0) setPageAspect(info.width / info.height);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [source]);

  const libCount =
    source.pageCount % 2 === 0 ? source.pageCount : source.pageCount + 1;

  // Sync external index changes (toolbar nav, slider) to the flipbook.
  useEffect(() => {
    if (index === currentIndex) return;
    const flip = bookRef.current?.pageFlip?.();
    if (flip && typeof flip.flip === 'function') {
      try {
        flip.flip(bookToLib(index, libCount, direction));
      } catch {
        /* ignore — flipbook may not be ready yet */
      }
    }
    setCurrentIndex(index);
  }, [index, currentIndex, direction, libCount]);

  // Prefetch pages around the current one so flips feel instant.
  useEffect(() => {
    if (!source.prefetch) return;
    for (let offset = -4; offset <= 4; offset++) {
      const i = currentIndex + offset;
      if (i >= 0 && i < source.pageCount) source.prefetch(i);
    }
  }, [currentIndex, source]);

  // Pinch (two-finger) zoom + single-finger centre-tap detection — capture-
  // phase so StPageFlip's own pointer handlers aren't disturbed.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let pinching = false;
    let startDistance = 0;
    let startScale = 1;
    let tapStart: { x: number; y: number; time: number } | null = null;
    let tapMoved = false;
    let lastTouchTapAt = 0;

    const triggerCenterTap = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      const relX = (clientX - rect.left) / rect.width;
      if (relX >= 0.22 && relX <= 0.78) {
        onCenterTapRef.current?.();
        return true;
      }
      return false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDistance = distance(e.touches[0]!, e.touches[1]!);
        startScale = zoomRef.current;
        pinching = true;
        tapStart = null;
        e.preventDefault();
        e.stopPropagation();
      } else if (e.touches.length === 1) {
        const t = e.touches[0]!;
        tapStart = { x: t.clientX, y: t.clientY, time: Date.now() };
        tapMoved = false;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pinching && e.touches.length >= 2 && startDistance > 0) {
        const d = distance(e.touches[0]!, e.touches[1]!);
        setZoom(clamp(startScale * (d / startDistance), MIN_ZOOM, MAX_ZOOM));
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (tapStart && e.touches.length === 1) {
        const t = e.touches[0]!;
        if (Math.hypot(t.clientX - tapStart.x, t.clientY - tapStart.y) > 10) {
          tapMoved = true;
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (pinching && e.touches.length < 2) pinching = false;
      if (
        tapStart &&
        e.touches.length === 0 &&
        !tapMoved &&
        Date.now() - tapStart.time < 300
      ) {
        if (triggerCenterTap(tapStart.x)) lastTouchTapAt = Date.now();
      }
      if (e.touches.length === 0) tapStart = null;
    };
    const onClick = (e: MouseEvent) => {
      if (Date.now() - lastTouchTapAt < 500) return;
      triggerCenterTap(e.clientX);
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.06 : 0.94;
      setZoom(clamp(zoomRef.current * factor, MIN_ZOOM, MAX_ZOOM));
    };

    const opts: AddEventListenerOptions = { capture: true, passive: false };
    el.addEventListener('touchstart', onTouchStart, opts);
    el.addEventListener('touchmove', onTouchMove, opts);
    el.addEventListener('touchend', onTouchEnd, opts);
    el.addEventListener('touchcancel', onTouchEnd, opts);
    el.addEventListener('click', onClick);
    el.addEventListener('wheel', onWheel, opts);
    return () => {
      el.removeEventListener('touchstart', onTouchStart, opts);
      el.removeEventListener('touchmove', onTouchMove, opts);
      el.removeEventListener('touchend', onTouchEnd, opts);
      el.removeEventListener('touchcancel', onTouchEnd, opts);
      el.removeEventListener('click', onClick);
      el.removeEventListener('wheel', onWheel, opts);
    };
  }, []);

  // Compute the largest page size that fits the container while keeping aspect.
  const dimensions: BookDimensions | null = useMemo(() => {
    if (!pageAspect || containerSize.width <= 0 || containerSize.height <= 0) return null;
    const isPortrait = containerSize.height >= containerSize.width;
    const pagesShown = isPortrait ? 1 : 2;
    const bookAspect = pageAspect * pagesShown;
    const maxW = Math.max(1, containerSize.width - BOOK_PADDING * 2);
    const maxH = Math.max(1, containerSize.height - BOOK_PADDING * 2);

    let bookW: number;
    let bookH: number;
    if (maxW / maxH > bookAspect) {
      bookH = Math.round(maxH);
      bookW = Math.round(bookH * bookAspect);
    } else {
      bookW = Math.round(maxW);
      bookH = Math.round(bookW / bookAspect);
    }
    return {
      pageWidth: Math.max(1, Math.round(bookW / pagesShown)),
      pageHeight: Math.max(1, bookH),
      bookWidth: Math.max(1, bookW),
      isPortrait,
    };
  }, [pageAspect, containerSize.width, containerSize.height]);

  return (
    <div
      ref={containerRef}
      className="touch-none-area relative grid size-full place-items-center overflow-hidden"
    >
      {!dimensions ? (
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <Spinner size={32} className="text-accent-500" />
          <p className="text-sm">ページを準備中…</p>
        </div>
      ) : (
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
        >
          {/* HTMLFlipBook's typings are weak — cast props through any. */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <HTMLFlipBook
            ref={bookRef}
            // Remount on orientation change, direction change, or a meaningful
            // (~100px bucket) size change. Minor pixel-level wobble doesn't.
            key={
              `${dimensions.isPortrait ? 'p' : 'l'}-${direction}-` +
              `${Math.round(dimensions.bookWidth / 100)}-` +
              `${Math.round(dimensions.pageHeight / 100)}`
            }
            {...({
              width: dimensions.pageWidth,
              height: dimensions.pageHeight,
              size: 'fixed' as const,
              minWidth: 100,
              maxWidth: 4000,
              minHeight: 100,
              maxHeight: 4000,
              drawShadow: true,
              flippingTime: 650,
              usePortrait: dimensions.isPortrait,
              showCover: false,
              maxShadowOpacity: 0.45,
              startPage: bookToLib(index, libCount, direction),
              showPageCorners: true,
              disableFlipByClick: false,
              useMouseEvents: true,
              mobileScrollSupport: false,
              swipeDistance: 30,
              clickEventForward: false,
              startZIndex: 0,
              autoSize: false,
              className: '',
              style: {
                width: dimensions.bookWidth,
                height: dimensions.pageHeight,
              },
              onFlip: (e: { data: number }) => {
                const bookIndex = libToBook(
                  e.data,
                  libCount,
                  source.pageCount,
                  direction,
                );
                if (bookIndex !== null) {
                  setCurrentIndex(bookIndex);
                  onPageChange(bookIndex);
                }
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)}
          >
            {Array.from({ length: libCount }, (_, libIndex) => {
              const bookIndex = libToBook(
                libIndex,
                libCount,
                source.pageCount,
                direction,
              );
              if (bookIndex === null) {
                return <BlankPage key={`pad-${libIndex}`} />;
              }
              return (
                <FlipPage
                  key={libIndex}
                  index={bookIndex}
                  source={source}
                  currentIndex={currentIndex}
                />
              );
            })}
          </HTMLFlipBook>
        </div>
      )}
    </div>
  );
}
