import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { Spinner } from '@/components/Spinner';
import type { BookSource } from '@/features/book-sources/BookSource';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const FIT_PADDING = 24;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

export type TapZone = 'left' | 'center' | 'right';

interface PageViewProps {
  source: BookSource;
  index: number;
  /** Tapping a screen zone — used for page turns and toggling the UI. */
  onZoneTap?: (zone: TapZone) => void;
  /** Disables tap zones (e.g. while an annotation tool is active). */
  zonesDisabled?: boolean;
  /** When false, pan/pinch gestures are disabled (annotation drawing mode). */
  gesturesEnabled?: boolean;
  /** Overlay layer rendered in the page's coordinate space (annotations). */
  renderOverlay?: (page: { width: number; height: number }) => ReactNode;
}

export function PageView({
  source,
  index,
  onZoneTap,
  zonesDisabled,
  gesturesEnabled = true,
  renderOverlay,
}: PageViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [rendering, setRendering] = useState(true);
  const [failed, setFailed] = useState(false);

  const zoom = useRef(1);
  const tx = useRef(0);
  const ty = useRef(0);
  const baseScale = useRef(1);

  const apply = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const scale = baseScale.current * zoom.current;
    el.style.transform = `translate3d(${tx.current}px, ${ty.current}px, 0) scale(${scale})`;
  }, []);

  const recomputeBase = useCallback(() => {
    const container = containerRef.current;
    if (!container || !pageSize) return;
    const sx = (container.clientWidth - FIT_PADDING * 2) / pageSize.width;
    const sy = (container.clientHeight - FIT_PADDING * 2) / pageSize.height;
    baseScale.current = Math.max(0.05, Math.min(sx, sy));
    apply();
  }, [pageSize, apply]);

  // Render the current page into the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    setRendering(true);
    setFailed(false);
    source
      .renderPage(index, canvas)
      .then((info) => {
        if (cancelled) return;
        zoom.current = 1;
        tx.current = 0;
        ty.current = 0;
        setPageSize({ width: info.width, height: info.height });
        setRendering(false);
        source.prefetch?.(index + 1);
        source.prefetch?.(index - 1);
      })
      .catch(() => {
        if (!cancelled) {
          setRendering(false);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source, index]);

  // Fit the page to the viewport on size changes.
  useEffect(() => {
    recomputeBase();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(recomputeBase);
    observer.observe(container);
    return () => observer.disconnect();
  }, [recomputeBase]);

  useGesture(
    {
      onDrag: ({ offset: [x, y], pinching, cancel }) => {
        if (pinching) {
          cancel();
          return;
        }
        tx.current = x;
        ty.current = y;
        apply();
      },
      onPinch: ({ offset: [scale] }) => {
        zoom.current = clamp(scale, MIN_ZOOM, MAX_ZOOM);
        apply();
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault();
        zoom.current = clamp(zoom.current * (1 - dy * 0.0015), MIN_ZOOM, MAX_ZOOM);
        apply();
      },
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      drag: {
        enabled: gesturesEnabled,
        from: () => [tx.current, ty.current],
        filterTaps: true,
      },
      pinch: {
        enabled: gesturesEnabled,
        from: () => [zoom.current, 0],
        scaleBounds: { min: MIN_ZOOM, max: MAX_ZOOM },
      },
    },
  );

  const showZones = onZoneTap && pageSize && !zonesDisabled;

  return (
    <div
      ref={containerRef}
      className="touch-none-area relative size-full overflow-hidden bg-stone-200 select-none dark:bg-stone-950"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={stageRef}
          className="relative origin-center will-change-transform"
          style={pageSize ?? { width: 1, height: 1 }}
        >
          <canvas
            ref={canvasRef}
            className={pageSize ? 'block size-full shadow-2xl shadow-black/40' : 'hidden'}
            style={pageSize ?? undefined}
          />
          {pageSize && renderOverlay?.(pageSize)}
        </div>
      </div>

      {showZones && (
        <>
          <button
            type="button"
            aria-label="ページ送り（左）"
            onClick={() => onZoneTap('left')}
            className="touch-none-area absolute inset-y-0 left-0 w-[22%]"
          />
          <button
            type="button"
            aria-label="操作バーの表示切り替え"
            onClick={() => onZoneTap('center')}
            className="touch-none-area absolute inset-y-0 left-[22%] w-[56%]"
          />
          <button
            type="button"
            aria-label="ページ送り（右）"
            onClick={() => onZoneTap('right')}
            className="touch-none-area absolute inset-y-0 right-0 w-[22%]"
          />
        </>
      )}

      {rendering && (
        <div className="absolute inset-0 grid place-items-center bg-stone-200/55 dark:bg-stone-950/55">
          <Spinner size={28} className="text-stone-500 dark:text-white/70" />
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center">
          <p className="text-sm text-stone-500">このページを表示できませんでした</p>
        </div>
      )}
    </div>
  );
}
