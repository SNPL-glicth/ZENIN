import { useNavigate } from 'react-router-dom';
import { FileText, FileSpreadsheet, Image, Music, File as FileIcon, AlertCircle, FolderOpen, LucideIcon } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { documentsService } from '../services/documentsService';
import { Card, LoadingSpinner, ErrorFallback, StatusBadge } from '../components/ui';
import { formatFileSize } from '../utils/formatters';

interface Document {
  id: string;
  contentType: string;
  originalFilename: string;
  fileSizeBytes: number;
  status: string;
  uploadedAt: string;
  conclusion?: string;
}

const getIcon = (contentType: string): LucideIcon => {
  switch (contentType) {
    case 'tabular': return FileSpreadsheet;
    case 'text': return FileText;
    case 'image': return Image;
    case 'audio': return Music;
    default: return FileIcon;
  }
};

const Documents = (): React.ReactElement => {
  const navigate = useNavigate();

  const {
    data: documents,
    loading,
    error,
    refetch
  } = useAsyncData<Document[]>(() => documentsService.list(1).then(r => r.data));

  if (loading) return <LoadingSpinner size="md" text="Cargando documentos..." className="h-64" />;
  if (error) return <ErrorFallback error={error} retry={refetch} />;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FolderOpen size={32} />
            Documentos
          </h1>
          <p className="text-gray-600">Archivos analizados por el sistema ML</p>
        </div>
        <button
          onClick={() => navigate('/uploads')}
          className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
        >
          Subir Archivo
        </button>
      </div>

      {!documents?.length ? (
        <Card className="p-8 text-center">
          <FileIcon size={64} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">No hay documentos</h2>
          <p className="text-gray-600 mb-4">Sube tu primer archivo para comenzar</p>
          <button
            onClick={() => navigate('/uploads')}
            className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Subir Archivo
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const Icon = getIcon(doc.contentType);
            return (
              <Card
                key={doc.id}
                className="p-6 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <Icon size={32} className="text-black flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-1 truncate">{doc.originalFilename}</h3>
                    <p className="text-sm text-gray-600">{formatFileSize(doc.fileSizeBytes)}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white px-2 py-1 text-xs font-medium">
                      {doc.contentType}
                    </span>
                    <StatusBadge type="status" value={doc.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.uploadedAt).toLocaleString()}
                  </p>
                </div>

                {doc.status === 'analyzed' && doc.conclusion && (
                  <div className="bg-gray-50 p-3 border-l-4 border-black">
                    <p className="text-sm text-gray-700 line-clamp-3">{doc.conclusion}</p>
                  </div>
                )}

                {doc.status === 'error' && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle size={16} />
                    <p className="text-sm">Error en el análisis</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Documents;
