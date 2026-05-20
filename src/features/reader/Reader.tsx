import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenText, ChevronLeft } from 'lucide-react';
import { AnnotationOverlay } from '@/features/annotation/AnnotationOverlay';
import { AnnotationToolbar } from '@/features/annotation/AnnotationToolbar';
import { useAnnotationStore } from '@/features/annotation/annotationStore';
import type { SidecarMeta } from '@/features/annotation/annotationTypes';
import { useAnnotations } from '@/features/annotation/useAnnotations';
import { getBookRecord, updateBookRecord } from '@/features/library/booksDb';
import { generateCover } from '@/features/library/coverThumbnail';
import { FlipReader } from './FlipReader';
import { PageView, type TapZone } from './PageView';
import { PageNavigator } from './PageNavigator';
import { ReaderToolbar } from './ReaderToolbar';
import { useReaderStore } from './readerStore';
import { type LoadedBook, useBookSource } from './useBookSource';

export function Reader({ fileId }: { fileId: string }) {
  const state = useBookSource(fileId);
  if (state.status === 'loading') return <ReaderLoading progress={state.progress} />;
  if (state.status === 'error') return <ReaderError message={state.error} />;
  return <ReaderView fileId={fileId} book={state.book} />;
}

function ReaderView({ fileId, book }: { fileId: string; book: LoadedBook }) {
  const { source } = book;
  const index = useReaderStore((s) => s.index);
  const pageCount = useReaderStore((s) => s.pageCount);
  const direction = useReaderStore((s) => s.direction);
  const tool = useAnnotationStore((s) => s.tool);
  const [uiVisible, setUiVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [modifiedTime, setModifiedTime] = useState<string | null>(null);

  const meta = useMemo<SidecarMeta>(
    () => ({
      bookFileId: fileId,
      bookFileName: book.name,
      bookModifiedTime: modifiedTime,
      bookKind: book.kind,
      pageCount: source.pageCount,
    }),
    [fileId, book.name, book.kind, source.pageCount, modifiedTime],
  );

  useAnnotations(fileId, meta);

  // Restore reading state from the stored book record.
  useEffect(() => {
    let active = true;
    setReady(false);
    void getBookRecord(fileId).then((record) => {
      if (!active) return;
      setModifiedTime(record?.modifiedTime ?? null);
      useReaderStore.getState().initBook({
        fileId,
        index: record?.lastReadPage ?? 0,
        pageCount: source.pageCount,
        direction: record?.readingDirection ?? 'ltr',
      });
      void updateBookRecord(fileId, { pageCount: source.pageCount });
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [fileId, source]);

  // Persist the last-read page once the book is initialized.
  useEffect(() => {
    if (!ready) return;
    void updateBookRecord(fileId, { lastReadPage: index });
  }, [ready, fileId, index]);

  // Generate a cover thumbnail on first open.
  useEffect(() => {
    let active = true;
    void getBookRecord(fileId).then(async (record) => {
      if (!active || !record || record.cover) return;
      const cover = await generateCover(source);
      if (active && cover) await updateBookRecord(fileId, { cover });
    });
    return () => {
      active = false;
    };
  }, [fileId, source]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { goNext, goPrev } = useReaderStore.getState();
      switch (e.key) {
        case 'ArrowRight':
          (direction === 'rtl' ? goPrev : goNext)();
          break;
        case 'ArrowLeft':
          (direction === 'rtl' ? goNext : goPrev)();
          break;
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowUp':
        case 'PageUp':
          goPrev();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [direction]);

  const toggleDirection = useCallback(() => {
    const next = useReaderStore.getState().direction === 'ltr' ? 'rtl' : 'ltr';
    useReaderStore.getState().setDirection(next);
    void updateBookRecord(fileId, { readingDirection: next });
  }, [fileId]);

  const handleZoneTap = useCallback((zone: TapZone) => {
    if (zone === 'center') {
      setUiVisible((v) => !v);
      return;
    }
    const { goNext, goPrev, direction: dir } = useReaderStore.getState();
    const physicalRight = zone === 'right';
    const advance = dir === 'rtl' ? !physicalRight : physicalRight;
    (advance ? goNext : goPrev)();
  }, []);

  const handleSwipe = useCallback((dir: 'left' | 'right') => {
    const { goNext, goPrev, direction: d } = useReaderStore.getState();
    // LTR: swipe-left = next; RTL: swipe-right = next.
    const swipeLeft = dir === 'left';
    const advance = d === 'rtl' ? !swipeLeft : swipeLeft;
    (advance ? goNext : goPrev)();
  }, []);

  const useFlip = tool === 'hand' && source.pageCount > 1;

  return (
    <div className="fixed inset-0 bg-stone-200 dark:bg-stone-950">
      {useFlip ? (
        <FlipReader
          source={source}
          index={index}
          direction={direction}
          onPageChange={(i) => useReaderStore.getState().setIndex(i)}
        />
      ) : (
        <PageView
          source={source}
          index={index}
          onZoneTap={handleZoneTap}
          onSwipe={handleSwipe}
          zonesDisabled={tool !== 'hand'}
          gesturesEnabled={tool === 'hand'}
          renderOverlay={(page) => (
            <AnnotationOverlay
              pageIndex={index}
              pageWidth={page.width}
              pageHeight={page.height}
            />
          )}
        />
      )}
      <ReaderToolbar
        visible={uiVisible}
        title={book.name}
        direction={direction}
        onToggleDirection={toggleDirection}
      />
      <AnnotationToolbar visible={uiVisible} pageIndex={index} />
      <PageNavigator
        visible={uiVisible}
        index={index}
        pageCount={pageCount}
        direction={direction}
        onPrev={() => useReaderStore.getState().goPrev()}
        onNext={() => useReaderStore.getState().goNext()}
        onSeek={(i) => useReaderStore.getState().setIndex(i)}
      />
    </div>
  );
}

function ReaderLoading({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-stone-100 text-stone-600 dark:bg-stone-950 dark:text-stone-300">
      <div className="flex w-64 flex-col items-center gap-4">
        <BookOpenText size={34} className="text-accent-500" />
        <p className="text-sm">書籍を読み込み中…</p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-stone-300 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-accent-500 transition-all duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ReaderError({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-stone-100 px-6 text-center dark:bg-stone-950">
      <div className="flex flex-col items-center gap-3">
        <p className="max-w-sm text-sm text-stone-600 dark:text-stone-300">{message}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-accent-600 transition hover:text-accent-500 dark:text-accent-400"
        >
          <ChevronLeft size={16} />
          本棚へ戻る
        </Link>
      </div>
    </div>
  );
}
