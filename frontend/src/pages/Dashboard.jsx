import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, Database, AlertTriangle, Activity,
  Search, MessageSquare, FileText, Loader,
  Upload as UploadIcon, File, CheckCircle, AlertCircle,
  BarChart3, Layers, Send, X
} from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { queryService } from '../services/queryService';
import { ingestService } from '../services/ingestService';

const Dashboard = () => {
  const { user } = useAuth();

  // ── Dashboard state ──
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  // ── Query state ──
  const [question, setQuestion] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);

  // ── Upload state ──
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // ── Load dashboard ──
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setDashError(null);
      const response = await dashboardService.getOverview();
      setData(response.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setDashError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // ── Query handlers ──
  const handleQuery = async (e) => {
    e.preventDefault();
    if (!question.trim() || queryLoading) return;

    setQueryLoading(true);
    setQueryError(null);

    try {
      const response = await queryService.ask(question);
      const d = response.data;
      setQueryResult(d);
      setQueryHistory((prev) => [{ question, answer: d.answer, sources: d.sources }, ...prev]);
      setQuestion('');
    } catch (err) {
      console.error('Query error:', err);
      setQueryError(err.response?.data?.message || err.response?.data?.error || 'Error al consultar');
    } finally {
      setQueryLoading(false);
    }
  };

  // ── Upload handlers ──
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setAnalyzing(false);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const response = await ingestService.upload(selectedFile, (progress) => {
        setUploadProgress(progress);
      });
      const d = response.data;

      if (d.status === 'pending' || d.status === 'processing') {
        setUploading(false);
        setAnalyzing(true);
        const pollResult = await ingestService.pollForResult(d.analysisId);
        setUploadResult(pollResult.data);
        setAnalyzing(false);
      } else {
        setUploadResult(d);
        setUploading(false);
      }
      // Refresh dashboard stats after successful upload
      loadDashboardData();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.response?.data?.error || err.response?.data?.message || err.message || 'Error al procesar');
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadError(null);
    setUploadProgress(0);
  };

  const classificationColor = (cls) => {
    switch (cls) {
      case 'numeric': return 'bg-blue-100 text-blue-800';
      case 'text': return 'bg-purple-100 text-purple-800';
      case 'mixed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity) => {
    const colors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', none: '#6b7280' };
    return colors[severity] || colors.none;
  };

  // ── Render ──
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-1">
          {user?.firstName ? `Hola, ${user.firstName}` : 'Dashboard'}
        </h1>
        <p className="text-gray-600">Consulta, sube archivos y monitorea tus datos en un solo lugar.</p>
      </div>

      {/* ════════════════════ QUERY SECTION ════════════════════ */}
      <div className="mb-8 bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Search size={20} /> Consultar Datos
        </h2>
        <form onSubmit={handleQuery} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Pregunta sobre tus datos..."
              className="w-full pl-4 pr-4 py-3 border-2 border-black text-base focus:outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-shadow"
              disabled={queryLoading}
            />
          </div>
          <button
            type="submit"
            disabled={queryLoading || !question.trim()}
            className="px-6 py-3 bg-black text-white font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {queryLoading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
            Preguntar
          </button>
        </form>

        {queryError && (
          <div className="mt-3 p-3 border-2 border-red-400 bg-red-50 text-red-700 text-sm">
            {queryError}
          </div>
        )}

        {queryResult && (
          <div className="mt-4 p-4 bg-gray-50 border-2 border-gray-200">
            <div className="flex items-start gap-2 mb-2">
              <MessageSquare size={18} className="text-black mt-0.5 flex-shrink-0" />
              <p className="font-bold text-sm">Respuesta</p>
            </div>
            <p className="text-gray-800 text-sm whitespace-pre-line">{queryResult.answer}</p>

            {queryResult.sources?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <p className="text-xs font-medium text-gray-500 mb-2">Fuentes ({queryResult.sources.length})</p>
                <div className="space-y-1">
                  {queryResult.sources.slice(0, 3).map((src, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      {src.type === 'semantic' ? (
                        <Database size={12} className="text-blue-600 flex-shrink-0" />
                      ) : (
                        <FileText size={12} className="text-green-600 flex-shrink-0" />
                      )}
                      <span className="font-medium">{src.source}</span>
                      <span className="text-gray-500">
                        ({src.type === 'semantic' ? 'ML' : 'SQL'} {(src.relevance * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {queryHistory.length > 1 && (
          <details className="mt-3">
            <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-black">
              Historial ({queryHistory.length - 1} anteriores)
            </summary>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {queryHistory.slice(1, 6).map((item, i) => (
                <div key={i} className="p-2 border border-gray-200 text-xs">
                  <p className="font-medium">{item.question}</p>
                  <p className="text-gray-600 mt-1">
                    {item.answer.substring(0, 150)}{item.answer.length > 150 ? '...' : ''}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* ════════════════════ UPLOAD SECTION ════════════════════ */}
      <div className="mb-8 bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <UploadIcon size={20} /> Subir Archivo
        </h2>

        {!uploadResult ? (
          <div>
            <div
              className={`border-2 border-dashed ${
                dragActive ? 'border-black bg-gray-50' : 'border-gray-300'
              } p-6 text-center transition-colors rounded`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {!selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <UploadIcon size={32} className="text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Arrastra un archivo o{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="font-bold text-black underline hover:no-underline"
                    >
                      selecciona uno
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">CSV, Excel, PDF, Word, JSON, TXT — hasta 500MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="*/*"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <File size={24} className="text-black flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>

                  {!uploading && !analyzing && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={handleUpload}
                        className="px-4 py-2 bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                      >
                        Subir y Analizar
                      </button>
                      <button
                        onClick={resetUpload}
                        className="p-2 border-2 border-black hover:bg-gray-100 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {uploading && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-32 bg-gray-200 h-2 rounded">
                        <div className="bg-black h-2 rounded transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <Loader size={16} className="animate-spin" />
                      <span className="text-xs text-gray-600">{uploadProgress}%</span>
                    </div>
                  )}

                  {analyzing && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Loader size={16} className="animate-spin" />
                      <span className="text-xs font-medium text-gray-700">Analizando...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {uploadError && (
              <div className="mt-3 p-3 border-2 border-red-400 bg-red-50 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{uploadError}</p>
                <button onClick={resetUpload} className="ml-auto text-xs font-bold underline text-red-600">
                  Reintentar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle size={24} className="text-green-600" />
              <div>
                <p className="font-bold">{uploadResult.filename}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-bold ${classificationColor(uploadResult.classification)}`}>
                    {uploadResult.classification?.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                    {uploadResult.status}
                  </span>
                </div>
              </div>
            </div>

            {uploadResult.conclusion && (
              <p className="text-sm text-gray-700 mb-3 p-3 bg-gray-50 border border-gray-200 whitespace-pre-line">
                {uploadResult.conclusion}
              </p>
            )}

            {uploadResult.numericSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {uploadResult.numericSummary.record_count !== undefined && (
                  <div className="text-center p-2 bg-gray-50 border text-xs">
                    <p className="text-lg font-bold">{uploadResult.numericSummary.record_count}</p>
                    <p className="text-gray-500">Registros</p>
                  </div>
                )}
                {uploadResult.numericSummary.numeric_columns !== undefined && (
                  <div className="text-center p-2 bg-gray-50 border text-xs">
                    <p className="text-lg font-bold">{uploadResult.numericSummary.numeric_columns}</p>
                    <p className="text-gray-500">Col. Numéricas</p>
                  </div>
                )}
                {uploadResult.numericSummary.total_columns !== undefined && (
                  <div className="text-center p-2 bg-gray-50 border text-xs">
                    <p className="text-lg font-bold">{uploadResult.numericSummary.total_columns}</p>
                    <p className="text-gray-500">Total Columnas</p>
                  </div>
                )}
                {uploadResult.numericSummary.total_chunks !== undefined && (
                  <div className="text-center p-2 bg-gray-50 border text-xs">
                    <p className="text-lg font-bold">{uploadResult.numericSummary.total_chunks}</p>
                    <p className="text-gray-500">Fragmentos</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={resetUpload}
              className="text-sm px-4 py-2 bg-black text-white font-bold hover:bg-gray-800 transition-colors"
            >
              Subir Otro Archivo
            </button>
          </div>
        )}
      </div>

      {/* ════════════════════ STATS CARDS ════════════════════ */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Cargando datos...</p>
          </div>
        </div>
      ) : dashError ? (
        <div className="mb-8 bg-white border-2 border-red-500 p-4 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
          <p className="text-red-600 font-medium text-sm">{dashError}</p>
          <button
            onClick={loadDashboardData}
            className="mt-2 text-xs px-3 py-1 bg-black text-white font-medium hover:bg-gray-800"
          >
            Reintentar
          </button>
        </div>
      ) : data && data.totalSeries > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Series', value: data.totalSeries, icon: Database },
              { label: 'Anomalias', value: data.unacknowledgedAnomalies, icon: AlertTriangle },
              { label: 'Patrones', value: data.totalPatterns, icon: Activity },
              { label: 'Predicciones', value: data.totalPredictions, icon: TrendingUp },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.icon size={20} className="text-black" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Anomalies + Series */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-bold mb-4">Anomalias Recientes</h2>
              {data.recentAnomalies.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">Sin anomalias detectadas</p>
              ) : (
                <div className="space-y-3">
                  {data.recentAnomalies.map((anomaly) => (
                    <div key={anomaly.id} className="flex items-center gap-3 pb-3 border-b border-gray-200 last:border-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getSeverityColor(anomaly.severity) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{anomaly.seriesName}</p>
                        <p className="text-xs text-gray-500">
                          {anomaly.anomalyScore.toFixed(2)} • {anomaly.severity} • {new Date(anomaly.detectedAt).toLocaleString()}
                        </p>
                      </div>
                      {anomaly.isAcknowledged && (
                        <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded flex-shrink-0">OK</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-bold mb-4">Series Activas</h2>
              {data.topSeries.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">Sin series aun</p>
              ) : (
                <div className="space-y-2">
                  {data.topSeries.map((series) => (
                    <div key={series.id} className="px-3 py-2 border-2 border-black hover:bg-gray-50 transition-colors">
                      <p className="font-medium text-sm">{series.name}</p>
                      <p className="text-xs text-gray-600">
                        {series.latestValue !== null ? `Ultimo: ${series.latestValue.toFixed(2)}` : 'Sin datos'}
                        {series.regime && ` • ${series.regime}`}
                      </p>
                      {series.latestTimestamp && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(series.latestTimestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border-2 border-gray-200 p-6 text-center rounded">
          <Database size={40} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 text-sm">Sin datos aun. Sube un archivo para empezar.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
