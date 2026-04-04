import { useState } from 'react';
import { FileText, ChevronDown, ChevronRight, Trash2, AlertCircle, Loader, Search } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { analysisService } from '../services/analysisService';
import { Card, LoadingSpinner, ErrorFallback, StatusBadge } from '../components/ui';
import { formatDate } from '../utils/formatters';
import { priorityColor, priorityLabel } from '../utils/statusColors';

const AnalysisItem = ({ analysis, expanded, onToggle }) => (
  <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
    <div
      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => onToggle(expanded ? null : analysis.id)}
    >
      <div className="flex items-center gap-3">
        {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold truncate">{analysis.semanticName || analysis.filename}</p>
            <StatusBadge type="classification" value={analysis.classification} />
            <StatusBadge type="status" value={analysis.status} />
          </div>
          <p className="text-xs text-gray-500 truncate">{analysis.conclusion?.substring(0, 80)}...</p>
        </div>
      </div>
    </div>

    {expanded && (
      <div className="border-t-2 border-black p-4 bg-gray-50">
        {analysis.status === 'analyzed' ? (
          <div className="space-y-4">
            {analysis.semanticName && (
              <div>
                <p className="text-sm font-bold mb-2">Título:</p>
                <p className="text-sm text-gray-800 bg-white border p-3">{analysis.semanticName}</p>
              </div>
            )}
            {analysis.conclusion && (
              <div>
                <p className="text-sm font-bold mb-2">Conclusión:</p>
                <p className="text-sm text-gray-800 whitespace-pre-line bg-white border p-3">{analysis.conclusion}</p>
              </div>
            )}
            {analysis.DecisionRecommendation && (
              <Card className="bg-yellow-50 border-yellow-400">
                <p className="text-sm font-bold mb-3">🎯 Decisión Recomendada</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-700">Acción:</span>
                  <span className={`font-bold uppercase ${analysis.DecisionRecommendation.action === 'REJECT' ? 'text-red-600' : 'text-green-600'}`}>
                    {analysis.DecisionRecommendation.action}
                  </span>
                  <span className="text-gray-700">Prioridad:</span>
                  <span className={`font-bold ${priorityColor(analysis.DecisionRecommendation.priority)} px-2 py-0.5 rounded`}>
                    {priorityLabel(analysis.DecisionRecommendation.priority)}
                  </span>
                  <span className="text-gray-700">Confianza:</span>
                  <span>{Math.round((analysis.DecisionRecommendation.confidence || 0) * 100)}%</span>
                </div>
              </Card>
            )}
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
);

const Consultar = () => {
  const [expandedId, setExpandedId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const {
    data: analyses,
    loading,
    error,
    refetch
  } = useAsyncData(() => analysisService.getAll(1, 100).then(r => r.data.analyses || []));

  const handleDeleteAll = async () => {
    if (!window.confirm('¿Eliminar todos los análisis? No se puede deshacer.')) return;
    try {
      setDeleting(true);
      await analysisService.deleteAll();
      refetch();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner size="md" text="Cargando análisis..." className="h-64" />;
  if (error) return <ErrorFallback error={error} retry={refetch} />;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Search size={32} />
            Consultar
          </h1>
          <p className="text-gray-600">Todos tus análisis e investigaciones</p>
        </div>
        {analyses?.length > 0 && (
          <button
            onClick={handleDeleteAll}
            disabled={deleting}
            className="px-4 py-2 border-2 border-red-500 text-red-600 font-bold hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
          >
            {deleting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Eliminar Todos
          </button>
        )}
      </div>

      {!analyses?.length ? (
        <Card className="p-8 text-center">
          <FileText size={64} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">No hay análisis</h2>
          <p className="text-gray-600">Sube archivos para generar análisis</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {analyses.map((analysis) => (
            <AnalysisItem
              key={analysis.id}
              analysis={analysis}
              expanded={expandedId === analysis.id}
              onToggle={setExpandedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Consultar;
