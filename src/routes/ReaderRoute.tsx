import { Navigate, useParams } from 'react-router-dom';
import { Reader } from '@/features/reader/Reader';

export default function ReaderRoute() {
  const { fileId } = useParams();
  if (!fileId) return <Navigate to="/" replace />;
  return <Reader fileId={fileId} />;
}
