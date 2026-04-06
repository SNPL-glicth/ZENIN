import { useState, useCallback, useEffect } from 'react';
import { Activity, AlertTriangle, Brain, Zap, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import CognitiveGraph, { FeedbackPanel, type EnginePerception } from '@/components/cognitive/CognitiveGraph';
import { useCognitiveGraph, usePredictionData } from '@/hooks';
import api from '@/services/api';

interface Pattern {
  id: string;
  seriesId: string;
  patternType: string;
  confidence: number;
  description?: string;
  detectedAt: string;
}

interface Warning {
  id: string;
  seriesId: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  detectedAt: string;
  source: string;
}

const CognitiveTracePage = (): React.ReactElement => {
  // WebSocket connection for real-time cognitive diagnostics
  const { 
    diagnostic, 
    isConnected, 
    error: wsError, 
    sendFeedback 
  } = useCognitiveGraph();

  // HTTP data from .NET backend for historical context
  const { 
    predictions, 
    loading 
  } = usePredictionData();

  // Local state for UI
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEngineData, setSelectedEngineData] = useState<EnginePerception | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Fetch patterns and warnings from .NET backend
  useEffect(() => {
    const fetchWarningsAndPatterns = async () => {
      try {
        // Fetch patterns from .NET backend
        const patternsResponse = await api.get('/api/patterns');
        if (patternsResponse.data?.patterns) {
          setPatterns(patternsResponse.data.patterns);
        }

        // Fetch recent anomalies as warnings
        const anomaliesResponse = await api.get('/api/anomalies');
        if (anomaliesResponse.data?.anomalies) {
          const anomalyWarnings: Warning[] = anomaliesResponse.data.anomalies.map((a: any) => ({
            id: a.id,
            seriesId: a.seriesId,
            severity: a.severity,
            message: a.explanation || `Anomalía detectada en serie ${a.seriesId}`,
            detectedAt: a.detectedAt,
            source: 'ML Detection',
          }));
          setWarnings(anomalyWarnings);
        }
      } catch (err) {
        console.error('[CognitiveTrace] Error fetching warnings:', err);
      }
    };

    fetchWarningsAndPatterns();
    const interval = setInterval(fetchWarningsAndPatterns, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle node click from graph
  const handleNodeClick = useCallback((nodeId: string, data: EnginePerception) => {
    setSelectedNode(nodeId);
    setSelectedEngineData(data);
  }, []);

  // Handle feedback actions
  const handleFeedback = useCallback(async (action: 'reinforce' | 'penalize') => {
    if (!selectedEngineData || !diagnostic) return;

    const feedbackPayload = {
      seriesId: diagnostic.seriesId,
      predictionId: diagnostic.timestamp,
      engineName: selectedEngineData.engineName,
      action: action,
      confidence: selectedEngineData.confidence,
      timestamp: new Date().toISOString(),
    };
    
    console.log('[CognitiveTrace] Sending feedback:', feedbackPayload);

    try {
      await sendFeedback({
        seriesId: diagnostic.seriesId,
        confidence: selectedEngineData.confidence,
        feedback: `${action}:${selectedEngineData.engineName}`,
      });

      setFeedbackMessage(
        action === 'reinforce' 
          ? `Motor ${selectedEngineData.engineName} reforzado` 
          : `Motor ${selectedEngineData.engineName} penalizado`
      );

      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.error('[CognitiveTrace] Error sending feedback:', err);
    }
  }, [selectedEngineData, diagnostic, sendFeedback]);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-500 border-red-500 bg-red-500/10';
      case 'WARNING': return 'text-yellow-500 border-yellow-500 bg-yellow-500/10';
      case 'INFO': return 'text-cyan-500 border-cyan-500 bg-cyan-500/10';
      default: return 'text-gray-500 border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-lg">
            <Brain size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cognitive Trace</h1>
            <p className="text-gray-400 text-sm">Visualización del razonamiento ML en tiempo real</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
            isConnected 
              ? 'border-green-500 bg-green-500/10 text-green-400' 
              : 'border-red-500 bg-red-500/10 text-red-400'
          }`}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="text-xs font-medium">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          {/* Current diagnostic info */}
          {diagnostic && (
            <div className="hidden md:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-cyan-400" />
                <span className="text-gray-400">Serie:</span>
                <span className="font-mono text-cyan-400">{diagnostic.seriesId}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-purple-400" />
                <span className="text-gray-400">Régimen:</span>
                <span className="font-mono text-purple-400 uppercase">{diagnostic.regime}</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-green-400" />
                <span className="text-gray-400">Actualizado:</span>
                <span className="font-mono text-green-400">{formatTime(diagnostic.timestamp)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-180px)]">
        {/* Left: Cognitive Graph */}
        <div className="lg:col-span-3 relative">
          <CognitiveGraph 
            diagnostic={diagnostic} 
            onNodeClick={handleNodeClick}
          />
          
          {/* Feedback Panel */}
          <FeedbackPanel
            nodeId={selectedNode}
            nodeData={selectedEngineData}
            onClose={() => {
              setSelectedNode(null);
              setSelectedEngineData(null);
            }}
            onFeedback={handleFeedback}
          />

          {/* Feedback toast */}
          {feedbackMessage && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
              {feedbackMessage}
            </div>
          )}

          {/* Error message */}
          {wsError && (
            <div className="absolute top-4 left-4 bg-red-600/90 text-white px-4 py-2 rounded-lg">
              Error WebSocket: {wsError}
            </div>
          )}
        </div>

        {/* Right: Warnings & Patterns Sidebar */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto">
          {/* Warnings Section */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-red-400" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Advertencias</h3>
              <span className="ml-auto text-xs text-gray-500">.NET Backend</span>
            </div>
            
            {loading ? (
              <div className="text-center py-4 text-gray-500">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                Cargando...
              </div>
            ) : warnings.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No hay advertencias activas
              </p>
            ) : (
              <div className="space-y-3">
                {warnings.slice(0, 5).map((warning) => (
                  <div 
                    key={warning.id}
                    className={`p-3 rounded border ${getSeverityColor(warning.severity)}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${getSeverityColor(warning.severity)}`}>
                        {warning.severity}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(warning.detectedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200">{warning.message}</p>
                    <p className="text-xs text-gray-500 mt-1">Serie: {warning.seriesId}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Patterns Section */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-cyan-400" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Patrones Detectados</h3>
              <span className="ml-auto text-xs text-gray-500">.NET Backend</span>
            </div>
            
            {patterns.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No hay patrones recientes
              </p>
            ) : (
              <div className="space-y-3">
                {patterns.slice(0, 5).map((pattern) => (
                  <div 
                    key={pattern.id}
                    className="p-3 rounded border border-cyan-500/30 bg-cyan-500/5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-cyan-400 font-medium text-sm">
                        {pattern.patternType}
                      </span>
                      <span className="text-xs text-gray-400">
                        {(pattern.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-300">
                      {pattern.description || `Patrón en serie ${pattern.seriesId}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(pattern.detectedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Predictions Summary */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={18} className="text-purple-400" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Predicciones Recientes</h3>
              <span className="ml-auto text-xs text-gray-500">.NET Backend</span>
            </div>
            
            {predictions.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Sin predicciones recientes
              </p>
            ) : (
              <div className="space-y-2">
                {predictions.slice(0, 3).map((pred: { id: string; seriesId: string; regime: string; confidence: number; predictedAt: string }) => (
                  <div 
                    key={pred.id}
                    className="p-2 rounded bg-gray-800 text-xs"
                  >
                    <div className="flex justify-between text-gray-300">
                      <span>{pred.seriesId}</span>
                      <span className="text-cyan-400">{pred.regime}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 mt-1">
                      <span>Conf: {(pred.confidence * 100).toFixed(0)}%</span>
                      <span>{formatTime(pred.predictedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CognitiveTracePage;
