import { forwardRef, useEffect, useRef, useState } from 'react';
import { StaticAnnotationLayer } from '@/features/annotation/StaticAnnotationLayer';
import type { BookSource, PageInfo } from '@/features/book-sources/BookSource';
import type { ReadingDirection } from '@/lib/idb';

/** Pages within this radius of the current one render their full contents. */
const ACTIVE_WINDOW = 3;

interface FlipPageProps {
  index: number;
  source: BookSource;
  currentIndex: number;
  direction: ReadingDirection;
}

/** A single page in the flipbook — lazily renders its canvas content. */
export const FlipPage = forwardRef<HTMLDivElement, FlipPageProps>(function FlipPage(
  { index, source, currentIndex, direction },
  ref,
) {
  const isActive = Math.abs(currentIndex - index) <= ACTIVE_WINDOW;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [info, setInfo] = useState<PageInfo | null>(null);

  useEffect(() => {
    if (!isActive) {
      setInfo(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void source
      .renderPage(index, canvas)
      .then((pageInfo) => {
        if (!cancelled) setInfo(pageInfo);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isActive, source, index]);

  return (
    <div
      ref={ref}
      className="relative size-full overflow-hidden bg-white"
      // RTL books: un-mirror the page contents inside the mirrored book container.
      style={direction === 'rtl' ? { transform: 'scaleX(-1)' } : undefined}
    >
      {isActive ? (
        <>
          <canvas
            ref={canvasRef}
            className="block size-full"
            style={{ objectFit: 'contain' }}
          />
          {info && (
            <StaticAnnotationLayer
              pageIndex={index}
              pageWidth={info.width}
              pageHeight={info.height}
            />
          )}
        </>
      ) : (
        <div className="grid size-full place-items-center text-[11px] text-stone-300">…</div>
      )}
      <span className="pointer-events-none absolute bottom-1 right-2 text-[10px] text-stone-300 select-none">
        {index + 1}
      </span>
    </div>
  );
});
