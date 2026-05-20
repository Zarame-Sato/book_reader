import { useAnnotationStore } from './annotationStore';
import { strokePath } from './strokeGeometry';

interface StaticAnnotationLayerProps {
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
}

/** Read-only render of committed strokes — shown on each flip page. */
export function StaticAnnotationLayer({
  pageIndex,
  pageWidth,
  pageHeight,
}: StaticAnnotationLayerProps) {
  const strokes = useAnnotationStore((s) => s.pages[pageIndex]) ?? [];
  if (strokes.length === 0) return null;
  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full"
      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {strokes.map((stroke) => (
        <path
          key={stroke.id}
          d={strokePath(stroke, pageWidth, pageHeight)}
          fill={stroke.color}
          fillOpacity={stroke.opacity}
          style={stroke.tool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined}
        />
      ))}
    </svg>
  );
}
