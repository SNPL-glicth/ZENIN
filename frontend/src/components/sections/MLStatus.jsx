import { Activity, Zap, Server } from 'lucide-react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { predictionService } from '../../services/predictionService';
import { Card, LoadingSpinner, StatusBadge } from '../ui';

export const MLStatus = () => {
  const { data: health, loading } = useAsyncData(() =>
    predictionService.getMLHealth().then(r => r.data).catch(() => null)
  );

  if (loading) return <LoadingSpinner size="sm" />;
  if (!health) return null;

  return (
    <Card title="ML System Status" icon={Server}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <StatusBadge
            type="health"
            value={health.status}
            label={health.status?.toUpperCase()}
          />
          <p className="text-xs text-gray-600 mt-1">Estado</p>
        </div>
        <div className="text-center">
          <StatusBadge
            type="circuitBreaker"
            value={health.circuitBreaker}
            label={health.circuitBreaker?.toUpperCase()}
          />
          <p className="text-xs text-gray-600 mt-1">Circuit Breaker</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{health.predictionsTotal || 0}</p>
          <p className="text-xs text-gray-600">Predicciones</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{health.activeWindows || 0}</p>
          <p className="text-xs text-gray-600">Ventanas Activas</p>
        </div>
      </div>
      {health.amnesicMode && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800 flex items-center gap-2">
            <Zap size={16} />
            Modo Amnésico activo - plasticity updates en progreso
          </p>
        </div>
      )}
    </Card>
  );
};

export default MLStatus;
