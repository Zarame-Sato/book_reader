import { useEffect, useState } from 'react';
import { FileImage, FileText, FolderClosed, Layers } from 'lucide-react';
import { type BookKind, BOOK_KIND_LABEL } from '@/features/book-sources/bookKind';
import { cn } from '@/lib/cn';
import { getBookRecord } from './booksDb';

const KIND_ICON: Record<BookKind, typeof FileText> = {
  pdf: FileText,
  cbz: Layers,
  image: FileImage,
};

const KIND_GRADIENT: Record<BookKind, string> = {
  pdf: 'from-rose-500/80 to-orange-500/80',
  cbz: 'from-accent-500/80 to-sky-500/80',
  image: 'from-emerald-500/80 to-teal-500/80',
};

interface BookCardProps {
  id: string;
  name: string;
  kind: BookKind;
  onOpen: () => void;
}

export function BookCard({ id, name, kind, onOpen }: BookCardProps) {
  const [cover, setCover] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const Icon = KIND_ICON[kind];

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    void getBookRecord(id).then((rec) => {
      if (cancelled || !rec) return;
      if (rec.cover) {
        url = URL.createObjectURL(rec.cover);
        setCover(url);
      }
      if (rec.pageCount && rec.pageCount > 1) {
        setProgress(Math.min(1, rec.lastReadPage / (rec.pageCount - 1)));
      }
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-2 text-left"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl shadow-sm ring-1 ring-stone-200/70 transition group-hover:-translate-y-1 group-hover:shadow-lg dark:ring-stone-800">
        {cover ? (
          <img src={cover} alt="" className="size-full object-cover" />
        ) : (
          <div
            className={cn(
              'grid size-full place-items-center bg-gradient-to-br text-white',
              KIND_GRADIENT[kind],
            )}
          >
            <Icon size={40} strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
          {BOOK_KIND_LABEL[kind]}
        </span>
        {progress > 0 && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
            <span
              className="block h-full bg-accent-400"
              style={{ width: `${progress * 100}%` }}
            />
          </span>
        )}
      </div>
      <span className="line-clamp-2 text-xs font-medium text-stone-700 dark:text-stone-300">
        {name}
      </span>
    </button>
  );
}

interface FolderCardProps {
  name: string;
  onOpen: () => void;
}

export function FolderCard({ name, onOpen }: FolderCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-2 text-left"
    >
      <div className="grid aspect-[3/4] place-items-center rounded-xl border border-stone-200 bg-stone-100 transition group-hover:-translate-y-1 group-hover:border-accent-300 group-hover:bg-accent-50 dark:border-stone-800 dark:bg-stone-800/60 dark:group-hover:bg-stone-800">
        <FolderClosed
          size={44}
          strokeWidth={1.5}
          className="text-stone-400 group-hover:text-accent-500"
        />
      </div>
      <span className="line-clamp-2 text-xs font-medium text-stone-700 dark:text-stone-300">
        {name}
      </span>
    </button>
  );
}
