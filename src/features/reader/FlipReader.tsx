import { useEffect, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Spinner } from '@/components/Spinner';
import type { BookSource } from '@/features/book-sources/BookSource';
import type { ReadingDirection } from '@/lib/idb';
import { FlipPage } from './FlipPage';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

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

/** Realistic page-curl + auto two-page spread reader (react-pageflip). */
export function FlipReader({ source, index, direction, onPageChange }: FlipReaderProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageAspect, setPageAspect] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(index);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(orientation: landscape)').matches,
  );

  // Track orientation — landscape shows spread, portrait shows single page.
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const onChange = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Use the first page's aspect ratio for the book dimensions.
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

  // Two-finger pinch zoom — capture-phase touch handlers so StPageFlip's own
  // single-finger drag handler isn't disturbed. Trackpad pinch (ctrl+wheel)
  // and ctrl+wheel on desktop are also handled.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let pinching = false;
    let startDistance = 0;
    let startScale = 1;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const a = e.touches[0]!;
        const b = e.touches[1]!;
        startDistance = distance(a, b);
        startScale = zoomRef.current;
        pinching = true;
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length < 2 || startDistance <= 0) return;
      const a = e.touches[0]!;
      const b = e.touches[1]!;
      const next = clamp(
        startScale * (distance(a, b) / startDistance),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      setZoom(next);
      e.preventDefault();
      e.stopPropagation();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (pinching && e.touches.length < 2) pinching = false;
    };
    const onWheel = (e: WheelEvent) => {
      // Trackpad pinch on macOS sends wheel events with ctrlKey set.
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

  if (pageAspect === null) {
    return (
      <div className="grid size-full place-items-center text-stone-400">
        <Spinner size={22} />
      </div>
    );
  }

  const baseWidth = 380;
  const baseHeight = Math.max(1, Math.round(baseWidth / pageAspect));
  const flipBookProps = {
    width: baseWidth,
    height: baseHeight,
    size: 'stretch' as const,
    minWidth: 200,
    maxWidth: 3000,
    minHeight: Math.max(1, Math.round(200 / pageAspect)),
    maxHeight: Math.max(1, Math.round(3000 / pageAspect)),
    drawShadow: true,
    flippingTime: 650,
    usePortrait: !isLandscape,
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
    style: { width: '100%', height: '100%' },
    onFlip: (e: { data: number }) => {
      setCurrentIndex(e.data);
      onPageChange(e.data);
    },
  };

  const handleDoubleClick = () => setZoom(1);

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      className="touch-none-area relative size-full overflow-hidden"
    >
      <div
        className="size-full"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease-out',
        }}
      >
        <div
          className="size-full"
          // Mirror for right-bound books so the curl goes right-to-left
          // (manga style); FlipPage un-mirrors its contents.
          style={direction === 'rtl' ? { transform: 'scaleX(-1)' } : undefined}
        >
          {/* HTMLFlipBook's typings are weak — cast props through any. */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <HTMLFlipBook
            ref={bookRef}
            // Remount on orientation change so usePortrait takes effect cleanly.
            key={isLandscape ? 'landscape' : 'portrait'}
            {...(flipBookProps as any)}
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
      </div>
    </div>
  );
}
