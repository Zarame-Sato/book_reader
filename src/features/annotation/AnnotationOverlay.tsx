import { type PointerEvent as ReactPointerEvent, useEffect, useRef } from 'react';
import { useAnnotationStore } from './annotationStore';
import type { DrawTool, NormPoint, Stroke } from './annotationTypes';
import {
  HIGHLIGHTER_OPACITY,
  outlineToPath,
  strokeHitTest,
  strokeOutline,
  strokePath,
} from './strokeGeometry';

const EMPTY: Stroke[] = [];
const ERASER_RADIUS = 0.022;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

interface ActiveStroke {
  pointerId: number;
  tool: DrawTool;
  color: string;
  width: number;
  points: NormPoint[];
}

interface AnnotationOverlayProps {
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
}

/** The handwriting layer: committed strokes as SVG, the live stroke on canvas. */
export function AnnotationOverlay({
  pageIndex,
  pageWidth,
  pageHeight,
}: AnnotationOverlayProps) {
  const tool = useAnnotationStore((s) => s.tool);
  const color = useAnnotationStore((s) => s.color);
  const penWidth = useAnnotationStore((s) => s.penWidth);
  const highlighterWidth = useAnnotationStore((s) => s.highlighterWidth);
  const strokes = useAnnotationStore((s) => s.pages[pageIndex]) ?? EMPTY;

  const rootRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const active = useRef<ActiveStroke | null>(null);

  const interactive = tool !== 'hand';

  const clearLive = () => {
    const canvas = liveRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Reset any in-progress stroke when the page changes.
  useEffect(() => {
    active.current = null;
    clearLive();
  }, [pageIndex]);

  const drawLive = () => {
    const canvas = liveRef.current;
    const a = active.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!a || a.points.length === 0) return;
    const outline = strokeOutline(a, pageWidth, pageHeight);
    if (outline.length < 3) return;
    ctx.fillStyle = a.color;
    ctx.globalAlpha = a.tool === 'highlighter' ? HIGHLIGHTER_OPACITY : 1;
    ctx.fill(new Path2D(outlineToPath(outline)));
    ctx.globalAlpha = 1;
  };

  const toNorm = (e: {
    clientX: number;
    clientY: number;
    pressure: number;
  }): NormPoint => {
    const rect = rootRef.current!.getBoundingClientRect();
    return [
      clamp01((e.clientX - rect.left) / rect.width),
      clamp01((e.clientY - rect.top) / rect.height),
      e.pressure > 0 ? e.pressure : 0.5,
    ];
  };

  const eraseAt = (point: NormPoint) => {
    const list = useAnnotationStore.getState().pages[pageIndex] ?? [];
    for (const stroke of list) {
      if (strokeHitTest(stroke, point[0], point[1], ERASER_RADIUS)) {
        useAnnotationStore.getState().eraseStroke(pageIndex, stroke.id);
      }
    }
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!interactive || active.current) return;
    e.stopPropagation();
    const point = toNorm(e);
    rootRef.current?.setPointerCapture(e.pointerId);
    if (tool === 'eraser') {
      active.current = {
        pointerId: e.pointerId,
        tool: 'pen',
        color: '',
        width: 0,
        points: [point],
      };
      eraseAt(point);
      return;
    }
    const drawTool: DrawTool = tool === 'highlighter' ? 'highlighter' : 'pen';
    active.current = {
      pointerId: e.pointerId,
      tool: drawTool,
      color,
      width: drawTool === 'highlighter' ? highlighterWidth : penWidth,
      points: [point],
    };
    drawLive();
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const a = active.current;
    if (!a || e.pointerId !== a.pointerId) return;
    e.stopPropagation();
    const native = e.nativeEvent;
    const coalesced =
      typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const samples = coalesced.length > 0 ? coalesced : [native];
    for (const sample of samples) a.points.push(toNorm(sample));
    if (tool === 'eraser') {
      eraseAt(a.points[a.points.length - 1]!);
    } else {
      drawLive();
    }
  };

  const finishStroke = (e: ReactPointerEvent) => {
    const a = active.current;
    if (!a || e.pointerId !== a.pointerId) return;
    e.stopPropagation();
    rootRef.current?.releasePointerCapture(e.pointerId);
    active.current = null;
    if (tool !== 'eraser' && a.points.length >= 2) {
      useAnnotationStore.getState().addStroke(pageIndex, {
        id: crypto.randomUUID(),
        tool: a.tool,
        color: a.color,
        width: a.width,
        opacity: a.tool === 'highlighter' ? HIGHLIGHTER_OPACITY : 1,
        points: a.points,
      });
    }
    clearLive();
  };

  return (
    <div
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
      className="absolute inset-0"
      style={{
        pointerEvents: interactive ? 'auto' : 'none',
        touchAction: interactive ? 'none' : undefined,
        cursor: interactive ? 'crosshair' : undefined,
      }}
    >
      <svg
        width={pageWidth}
        height={pageHeight}
        viewBox={`0 0 ${pageWidth} ${pageHeight}`}
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
      >
        {strokes.map((stroke) => (
          <path
            key={stroke.id}
            d={strokePath(stroke, pageWidth, pageHeight)}
            fill={stroke.color}
            fillOpacity={stroke.opacity}
            style={
              stroke.tool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined
            }
          />
        ))}
      </svg>
      <canvas
        ref={liveRef}
        width={Math.round(pageWidth)}
        height={Math.round(pageHeight)}
        className="absolute inset-0 size-full"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
