import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { documentsService } from '../services/documentsService';
import { FileText, FileSpreadsheet, Image, Music, File as FileIcon, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Documents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentsService.list(1);
      setDocuments(response.data);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err.response?.data?.message || 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (contentType) => {
    switch (contentType) {
      case 'tabular':
        return FileSpreadsheet;
      case 'text':
        return FileText;
      case 'image':
        return Image;
      case 'audio':
        return Music;
      default:
        return FileIcon;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'analyzed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando documentos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-red-500 p-6 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
        <h2 className="text-2xl font-bold mb-2 text-red-600">Error</h2>
        <p className="text-gray-700 mb-4">{error}</p>
        <button
          onClick={loadDocuments}
          className="px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Documentos</h1>
          <p className="text-gray-600">Archivos analizados por el sistema ML</p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
        >
          Subir Archivo
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
          <FileIcon size={64} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">No hay documentos</h2>
          <p className="text-gray-600 mb-4">Sube tu primer archivo para comenzar</p>
          <button
            onClick={() => navigate('/upload')}
            className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Subir Archivo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const Icon = getIcon(doc.contentType);
            return (
              <div
                key={doc.id}
                className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
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
                    <span className={`px-2 py-1 text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Documents;
