import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, FileText, Activity, Calendar, BarChart3, Clock } from 'lucide-react';
import { metricsService } from '../services/metricsService';

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [analysisChart, setAnalysisChart] = useState(null);
  const [uploadChart, setUploadChart] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [summaryRes, analysisChartRes, uploadChartRes, activityRes] = await Promise.all([
        metricsService.getSummary().catch(() => ({ data: null })),
        metricsService.getChartData('analysis_count').catch(() => ({ data: { dataPoints: [] } })),
        metricsService.getChartData('upload_volume').catch(() => ({ data: { dataPoints: [] } })),
        metricsService.getRecentActivity(5).catch(() => ({ data: { recentAnalyses: [] } })),
      ]);
      
      setSummary(summaryRes.data);
      setAnalysisChart(analysisChartRes.data);
      setUploadChart(uploadChartRes.data);
      setRecentActivity(activityRes.data?.recentAnalyses || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.response?.data?.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
    const colors = { critical: '#ef4444', moderate: '#f97316', low: '#22c55e' };
    return colors[severity] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-red-500 p-6 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={loadDashboard}
          className="mt-4 px-4 py-2 bg-black text-white font-bold hover:bg-gray-800"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-1">
          {user?.firstName ? `Hola, ${user.firstName}` : 'Dashboard'}
        </h1>
        <p className="text-gray-600">Resumen de tus análisis y actividad</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={20} className="text-black" />
          </div>
          <p className="text-2xl font-bold">{summary?.totalAnalyses || 0}</p>
          <p className="text-xs text-gray-600">Análisis Completados</p>
        </div>

        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <FileText size={20} className="text-black" />
          </div>
          <p className="text-2xl font-bold">{summary?.totalFiles || 0}</p>
          <p className="text-xs text-gray-600">Archivos Subidos</p>
        </div>

        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <Calendar size={20} className="text-black" />
          </div>
          <p className="text-2xl font-bold">{summary?.analysesToday || 0}</p>
          <p className="text-xs text-gray-600">Análisis Hoy</p>
        </div>

        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <Activity size={20} className="text-black" />
          </div>
          <p className="text-2xl font-bold">
            {summary?.completionRatePercent ? `${Math.round(summary.completionRatePercent)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-600">Tasa de Completitud</p>
        </div>
      </div>

      {/* Charts Row */}
      {(analysisChart?.dataPoints?.length > 0 || uploadChart?.dataPoints?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Analyses per day */}
          {analysisChart?.dataPoints?.length > 0 && (
            <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={20} /> Análisis por Día
              </h2>
              <div className="space-y-2">
                {analysisChart.dataPoints.slice(-10).map((point, idx) => {
                  const maxValue = Math.max(...analysisChart.dataPoints.map(p => p.value));
                  const date = new Date(point.timestamp).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-20">{date}</span>
                      <div className="flex-1 bg-gray-200 h-6">
                        <div
                          className="bg-black h-6 flex items-center justify-end pr-2"
                          style={{ width: `${maxValue > 0 ? (point.value / maxValue) * 100 : 0}%` }}
                        >
                          <span className="text-xs text-white font-bold">{point.value}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload volume */}
          {uploadChart?.dataPoints?.length > 0 && (
            <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText size={20} /> Volumen de Uploads
              </h2>
              <div className="space-y-2">
                {uploadChart.dataPoints.slice(-10).map((point, idx) => {
                  const maxValue = Math.max(...uploadChart.dataPoints.map(p => p.value));
                  const date = new Date(point.timestamp).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-20">{date}</span>
                      <div className="flex-1 bg-gray-200 h-6">
                        <div
                          className="bg-blue-500 h-6 flex items-center justify-end pr-2"
                          style={{ width: `${maxValue > 0 ? (point.value / maxValue) * 100 : 0}%` }}
                        >
                          <span className="text-xs text-white font-bold">{point.value}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Clock size={20} /> Actividad Reciente
        </h2>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <Activity size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">No hay actividad reciente</p>
            <p className="text-gray-400 text-xs mt-1">Los análisis aparecerán aquí una vez procesados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="pb-3 border-b border-gray-200 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm flex-1 truncate">{activity.filename}</p>
                  <span className={`px-2 py-0.5 text-xs font-bold ${classificationColor(activity.classification)}`}>
                    {activity.classification}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-bold ${
                    activity.status === 'analyzed' ? 'bg-green-100 text-green-800' :
                    activity.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatDate(activity.createdAt)}</span>
                  {activity.processingTimeSeconds && (
                    <>
                      <span>•</span>
                      <span>{Math.round(activity.processingTimeSeconds)}s procesamiento</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
