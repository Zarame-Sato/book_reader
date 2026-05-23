import { useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
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

interface FlipReaderProps {
  source: BookSource;
  index: number;
  direction: ReadingDirection;
  onPageChange: (index: number) => void;
}

interface BookDimensions {
  pageWidth: number;
  pageHeight: number;
  bookWidth: number;
  isPortrait: boolean;
}

/** Realistic page-curl + auto two-page spread reader (react-pageflip). */
export function FlipReader({ source, index, direction, onPageChange }: FlipReaderProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pageAspect, setPageAspect] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(index);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Measure the container so we can fit the book exactly.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
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

  // Sync external index changes (toolbar nav, slider) to the flipbook.
  useEffect(() => {
    if (index === currentIndex) return;
    const flip = bookRef.current?.pageFlip?.();
    if (flip && typeof flip.flip === 'function') {
      try {
        flip.flip(index);
      } catch {
        /* ignore — flipbook may not be ready yet */
      }
    }
    setCurrentIndex(index);
  }, [index, currentIndex]);

  // Two-finger pinch zoom, via capture-phase touch handlers so StPageFlip's
  // single-finger drag handler isn't disturbed. Trackpad pinch on desktop
  // arrives as ctrl+wheel.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let pinching = false;
    let startDistance = 0;
    let startScale = 1;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDistance = distance(e.touches[0]!, e.touches[1]!);
        startScale = zoomRef.current;
        pinching = true;
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length < 2 || startDistance <= 0) return;
      const d = distance(e.touches[0]!, e.touches[1]!);
      setZoom(clamp(startScale * (d / startDistance), MIN_ZOOM, MAX_ZOOM));
      e.preventDefault();
      e.stopPropagation();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (pinching && e.touches.length < 2) pinching = false;
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
    el.addEventListener('wheel', onWheel, opts);
    return () => {
      el.removeEventListener('touchstart', onTouchStart, opts);
      el.removeEventListener('touchmove', onTouchMove, opts);
      el.removeEventListener('touchend', onTouchEnd, opts);
      el.removeEventListener('touchcancel', onTouchEnd, opts);
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
      bookH = maxH;
      bookW = Math.round(bookH * bookAspect);
    } else {
      bookW = maxW;
      bookH = Math.round(bookW / bookAspect);
    }
    return {
      pageWidth: Math.max(1, Math.round(bookW / pagesShown)),
      pageHeight: Math.max(1, bookH),
      bookWidth: bookW,
      isPortrait,
    };
  }, [pageAspect, containerSize]);

  const handleDoubleClick = () => setZoom(1);

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      className="touch-none-area relative grid size-full place-items-center overflow-hidden"
    >
      {!dimensions ? (
        <Spinner size={22} className="text-stone-400" />
      ) : (
        <div
          style={{
            transform: `${direction === 'rtl' ? 'scaleX(-1) ' : ''}scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
        >
          {/* HTMLFlipBook's typings are weak — cast props through any. */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <HTMLFlipBook
            ref={bookRef}
            key={`${dimensions.isPortrait ? 'p' : 'l'}-${dimensions.pageWidth}-${dimensions.pageHeight}`}
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
              startPage: index,
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
                setCurrentIndex(e.data);
                onPageChange(e.data);
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)}
          >
            {Array.from({ length: source.pageCount }, (_, i) => (
              <FlipPage
                key={i}
                index={i}
                source={source}
                currentIndex={currentIndex}
                direction={direction}
              />
            ))}
          </HTMLFlipBook>
        </div>
      )}
    </div>
  );
}
