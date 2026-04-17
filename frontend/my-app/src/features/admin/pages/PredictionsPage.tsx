import { usePredictions } from '../hooks/usePredictions';
import type { Prediction } from '../services/predictionService';

/**
 * SeverityBadge - Visual indicator for prediction severity.
 */
function SeverityBadge({ riskLevel, isAnomaly }: { riskLevel: string; isAnomaly: boolean }): React.ReactElement {
  const getSeverityConfig = () => {
    const level = riskLevel.toUpperCase();
    
    if (level === 'ALERT' || isAnomaly) {
      return {
        bg: 'bg-red-950/50',
        border: 'border-red-800',
        text: 'text-red-400',
        label: 'ALERT',
      };
    }
    
    if (level === 'WARNING') {
      return {
        bg: 'bg-amber-950/50',
        border: 'border-amber-800',
        text: 'text-amber-400',
        label: 'WARNING',
      };
    }
    
    return {
      bg: 'bg-emerald-950/50',
      border: 'border-emerald-800',
      text: 'text-emerald-400',
      label: level === 'NONE' ? 'NORMAL' : level,
    };
  };

  const config = getSeverityConfig();

  return (
    <span className={`inline-flex items-center rounded border ${config.border} ${config.bg} px-2 py-0.5`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.text.replace('text-', 'bg-')} mr-1.5`} />
      <span className={`font-mono text-xs ${config.text}`}>{config.label}</span>
    </span>
  );
}

/**
 * ConfidenceBar - Visual bar for confidence percentage.
 */
function ConfidenceBar({ confidence }: { confidence: number }): React.ReactElement {
  const percentage = Math.min(100, Math.max(0, confidence * 100));
  
  let colorClass = 'bg-emerald-500';
  if (percentage < 60) colorClass = 'bg-amber-500';
  if (percentage < 40) colorClass = 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-gray-800">
        <div 
          className={`h-full rounded-full ${colorClass} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="font-mono text-xs text-gray-400 w-10 text-right">
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
}

/**
 * PredictionCard - Individual prediction display.
 */
function PredictionCard({ prediction }: { prediction: Prediction }): React.ReactElement {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-5 transition-colors hover:border-gray-700">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header: Severity + Engine */}
          <div className="flex items-center gap-2 mb-3">
            <SeverityBadge riskLevel={prediction.riskLevel} isAnomaly={prediction.isAnomaly} />
            <span className="font-mono text-xs text-gray-500">
              {prediction.engineName || 'System'}
            </span>
          </div>
          
          {/* Series ID */}
          <p className="font-mono text-sm text-gray-400 mb-3">
            Series: <span className="text-white">{prediction.seriesId.split('-')[0]}...</span>
          </p>
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-mono text-xs text-gray-500 block mb-1">Predicted Value</span>
              <p className="font-mono text-lg text-purple-300">
                {prediction.predictedValue.toFixed(2)}
              </p>
            </div>
            
            {prediction.trend && (
              <div>
                <span className="font-mono text-xs text-gray-500 block mb-1">Trend</span>
                <p className={`font-mono text-lg ${
                  prediction.trend === 'up' ? 'text-emerald-400' : 
                  prediction.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {prediction.trend.toUpperCase()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Date + Confidence */}
        <div className="flex flex-col items-end gap-3 min-w-[120px]">
          <span className="font-mono text-xs text-gray-500">
            {formatDate(prediction.predictedAt)}
          </span>
          
          {prediction.confidenceScore !== undefined && (
            <div className="w-32">
              <span className="font-mono text-xs text-gray-500 block mb-1 text-right">Confidence</span>
              <ConfidenceBar confidence={prediction.confidenceScore} />
            </div>
          )}
        </div>
      </div>

      {/* Explanation section */}
      {prediction.explanation && (
        <div className="mt-4 border-t border-gray-800 pt-4">
          <p className="font-mono text-xs text-gray-400 leading-relaxed">
            {prediction.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * LoadingSkeleton - Placeholder while loading predictions.
 */
function LoadingSkeleton(): React.ReactElement {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/30 p-5 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-16 rounded bg-gray-800" />
                <div className="h-4 w-20 rounded bg-gray-800" />
              </div>
              <div className="h-4 w-32 rounded bg-gray-800 mb-3" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 rounded bg-gray-800" />
                <div className="h-10 rounded bg-gray-800" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="h-4 w-24 rounded bg-gray-800" />
              <div className="h-6 w-28 rounded bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * EmptyState - Display when no predictions exist.
 */
function EmptyState(): React.ReactElement {
  return (
    <div className="flex h-96 flex-col items-center justify-center rounded-lg border border-gray-800 bg-gray-900/30">
      <svg className="h-16 w-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <p className="font-mono text-sm text-gray-500">{'>'} No predictions available</p>
      <p className="font-mono text-xs text-gray-600 mt-2">Upload a document or use Chat to generate predictions</p>
    </div>
  );
}

/**
 * ErrorState - Display when an error occurs.
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }): React.ReactElement {
  return (
    <div className="flex h-96 flex-col items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20">
      <svg className="h-16 w-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="font-mono text-sm text-red-400">ERROR: {message}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded border border-red-800 bg-red-950/30 px-4 py-2 font-mono text-sm text-red-400 hover:bg-red-900/50 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * PredictionsPage - Full-page predictions dashboard.
 *
 * Displays all predictions in a responsive grid layout.
 * Each prediction card shows severity, confidence, value, and trend.
 */
export function PredictionsPage(): React.ReactElement {
  const { predictions, isLoading, error, refetch } = usePredictions(50);

  return (
    <>
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-800 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h1 className="text-xl font-bold text-white">Predictions</h1>
            <span className="font-mono text-xs text-gray-500">({predictions.length})</span>
          </div>
          
          <button
            onClick={refetch}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-sm text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            <svg 
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {isLoading && <LoadingSkeleton />}
        
        {!isLoading && error && (
          <ErrorState message={error} onRetry={refetch} />
        )}
        
        {!isLoading && !error && predictions.length === 0 && (
          <EmptyState />
        )}
        
        {!isLoading && !error && predictions.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {predictions.map((prediction) => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
