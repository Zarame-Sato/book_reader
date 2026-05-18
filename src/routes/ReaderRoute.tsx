import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function ReaderRoute() {
  const { fileId } = useParams();

  return (
    <div className="grid min-h-full place-items-center bg-slate-950 text-slate-100">
      <div className="text-center">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-100"
        >
          <ChevronLeft size={16} />
          本棚へ戻る
        </Link>
        <p className="text-sm text-slate-500">リーダーは準備中です（fileId: {fileId}）</p>
      </div>
    </div>
  );
}
