import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/authStore';
import { listFolder } from './driveClient';
import type { DriveFileList } from './driveTypes';

/** Lists a Drive folder's children. `'root'` lists the Drive root. */
export function useDriveList(folderId: string) {
  const isSignedIn = useAuthStore((s) => s.accessToken !== null);
  return useQuery<DriveFileList>({
    queryKey: ['drive', 'list', folderId],
    queryFn: () => listFolder(folderId),
    enabled: isSignedIn,
  });
}
