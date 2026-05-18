import { Eraser, Hand, Highlighter, PenLine, Trash2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ANNOTATION_COLORS, useAnnotationStore } from './annotationStore';
import type { ToolKind } from './annotationTypes';

const TOOLS: { id: ToolKind; icon: typeof Hand; label: string }[] = [
  { id: 'hand', icon: Hand, label: '手のひら' },
  { id: 'pen', icon: PenLine, label: 'ペン' },
  { id: 'highlighter', icon: Highlighter, label: 'マーカー' },
  { id: 'eraser', icon: Eraser, label: '消しゴム' },
];

interface AnnotationToolbarProps {
  visible: boolean;
  pageIndex: number;
}

export function AnnotationToolbar({ visible, pageIndex }: AnnotationToolbarProps) {
  const tool = useAnnotationStore((s) => s.tool);
  const color = useAnnotationStore((s) => s.color);
  const penWidth = useAnnotationStore((s) => s.penWidth);
  const highlighterWidth = useAnnotationStore((s) => s.highlighterWidth);
  const setTool = useAnnotationStore((s) => s.setTool);
  const setColor = useAnnotationStore((s) => s.setColor);
  const setWidth = useAnnotationStore((s) => s.setWidth);
  const undo = useAnnotationStore((s) => s.undo);
  const clearPage = useAnnotationStore((s) => s.clearPage);

  const showInk = tool === 'pen' || tool === 'highlighter';
  const width = tool === 'highlighter' ? highlighterWidth : penWidth;
  const widthRange =
    tool === 'highlighter' ? { min: 0.01, max: 0.05 } : { min: 0.002, max: 0.018 };

  return (
    <div
      className={cn(
        'absolute left-1/2 top-16 z-20 flex -translate-x-1/2 flex-col items-center gap-2',
        'transition-all duration-300',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-3 opacity-0',
      )}
    >
      <div className="flex items-center gap-1 rounded-2xl bg-stone-50/95 p-1.5 shadow-lg shadow-black/20 ring-1 ring-black/5 backdrop-blur">
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTool(id)}
            aria-label={label}
            className={cn(
              'grid size-9 place-items-center rounded-xl transition',
              tool === id
                ? 'bg-accent-600 text-white'
                : 'text-stone-500 hover:bg-stone-200/70',
            )}
          >
            <Icon size={18} />
          </button>
        ))}
        <span className="mx-0.5 h-6 w-px bg-stone-300" />
        <button
          type="button"
          onClick={() => undo(pageIndex)}
          aria-label="元に戻す"
          className="grid size-9 place-items-center rounded-xl text-stone-500 transition hover:bg-stone-200/70"
        >
          <Undo2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => clearPage(pageIndex)}
          aria-label="このページの注釈を消去"
          className="grid size-9 place-items-center rounded-xl text-stone-500 transition hover:bg-rose-100 hover:text-rose-600"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {showInk && (
        <div className="flex items-center gap-3 rounded-2xl bg-stone-50/95 px-3 py-2 shadow-lg shadow-black/20 ring-1 ring-black/5 backdrop-blur">
          <div className="flex items-center gap-1.5">
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`インクの色 ${c}`}
                className={cn(
                  'size-6 rounded-full ring-1 ring-black/10 transition',
                  color === c && 'ring-2 ring-accent-500 ring-offset-2 ring-offset-stone-50',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <span className="h-6 w-px bg-stone-300" />
          <input
            type="range"
            min={widthRange.min}
            max={widthRange.max}
            step={0.001}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-24 cursor-pointer accent-accent-500"
            aria-label="線の太さ"
          />
        </div>
      )}
    </div>
  );
}
