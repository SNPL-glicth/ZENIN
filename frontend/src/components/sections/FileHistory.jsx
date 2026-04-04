import { File, CheckCircle } from 'lucide-react';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { statusColor } from '../../utils/statusColors';
import { StatusBadge } from '../../components/ui';

export const FileListItem = ({ file }) => (
  <div className="flex items-center gap-4 p-3 border-2 border-gray-200 hover:border-black transition-colors">
    <File size={20} className="text-black flex-shrink-0" />

    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm truncate">{file.originalFilename}</p>
      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
        <span>{formatFileSize(file.fileSizeBytes)}</span>
        <span>•</span>
        <span>{file.contentType}</span>
        <span>•</span>
        <span>{formatDate(file.uploadedAt)}</span>
      </div>
    </div>

    <div className="flex-shrink-0">
      <StatusBadge type="status" value={file.status} />
    </div>
  </div>
);

export const FileHistory = ({ files, error, onRetry }) => (
  <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
    <h2 className="text-lg font-bold mb-4">Historial de Archivos</h2>

    {error ? (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-black text-white font-bold hover:bg-gray-800"
        >
          Reintentar
        </button>
      </div>
    ) : files.length === 0 ? (
      <p className="text-gray-500 text-center py-8 text-sm">Sin archivos subidos</p>
    ) : (
      <div className="space-y-2">
        {files.map((file) => (
          <FileListItem key={file.id} file={file} />
        ))}
      </div>
    )}
  </div>
);

export default FileHistory;
