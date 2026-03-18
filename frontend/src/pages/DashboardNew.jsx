import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, FileText, Activity, Calendar, BarChart3 } from 'lucide-react';
import { analysisService } from '../services/analysisService';
import { documentsService } from '../services/documentsService';

const DashboardNew = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsRes, filesRes] = await Promise.all([
        analysisService.getStats(),
        documentsService.list(1)
      ]);
      
      setStats(statsRes.data);
      setFiles(filesRes.data.slice(0, 5));
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
          <p className="text-2xl font-bold">{stats?.totalAnalyses || 0}</p>
          <p className="text-xs text-gray-600">Análisis Completados</p>
        </div>

        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <FileText size={20} className="text-black" />
          </div>
          <p className="text-2xl font-bold">{stats?.totalFiles || 0}</p>
          <p className="text-xs text-gray-600">Archivos Subidos</p>
        </div>

        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <Calendar size={20} className="text-black" />
          </div>
          <p className="text-sm font-bold">
            {stats?.lastActivity ? formatDate(stats.lastActivity).split(',')[0] : 'N/A'}
          </p>
          <p className="text-xs text-gray-600">Última Actividad</p>
        </div>

        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <Activity size={20} className="text-black" />
          </div>
          <p className="text-2xl font-bold">
            {stats?.analysesPerDay ? Object.keys(stats.analysesPerDay).length : 0}
          </p>
          <p className="text-xs text-gray-600">Días Activos (7d)</p>
        </div>
      </div>

      {/* Charts Row */}
      {stats?.analysesPerDay && Object.keys(stats.analysesPerDay).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Analyses per day */}
          <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart3 size={20} /> Análisis por Día (últimos 7 días)
            </h2>
            <div className="space-y-2">
              {Object.entries(stats.analysesPerDay).map(([date, count]) => (
                <div key={date} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-24">{date}</span>
                  <div className="flex-1 bg-gray-200 h-6">
                    <div
                      className="bg-black h-6 flex items-center justify-end pr-2"
                      style={{ width: `${(count / Math.max(...Object.values(stats.analysesPerDay))) * 100}%` }}
                    >
                      <span className="text-xs text-white font-bold">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Severity Distribution */}
          <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg font-bold mb-4">Distribución de Severidad</h2>
            <div className="space-y-3">
              {Object.entries(stats.severityDistribution || {}).map(([severity, count]) => (
                <div key={severity} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getSeverityColor(severity) }}
                  />
                  <span className="text-sm font-medium capitalize flex-1">{severity}</span>
                  <span className="text-lg font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Analyses */}
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-lg font-bold mb-4">Análisis Recientes</h2>
          {stats?.recentAnalyses?.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">Sin análisis recientes</p>
          ) : (
            <div className="space-y-3">
              {stats?.recentAnalyses?.map((analysis) => (
                <div key={analysis.id} className="pb-3 border-b border-gray-200 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm flex-1 truncate">{analysis.filename}</p>
                    <span className={`px-2 py-0.5 text-xs font-bold ${classificationColor(analysis.classification)}`}>
                      {analysis.classification}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(analysis.createdAt)}</p>
                  {analysis.conclusion && (
                    <p className="text-xs text-gray-700 mt-1 line-clamp-2">{analysis.conclusion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Files */}
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-lg font-bold mb-4">Archivos Recientes</h2>
          {files.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">Sin archivos subidos</p>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="pb-3 border-b border-gray-200 last:border-0">
                  <p className="font-medium text-sm truncate">{file.originalFilename}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{formatFileSize(file.fileSizeBytes)}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{formatDate(file.uploadedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardNew;
