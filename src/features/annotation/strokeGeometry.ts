import { getStroke } from 'perfect-freehand';
import type { DrawTool, NormPoint, Stroke } from './annotationTypes';

interface StrokeStyle {
  thinning: number;
  smoothing: number;
  streamline: number;
}

const PEN_STYLE: StrokeStyle = { thinning: 0.55, smoothing: 0.62, streamline: 0.5 };
const HIGHLIGHTER_STYLE: StrokeStyle = { thinning: 0, smoothing: 0.5, streamline: 0.55 };

export function strokeStyleFor(tool: DrawTool): StrokeStyle {
  return tool === 'highlighter' ? HIGHLIGHTER_STYLE : PEN_STYLE;
}

/** Default stroke widths, as a fraction of page width. */
export const DEFAULT_PEN_WIDTH = 0.006;
export const DEFAULT_HIGHLIGHTER_WIDTH = 0.024;
export const HIGHLIGHTER_OPACITY = 0.35;

function avg(a: number, b: number): number {
  return (a + b) / 2;
}

/** Builds an SVG path `d` string from a perfect-freehand outline polygon. */
export function outlineToPath(points: number[][]): string {
  const len = points.length;
  if (len < 4) return '';
  let a = points[0]!;
  let b = points[1]!;
  const c = points[2]!;
  let d =
    `M${a[0]!.toFixed(2)},${a[1]!.toFixed(2)} ` +
    `Q${b[0]!.toFixed(2)},${b[1]!.toFixed(2)} ` +
    `${avg(b[0]!, c[0]!).toFixed(2)},${avg(b[1]!, c[1]!).toFixed(2)} T`;
  for (let i = 2; i < len - 1; i++) {
    a = points[i]!;
    b = points[i + 1]!;
    d += `${avg(a[0]!, b[0]!).toFixed(2)},${avg(a[1]!, b[1]!).toFixed(2)} `;
  }
  return `${d}Z`;
}

/** Computes a stroke's filled outline in page-pixel coordinates. */
export function strokeOutline(
  stroke: { tool: DrawTool; width: number; points: NormPoint[] },
  pageWidth: number,
  pageHeight: number,
): number[][] {
  const input = stroke.points.map(
    ([x, y, p]) => [x * pageWidth, y * pageHeight, p] as number[],
  );
  const style = strokeStyleFor(stroke.tool);
  return getStroke(input, {
    size: Math.max(1, stroke.width * pageWidth),
    thinning: style.thinning,
    smoothing: style.smoothing,
    streamline: style.streamline,
    simulatePressure: false,
  });
}

export function strokePath(stroke: Stroke, pageWidth: number, pageHeight: number): string {
  return outlineToPath(strokeOutline(stroke, pageWidth, pageHeight));
}

/** True if any of the stroke's points lies within `radius` of (nx, ny). */
export function strokeHitTest(
  stroke: Stroke,
  nx: number,
  ny: number,
  radius: number,
): boolean {
  const r2 = radius * radius;
  return stroke.points.some(([x, y]) => {
    const dx = x - nx;
    const dy = y - ny;
    return dx * dx + dy * dy <= r2;
  });
}
