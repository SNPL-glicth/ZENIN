import { useState } from 'react';
import { AlertTriangle, Activity } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { predictionService } from '../services/predictionService';
import { Card, LoadingSpinner, ErrorFallback } from '../components/ui';
import { AnomalyCard } from '../components/sections';

const Anomalies = () => {
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');

  const {
    data: anomalies,
    loading,
    error,
    refetch
  } = useAsyncData(() => predictionService.getAnomalies().then(r => r.data.anomalies));

  const filteredAnomalies = anomalies?.filter(a => {
    if (filter === 'critical') return a.severity === 'CRITICAL';
    if (filter === 'warning') return a.severity === 'WARNING';
    return true;
  });

  if (loading) return <LoadingSpinner size="md" text="Cargando anomalías..." className="h-64" />;
  if (error) return <ErrorFallback error={error} retry={refetch} />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <AlertTriangle size={32} />
          Anomalías Detectadas
        </h1>
        <p className="text-gray-600">Eventos inusuales detectados por ML</p>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'critical', 'warning'].map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 font-bold text-sm transition-colors ${
              filter === key ? 'bg-black text-white' : 'border-2 border-black hover:bg-gray-100'
            }`}
          >
            {key === 'all' ? 'Todas' : key === 'critical' ? 'Críticas' : 'Advertencias'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{anomalies?.length || 0}</p>
          <p className="text-xs text-gray-600">Total</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {anomalies?.filter(a => a.severity === 'CRITICAL').length || 0}
          </p>
          <p className="text-xs text-gray-600">Críticas</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {anomalies?.filter(a => a.severity === 'WARNING').length || 0}
          </p>
          <p className="text-xs text-gray-600">Advertencias</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {new Set(anomalies?.map(a => a.seriesId)).size || 0}
          </p>
          <p className="text-xs text-gray-600">Series Afectadas</p>
        </Card>
      </div>

      {!filteredAnomalies?.length ? (
        <Card className="p-8 text-center">
          <Activity size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No hay anomalías {filter !== 'all' && 'con este filtro'}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAnomalies.map((anomaly) => (
            <AnomalyCard
              key={anomaly.id}
              anomaly={anomaly}
              expanded={expandedId === anomaly.id}
              onToggle={setExpandedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Anomalies;
