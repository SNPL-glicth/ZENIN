import { CheckCircle, BarChart3, FileText, Layers } from 'lucide-react';
import { classificationColor } from '../../utils/statusColors';
import { StatusBadge } from '../../components/ui';

const classificationIcon = (cls) => {
  switch (cls) {
    case 'numeric': return <BarChart3 size={20} className="text-blue-600" />;
    case 'text': return <FileText size={20} className="text-purple-600" />;
    case 'mixed': return <Layers size={20} className="text-orange-600" />;
    default: return null;
  }
};

const StatCard = ({ value, label }) => (
  <div className="text-center p-3 bg-gray-50 border">
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

const ColumnStat = ({ name, stats }) => (
  <div className="flex items-center gap-4 text-sm border-b pb-2">
    <span className="font-medium w-32 truncate">{name}</span>
    <span className="text-gray-500">min: {stats.min?.toFixed(2)}</span>
    <span className="text-gray-500">max: {stats.max?.toFixed(2)}</span>
    <span className="text-gray-500">avg: {stats.mean?.toFixed(2)}</span>
    <span className="text-gray-500">std: {stats.stddev?.toFixed(2)}</span>
  </div>
);

export const UploadResult = ({ result, onReset }) => {
  const { filename, classification, status, conclusion, numericSummary } = result;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle size={32} className="text-green-600" />
          <h2 className="text-2xl font-bold">Análisis Completado</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Archivo</p>
            <p className="font-medium">{filename}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Clasificación</p>
            <div className="flex items-center gap-2 mt-1">
              {classificationIcon(classification)}
              <StatusBadge type="classification" value={classification} label={classification?.toUpperCase()} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Estado</p>
            <StatusBadge type="status" value={status} />
          </div>
        </div>
      </div>

      {/* Conclusion */}
      {conclusion && (
        <div className="bg-gray-50 border-2 border-gray-300 p-6">
          <p className="font-bold mb-2">Conclusión</p>
          <p className="text-gray-800 whitespace-pre-line">{conclusion}</p>
        </div>
      )}

      {/* Numeric Summary */}
      {numericSummary && (
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={20} /> Resumen Numérico
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {numericSummary.record_count !== undefined && (
              <StatCard value={numericSummary.record_count} label="Registros" />
            )}
            {numericSummary.numeric_columns !== undefined && (
              <StatCard value={numericSummary.numeric_columns} label="Columnas Numéricas" />
            )}
            {numericSummary.total_columns !== undefined && (
              <StatCard value={numericSummary.total_columns} label="Total Columnas" />
            )}
            {numericSummary.total_chunks !== undefined && (
              <StatCard value={numericSummary.total_chunks} label="Fragmentos" />
            )}
          </div>

          {numericSummary.columns && (
            <div className="space-y-2">
              {Object.entries(numericSummary.columns).slice(0, 6).map(([col, stats]) => (
                <ColumnStat key={col} name={col} stats={stats} />
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onReset}
        className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800"
      >
        Subir Otro Archivo
      </button>
    </div>
  );
};

export default UploadResult;
