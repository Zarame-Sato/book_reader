import { create } from 'zustand';

export interface FolderCrumb {
  id: string;
  name: string;
}

const ROOT: FolderCrumb = { id: 'root', name: 'マイドライブ' };

interface LibraryState {
  /** Breadcrumb stack; the last entry is the current folder. */
  path: FolderCrumb[];
  enterFolder: (crumb: FolderCrumb) => void;
  goToCrumb: (index: number) => void;
  reset: () => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  path: [ROOT],
  enterFolder: (crumb) => set((s) => ({ path: [...s.path, crumb] })),
  goToCrumb: (index) => set((s) => ({ path: s.path.slice(0, index + 1) })),
  reset: () => set({ path: [ROOT] }),
}));
