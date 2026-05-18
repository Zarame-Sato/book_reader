import { useNavigate } from 'react-router-dom';
import { BookMarked, Loader2 } from 'lucide-react';
import { type BookKind, detectBookKind } from '@/features/book-sources/bookKind';
import { type DriveFile, isFolder } from '@/features/drive/driveTypes';
import { useDriveList } from '@/features/drive/useDriveList';
import { BookCard, FolderCard } from './BookCard';
import { openBookRecord } from './booksDb';
import { FolderBreadcrumb } from './FolderBreadcrumb';
import { useLibraryStore } from './libraryStore';

interface BookEntry {
  file: DriveFile;
  kind: BookKind;
}

export function Bookshelf() {
  const path = useLibraryStore((s) => s.path);
  const enterFolder = useLibraryStore((s) => s.enterFolder);
  const current = path[path.length - 1]!;
  const { data, isLoading, error } = useDriveList(current.id);
  const navigate = useNavigate();

  const all = data?.files ?? [];
  const folders = all.filter(isFolder);
  const books: BookEntry[] = all
    .map((file) => ({ file, kind: detectBookKind(file.name, file.mimeType) }))
    .filter((entry): entry is BookEntry => entry.kind !== null);

  const openBook = async (file: DriveFile, kind: BookKind) => {
    await openBookRecord(file, kind);
    navigate(`/read/${encodeURIComponent(file.id)}`);
  };

  const isEmpty = !isLoading && !error && folders.length === 0 && books.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <FolderBreadcrumb />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
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
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <BookMarked size={32} className="text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500">このフォルダに書籍はありません</p>
        </div>
      )}

      {!isLoading && !error && !isEmpty && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              name={folder.name}
              onOpen={() => enterFolder({ id: folder.id, name: folder.name })}
            />
          ))}
          {books.map(({ file, kind }) => (
            <BookCard
              key={file.id}
              id={file.id}
              name={file.name}
              kind={kind}
              onOpen={() => void openBook(file, kind)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
