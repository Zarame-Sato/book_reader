import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, Loader2 } from 'lucide-react';
import { type BookKind, detectBookKind } from '@/features/book-sources/bookKind';
import { type DriveFile, isFolder } from '@/features/drive/driveTypes';
import { useDriveList } from '@/features/drive/useDriveList';
import { cn } from '@/lib/cn';
import { BookCard, FolderCard } from './BookCard';
import { openBookRecord } from './booksDb';
import { FolderBreadcrumb } from './FolderBreadcrumb';
import { useLibraryStore } from './libraryStore';

type ShelfItem =
  | { type: 'folder'; file: DriveFile }
  | { type: 'book'; file: DriveFile; kind: BookKind };

function columnsFor(width: number): number {
  if (width < 480) return 3;
  if (width < 768) return 4;
  if (width < 1100) return 5;
  return 6;
}

function useShelfColumns(): number {
  const [cols, setCols] = useState(() => columnsFor(window.innerWidth));
  useEffect(() => {
    const onResize = () => setCols(columnsFor(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return cols;
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function ShelfBoard() {
  return (
    <div className="relative mt-1.5">
      <div className="h-2 rounded-t-[2px] bg-gradient-to-b from-wood-100 to-wood-300 dark:from-stone-700 dark:to-stone-800" />
      <div className="h-3.5 rounded-b-md bg-gradient-to-b from-wood-300 to-wood-500 dark:from-stone-800 dark:to-stone-900" />
      <div className="absolute inset-x-4 -bottom-2 h-3 rounded-[50%] bg-wood-600/25 blur-md dark:bg-black/40" />
    </div>
  );
}

export function Bookshelf() {
  const path = useLibraryStore((s) => s.path);
  const enterFolder = useLibraryStore((s) => s.enterFolder);
  const current = path[path.length - 1]!;
  const { data, isLoading, error } = useDriveList(current.id);
  const navigate = useNavigate();
  const cols = useShelfColumns();

  const all = data?.files ?? [];
  const items: ShelfItem[] = [
    ...all.filter(isFolder).map((file): ShelfItem => ({ type: 'folder', file })),
    ...all
      .map((file) => ({ file, kind: detectBookKind(file.name, file.mimeType) }))
      .filter((e): e is { file: DriveFile; kind: BookKind } => e.kind !== null)
      .map(({ file, kind }): ShelfItem => ({ type: 'book', file, kind })),
  ];

  const openBook = async (file: DriveFile, kind: BookKind) => {
    await openBookRecord(file, kind);
    navigate(`/read/${encodeURIComponent(file.id)}`);
  };

  const rows = chunk(items, cols);
  const isEmpty = !isLoading && !error && items.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <FolderBreadcrumb />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-28 text-sm text-stone-500">
          <Loader2 size={18} className="animate-spin" />
          Google Drive を読み込み中…
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          読み込みに失敗しました: {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center gap-2 py-28 text-center">
          <BookMarked size={34} className="text-stone-300 dark:text-stone-600" />
          <p className="text-sm text-stone-500">このフォルダに書籍はありません</p>
        </div>
      )}

      {!isLoading && !error && !isEmpty && (
        <div className="flex flex-col gap-7">
          {rows.map((row, ri) => (
            <div key={ri}>
              <div
                className={cn('grid items-end gap-x-4 px-1 sm:gap-x-6')}
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {row.map((item) =>
                  item.type === 'folder' ? (
                    <FolderCard
                      key={item.file.id}
                      name={item.file.name}
                      onOpen={() => enterFolder({ id: item.file.id, name: item.file.name })}
                    />
                  ) : (
                    <BookCard
                      key={item.file.id}
                      id={item.file.id}
                      name={item.file.name}
                      kind={item.kind}
                      onOpen={() => void openBook(item.file, item.kind)}
                    />
                  ),
                )}
              </div>
              <ShelfBoard />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
