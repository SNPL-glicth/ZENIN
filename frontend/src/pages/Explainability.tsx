import { useState } from 'react';
import { Brain, Activity, ChevronDown, ChevronRight, Clock, LucideIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAsyncData } from '../hooks/useAsyncData';
import { predictionService } from '../services/predictionService';
import { Card, LoadingSpinner, ErrorFallback } from '../components/ui';
import { formatDate } from '../utils/formatters';

type PhaseKind = 'PERCEIVE' | 'FILTER' | 'PREDICT' | 'INHIBIT' | 'ADAPT' | 'FUSE' | 'EXPLAIN';

interface PhaseBadgeProps {
  phase: PhaseKind;
}

const PhaseBadge = ({ phase }: PhaseBadgeProps): React.ReactElement => {
  const colors: Record<PhaseKind, string> = {
    PERCEIVE: 'bg-blue-100 text-blue-800',
    FILTER: 'bg-purple-100 text-purple-800',
    PREDICT: 'bg-green-100 text-green-800',
    INHIBIT: 'bg-red-100 text-red-800',
    ADAPT: 'bg-yellow-100 text-yellow-800',
    FUSE: 'bg-orange-100 text-orange-800',
    EXPLAIN: 'bg-gray-100 text-gray-800'
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded ${colors[phase] || colors.EXPLAIN}`}>
      {phase}
    </span>
  );
};

interface Phase {
  kind: PhaseKind;
  durationMs: number;
  summary: string;
}

interface Contribution {
  engineName: string;
  finalWeight?: number;
  inhibited?: boolean;
}

interface Trace {
  id: string;
  seriesId: string;
  engineName?: string;
  createdAt: string;
  totalDurationMs: number;
  phases?: Phase[];
  contributions?: Contribution[];
  driftScore?: number;
  shadowPerformance?: number;
}

interface ExplainabilityCardProps {
  trace: Trace;
  expanded: boolean;
  onToggle: (id: string | null) => void;
}

const ExplainabilityCard = ({ trace, expanded, onToggle }: ExplainabilityCardProps): React.ReactElement => (
  <Card className="overflow-hidden">
    <div
      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => onToggle(expanded ? null : trace.id)}
    >
      <div className="flex items-center gap-3">
        {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold">{trace.seriesId}</p>
            <span className="text-xs text-gray-500">{trace.engineName}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{formatDate(trace.createdAt)}</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {trace.totalDurationMs}ms
            </span>
          </div>
        </div>
      </div>
    </div>

    {expanded && (
      <div className="border-t-2 border-black p-4 bg-gray-50">
        <div className="mb-4">
          <p className="text-sm font-bold mb-2">Fases Ejecutadas</p>
          <div className="flex flex-wrap gap-1">
            {trace.phases?.map((phase) => (
              <PhaseBadge key={phase.kind} phase={phase.kind} />
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {trace.phases?.map((phase) => (
            <div key={phase.kind} className="bg-white border p-3 rounded">
              <div className="flex items-center justify-between mb-1">
                <PhaseBadge phase={phase.kind} />
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  {phase.durationMs}ms
                </span>
              </div>
              <p className="text-sm text-gray-700">{phase.summary}</p>
            </div>
          ))}
        </div>

        {trace.contributions && (
          <div className="mb-4">
            <p className="text-sm font-bold mb-2">Contribuciones de Engines</p>
            <div className="space-y-1">
              {trace.contributions.map((c) => (
                <div key={c.engineName} className="flex items-center justify-between text-sm">
                  <span>{c.engineName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">peso: {c.finalWeight?.toFixed(2)}</span>
                    <span className={c.inhibited ? 'text-red-500' : 'text-green-500'}>
                      {c.inhibited ? 'inhibido' : 'activo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {trace.driftScore !== undefined && (
          <div className="flex items-center gap-4 text-sm">
            <span>Drift Score: <strong>{trace.driftScore.toFixed(3)}</strong></span>
            <span>Shadow Performance: <strong>{trace.shadowPerformance?.toFixed(3) || 'N/A'}</strong></span>
          </div>
        )}
      </div>
    )}
  </Card>
);

const Explainability = (): React.ReactElement => {
  const [searchParams] = useSearchParams();
  const predictionId = searchParams.get('prediction');
  const [expandedId, setExpandedId] = useState<string | null>(predictionId);

  const {
    data: traces,
    loading,
    error,
    refetch
  } = useAsyncData<Trace[]>(() =>
    predictionId
      ? predictionService.getExplainability(predictionId).then(r => [r.data as Trace])
      : predictionService.getRecentPredictions(10).then(r =>
          r.data.map((p: { id: string; seriesId: string; selectedEngine?: string; predictedAt: string }) => ({ 
            id: p.id, 
            seriesId: p.seriesId, 
            engineName: p.selectedEngine, 
            createdAt: p.predictedAt, 
            phases: [], 
            totalDurationMs: 0 
          }))
        )
  );

  if (loading) return <LoadingSpinner size="md" text="Cargando trazas..." className="h-64" />;
  if (error) return <ErrorFallback error={error} retry={refetch} />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Brain size={32} />
          Explainability
        </h1>
        <p className="text-gray-600">Trazas de razonamiento y explicaciones de predicciones</p>
      </div>

      {predictionId && (
        <Card className="mb-4 p-3 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            Mostrando explainability para predicción: <strong>{predictionId}</strong>
          </p>
        </Card>
      )}

      {!traces?.length ? (
        <Card className="p-8 text-center">
          <Activity size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No hay trazas disponibles</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {traces.map((trace) => (
            <ExplainabilityCard
              key={trace.id}
              trace={trace}
              expanded={expandedId === trace.id}
              onToggle={setExpandedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Explainability;
