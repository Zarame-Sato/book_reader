import { useEffect, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Spinner } from '@/components/Spinner';
import type { BookSource } from '@/features/book-sources/BookSource';
import type { ReadingDirection } from '@/lib/idb';
import { FlipPage } from './FlipPage';

interface FlipReaderProps {
  source: BookSource;
  index: number;
  direction: ReadingDirection;
  onPageChange: (index: number) => void;
}

/** Realistic page-curl + auto two-page spread reader (react-pageflip). */
export function FlipReader({ source, index, direction, onPageChange }: FlipReaderProps) {
  // react-pageflip's TypeScript types are weak; treat the ref as any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = useRef<any>(null);
  const [pageAspect, setPageAspect] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(index);

  // Use the first page's aspect ratio for the book dimensions.
  useEffect(() => {
    let active = true;
    void source
      .getPageInfo(0)
      .then((info) => {
        if (!active || info.height <= 0) return;
        setPageAspect(info.width / info.height);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [source]);

  // Reflect external index changes (toolbar buttons, slider) onto the flipbook.
  useEffect(() => {
    if (index === currentIndex) return;
    const flip = bookRef.current?.pageFlip?.();
    if (flip && typeof flip.flip === 'function') {
      try {
        flip.flip(index);
      } catch {
        /* ignore — book not ready yet */
      }
    }
    setCurrentIndex(index);
  }, [index, currentIndex]);

  if (pageAspect === null) {
    return (
      <div className="grid size-full place-items-center text-stone-400">
        <Spinner size={22} />
      </div>
    );
  }

  const baseWidth = 600;
  const baseHeight = Math.max(1, Math.round(baseWidth / pageAspect));
  const flipBookProps = {
    width: baseWidth,
    height: baseHeight,
    size: 'stretch' as const,
    minWidth: 240,
    maxWidth: 2000,
    minHeight: Math.max(1, Math.round(240 / pageAspect)),
    maxHeight: Math.max(1, Math.round(2000 / pageAspect)),
    drawShadow: true,
    flippingTime: 650,
    usePortrait: true,
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
    style: {},
    onFlip: (e: { data: number }) => {
      setCurrentIndex(e.data);
      onPageChange(e.data);
    },
  };

  return (
    <div
      className="relative grid size-full place-items-center"
      // Mirror the entire flipbook for right-bound books so the flip animation
      // and corner-tap go right-to-left (manga style). FlipPage un-mirrors its
      // contents so each page reads normally.
      style={direction === 'rtl' ? { transform: 'scaleX(-1)' } : undefined}
    >
      {/* HTMLFlipBook's typings are weak, so spread props through an any-cast. */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <HTMLFlipBook ref={bookRef} {...(flipBookProps as any)}>
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
  );
}
