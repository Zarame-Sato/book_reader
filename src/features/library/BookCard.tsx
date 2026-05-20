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
  pdf: 'from-amber-200 via-orange-300 to-rose-400',
  cbz: 'from-sky-300 via-indigo-400 to-violet-500',
  image: 'from-emerald-300 via-teal-400 to-cyan-500',
};

/** A book standing on the shelf — cover, spine, title and progress. */
export function BookCard({
  id,
  name,
  kind,
  thumbnailLink,
  onOpen,
}: {
  id: string;
  name: string;
  kind: BookKind;
  thumbnailLink?: string;
  onOpen: () => void;
}) {
  const [cover, setCover] = useState<string | null>(thumbnailLink ?? null);
  const [imgFailed, setImgFailed] = useState(false);
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
        setImgFailed(false);
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

  const showCover = cover !== null && !imgFailed;

  return (
    <button type="button" onClick={onOpen} className="group block w-full">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-l-[2px] rounded-r-lg shadow-[0_12px_18px_-9px_rgba(74,52,24,0.55)] ring-1 ring-black/10 transition duration-200 ease-out group-hover:-translate-y-2 group-hover:shadow-[0_22px_28px_-12px_rgba(74,52,24,0.6)]">
        {showCover ? (
          <img
            src={cover}
            alt=""
            className="size-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className={cn(
              'grid size-full place-items-center bg-gradient-to-br',
              KIND_GRADIENT[kind],
            )}
          >
            <Icon size={36} strokeWidth={1.5} className="text-white/90" />
          </div>
        )}

        {/* spine shading on the bound edge */}
        <span className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/30 to-transparent" />
        {/* page-edge highlight on the open edge */}
        <span className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-white/40 to-transparent" />

        <span className="absolute left-2 top-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {BOOK_KIND_LABEL[kind]}
        </span>

        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-2.5 pb-2 pt-6">
          <span className="line-clamp-2 text-[11px] font-medium leading-snug text-white">
            {name}
          </span>
        </span>

        {progress > 0 && (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-black/30">
            <span
              className="block h-full bg-accent-400"
              style={{ width: `${progress * 100}%` }}
            />
          </span>
        )}
      </div>
    </button>
  );
}

/** A folder sitting on the shelf. */
export function FolderCard({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group block w-full">
      <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2.5 rounded-lg bg-gradient-to-br from-wood-100 to-wood-200 px-2 text-center shadow-[0_12px_18px_-9px_rgba(74,52,24,0.5)] ring-1 ring-wood-300/70 transition duration-200 ease-out group-hover:-translate-y-2 group-hover:shadow-[0_22px_28px_-12px_rgba(74,52,24,0.55)] dark:from-stone-700 dark:to-stone-800 dark:ring-stone-600">
        <FolderClosed
          size={38}
          strokeWidth={1.5}
          className="text-wood-600 dark:text-stone-300"
        />
        <span className="line-clamp-2 text-[11px] font-medium leading-snug text-wood-600 dark:text-stone-300">
          {name}
        </span>
      </div>
    </button>
  );
}
