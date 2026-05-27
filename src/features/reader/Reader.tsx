import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookOpenText, ChevronLeft, RotateCw } from 'lucide-react';
import { Button } from '@/components/Button';
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
  // The reader starts immersive — UI appears when the user taps the centre.
  const [uiVisible, setUiVisible] = useState(false);
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
          onCenterTap={() => setUiVisible((v) => !v)}
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
      {/* The annotation palette stays visible while drawing so the user can
          switch back to the hand tool — otherwise they'd be stuck without UI. */}
      <AnnotationToolbar visible={uiVisible || tool !== 'hand'} pageIndex={index} />
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
      <div className="flex max-w-md flex-col items-center gap-4">
        <span className="grid size-14 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
          <AlertCircle size={28} />
        </span>
        <h2 className="text-base font-semibold text-stone-800 dark:text-stone-100">
          書籍を読み込めませんでした
        </h2>
        <p className="break-all rounded-lg bg-stone-200/70 px-3 py-2 text-xs leading-relaxed text-stone-700 dark:bg-stone-800 dark:text-stone-300">
          {message || 'unknown error'}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            <RotateCw size={14} />
            再試行
          </Button>
          <Link
            to="/"
            className="inline-flex h-8 items-center gap-1 rounded-xl px-3 text-sm text-stone-500 transition hover:bg-stone-200 dark:hover:bg-stone-800"
          >
            <ChevronLeft size={14} />
            本棚へ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
