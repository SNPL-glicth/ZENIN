import { useState } from 'react';
import { Brain, Activity } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { predictionService } from '../services/predictionService';
import { Card, LoadingSpinner, ErrorFallback } from '../components/ui';
import { PredictionCard } from '../components/sections';

const Predictions = () => {
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');

  const {
    data: predictions,
    loading,
    error,
    refetch
  } = useAsyncData(() => predictionService.getRecentPredictions(20).then(r => r.data));

  const filteredPredictions = predictions?.filter(p => {
    if (filter === 'high-risk') return p.confidence < 0.6 || p.regime === 'volatile';
    if (filter === 'stable') return p.confidence >= 0.8 && p.regime === 'stable';
    return true;
  });

  if (loading) return <LoadingSpinner size="md" text="Cargando predicciones..." className="h-64" />;
  if (error) return <ErrorFallback error={error} retry={refetch} />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Brain size={32} />
          ML Predictions
        </h1>
        <p className="text-gray-600">Predicciones de series temporales</p>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'high-risk', 'stable'].map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 font-bold text-sm transition-colors ${
              filter === key ? 'bg-black text-white' : 'border-2 border-black hover:bg-gray-100'
            }`}
          >
            {key === 'all' ? 'Todas' : key === 'high-risk' ? 'Alto Riesgo' : 'Estables'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{predictions?.length || 0}</p>
          <p className="text-xs text-gray-600">Total</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {predictions?.filter(p => p.confidence < 0.6 || p.regime === 'volatile').length || 0}
          </p>
          <p className="text-xs text-gray-600">Alto Riesgo</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {predictions?.filter(p => p.confidence >= 0.8).length || 0}
          </p>
          <p className="text-xs text-gray-600">Alta Confianza</p>
        </Card>
      </div>

      {!filteredPredictions?.length ? (
        <Card className="p-8 text-center">
          <Activity size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No hay predicciones {filter !== 'all' && 'con este filtro'}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPredictions.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              expanded={expandedId === prediction.id}
              onToggle={setExpandedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Predictions;
