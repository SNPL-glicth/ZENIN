import { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronRight, Trash2, AlertCircle, Loader } from 'lucide-react';
import { analysisService } from '../services/analysisService';

const Consultar = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analysisService.getAll(1, 100);
      setAnalyses(response.data.analyses || []);
    } catch (err) {
      console.error('Error loading analyses:', err);
      setError(err.response?.data?.message || 'Error al cargar los análisis');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar todos los análisis? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeleting(true);
      await analysisService.deleteAll();
      setAnalyses([]);
    } catch (err) {
      console.error('Error deleting analyses:', err);
      alert(err.response?.data?.message || 'Error al eliminar los análisis');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const classificationColor = (cls) => {
    switch (cls) {
      case 'numeric': return 'bg-blue-100 text-blue-800';
      case 'text': return 'bg-purple-100 text-purple-800';
      case 'mixed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'analyzed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando análisis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-red-500 p-6 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={loadAnalyses}
          className="mt-4 px-4 py-2 bg-black text-white font-bold hover:bg-gray-800"
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
          <h1 className="text-4xl font-bold mb-2">Consultar</h1>
          <p className="text-gray-600">Todos tus análisis e investigaciones</p>
        </div>
        {analyses.length > 0 && (
          <button
            onClick={handleDeleteAll}
            disabled={deleting}
            className="px-4 py-2 border-2 border-red-500 text-red-600 font-bold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {deleting ? (
              <>
                <Loader size={16} className="animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Eliminar Todos
              </>
            )}
          </button>
        )}
      </div>

      {analyses.length === 0 ? (
        <div className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
          <FileText size={64} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">No hay análisis</h2>
          <p className="text-gray-600">Sube archivos para generar análisis</p>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((analysis) => (
            <div
              key={analysis.id}
              className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {expandedId === analysis.id ? (
                      <ChevronDown size={20} className="text-black" />
                    ) : (
                      <ChevronRight size={20} className="text-black" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold truncate">{analysis.semanticName || analysis.filename}</p>
                      <span className={`px-2 py-0.5 text-xs font-bold ${classificationColor(analysis.classification)}`}>
                        {analysis.classification}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-bold ${statusColor(analysis.status)}`}>
                        {analysis.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatDate(analysis.createdAt)}</span>
                      {analysis.conclusion && (
                        <>
                          <span>•</span>
                          <span className="truncate">{analysis.conclusion.substring(0, 80)}...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {expandedId === analysis.id && (
                <div className="border-t-2 border-black p-4 bg-gray-50">
                  {analysis.status === 'analyzed' ? (
                    <div className="space-y-4">
                      {analysis.semanticName && (
                        <div>
                          <p className="text-sm font-bold mb-2">Título del Documento:</p>
                          <p className="text-sm text-gray-800 bg-white border border-gray-200 p-3">
                            {analysis.semanticName}
                          </p>
                        </div>
                      )}
                      
                      {analysis.conclusion && (
                        <div>
                          <p className="text-sm font-bold mb-2">Conclusión:</p>
                          <p className="text-sm text-gray-800 whitespace-pre-line bg-white border border-gray-200 p-3">
                            {analysis.conclusion}
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-gray-500 mb-1">Archivo</p>
                          <p className="text-sm">{analysis.filename}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 mb-1">Clasificación</p>
                          <p className="text-sm capitalize">{analysis.classification}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 mb-1">Fecha de Creación</p>
                          <p className="text-sm">{formatDate(analysis.createdAt)}</p>
                        </div>
                        {analysis.analyzedAt && (
                          <div>
                            <p className="text-xs font-bold text-gray-500 mb-1">Analizado</p>
                            <p className="text-sm">{formatDate(analysis.analyzedAt)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : analysis.status === 'error' ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm">Error en el análisis</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Loader size={16} className="animate-spin" />
                      <p className="text-sm">Procesando...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Consultar;
