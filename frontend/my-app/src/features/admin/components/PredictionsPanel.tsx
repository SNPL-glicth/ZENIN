import { useState } from 'react';
import { usePredictions } from '../hooks/usePredictions';
import type { Prediction } from '../services/predictionService';

/**
 * SeverityBadge - Visual indicator for document analysis severity.
 */
function SeverityBadge({ severity, actionRequired }: { severity: string; actionRequired: boolean }): React.ReactElement {
  // Determine severity display based on document analysis
  const getSeverityConfig = () => {
    const level = severity?.toLowerCase() || 'info';
    
    if (level === 'critical' || actionRequired) {
      return {
        bg: 'bg-red-950/50',
        border: 'border-red-800',
        text: 'text-red-400',
        label: 'CRITICAL',
      };
    }
    
    if (level === 'warning') {
      return {
        bg: 'bg-amber-950/50',
        border: 'border-amber-800',
        text: 'text-amber-400',
        label: 'WARNING',
      };
    }
    
    // info or default
    return {
      bg: 'bg-emerald-950/50',
      border: 'border-emerald-800',
      text: 'text-emerald-400',
      label: 'INFO',
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
  
  // Color based on confidence level
  let colorClass = 'bg-emerald-500';
  if (percentage < 60) colorClass = 'bg-amber-500';
  if (percentage < 40) colorClass = 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-gray-800">
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
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 transition-colors hover:border-gray-700">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <SeverityBadge severity={prediction.severity} actionRequired={prediction.actionRequired} />
            <span className="font-mono text-xs text-gray-500">
              {prediction.classification?.toUpperCase() || 'DOCUMENT'}
            </span>
          </div>
          
          <p className="font-mono text-sm text-white truncate" title={prediction.originalFilename}>
            {prediction.originalFilename}
          </p>
          
          <div className="mt-2 flex items-center gap-4">
            <div>
              <span className="font-mono text-xs text-gray-500">Size</span>
              <p className="font-mono text-sm text-purple-300">{formatFileSize(prediction.fileSizeBytes)}</p>
            </div>
            
            <div>
              <span className="font-mono text-xs text-gray-500">Sentiment</span>
              <p className={`font-mono text-sm ${
                prediction.sentimentLabel === 'positive' ? 'text-emerald-400' : 
                prediction.sentimentLabel === 'negative' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {prediction.sentimentLabel?.toUpperCase() || 'NEUTRAL'}
              </p>
            </div>
            
            <div>
              <span className="font-mono text-xs text-gray-500">Urgency</span>
              <p className="font-mono text-sm text-amber-300">
                {(prediction.urgencyScore || 0).toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="font-mono text-xs text-gray-500">
            {formatDate(prediction.predictedAt)}
          </span>
          
          {prediction.confidence !== undefined && (
            <div className="w-24">
              <ConfidenceBar confidence={prediction.confidence} />
            </div>
          )}
          
          {prediction.conclusion && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="font-mono text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              {isExpanded ? '[-] Less' : '[+] More'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded conclusion */}
      {isExpanded && prediction.conclusion && (
        <div className="mt-3 border-t border-gray-800 pt-3">
          <p className="font-mono text-xs text-gray-400 leading-relaxed">
            {prediction.conclusion}
          </p>
          {prediction.actions && prediction.actions.length > 0 && (
            <div className="mt-2">
              <span className="font-mono text-xs text-gray-500">Acciones recomendadas:</span>
              <ul className="mt-1 space-y-1">
                {prediction.actions.map((action, i) => (
                  <li key={i} className="font-mono text-xs text-gray-400">• {action}</li>
                ))}
              </ul>
            </div>
          )}
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
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/30 p-4 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-16 rounded bg-gray-800" />
                <div className="h-4 w-24 rounded bg-gray-800" />
              </div>
              <div className="h-4 w-32 rounded bg-gray-800 mb-2" />
              <div className="flex gap-4">
                <div className="h-8 w-20 rounded bg-gray-800" />
                <div className="h-8 w-20 rounded bg-gray-800" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="h-4 w-20 rounded bg-gray-800" />
              <div className="h-4 w-24 rounded bg-gray-800" />
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
    <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-gray-800 bg-gray-900/30">
      <svg className="h-12 w-12 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <p className="font-mono text-sm text-gray-500">{'>'} No predictions available</p>
      <p className="font-mono text-xs text-gray-600 mt-1">Upload a document or query to generate predictions</p>
    </div>
  );
}

/**
 * ErrorState - Display when an error occurs.
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }): React.ReactElement {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20">
      <svg className="h-12 w-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="font-mono text-sm text-red-400">ERROR: {message}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded border border-red-800 bg-red-950/30 px-3 py-1 font-mono text-xs text-red-400 hover:bg-red-900/50 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * PredictionsPanel - Display predictions from the cognitive system.
 * 
 * Shows predictions with severity indicators, confidence levels,
 * and expandable explanations. Integrates seamlessly with the
 * existing dashboard design.
 */
export function PredictionsPanel(): React.ReactElement {
  const { predictions, isLoading, error, refetch } = usePredictions(20);

  return (
    <div className="flex flex-col h-full rounded-lg border border-gray-800 bg-gray-900/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-mono text-sm text-white">PREDICTIONS</span>
          <span className="font-mono text-xs text-gray-500">({predictions.length})</span>
        </div>
        
        <button
          onClick={refetch}
          disabled={isLoading}
          className="rounded p-1 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
        >
          <svg 
            className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && <LoadingSkeleton />}
        
        {!isLoading && error && (
          <ErrorState message={error} onRetry={refetch} />
        )}
        
        {!isLoading && !error && predictions.length === 0 && (
          <EmptyState />
        )}
        
        {!isLoading && !error && predictions.map((prediction) => (
          <PredictionCard key={prediction.id} prediction={prediction} />
        ))}
      </div>
    </div>
  );
}
