import { useAuth } from '../context/AuthContext';
import { TrendingUp, FileText, Activity, Calendar, BarChart3, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAsyncData } from '../hooks/useAsyncData';
import { metricsService } from '../services/metricsService';
import { Card, LoadingSpinner, ErrorFallback, StatusBadge } from '../components/ui';
import { MLStatus } from '../components/sections';
import { formatDate } from '../utils/formatters';

const StatCard = ({ icon: Icon, value, label }) => (
  <Card className="p-4">
    <Icon size={20} className="text-black mb-2" />
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-gray-600">{label}</p>
  </Card>
);

const SimpleBarChart = ({ data, title, icon: Icon, color = "#000" }) => (
  <Card title={title} icon={Icon}>
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="value" fill={color} />
      </BarChart>
    </ResponsiveContainer>
  </Card>
);

const Dashboard = () => {
  const { user } = useAuth();

  const {
    data: dashboardData,
    loading,
    error,
    refetch
  } = useAsyncData(async () => {
    const [summaryRes, analysisChartRes, uploadChartRes, activityRes] = await Promise.all([
      metricsService.getSummary(),
      metricsService.getChartData('analysis_count'),
      metricsService.getChartData('upload_volume'),
      metricsService.getRecentActivity(5),
    ]);

    const formatChartData = (dataPoints) =>
      dataPoints?.slice(-10).map(p => ({
        date: new Date(p.timestamp).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        value: p.value
      })) || [];

    return {
      summary: summaryRes.data,
      analysisChart: formatChartData(analysisChartRes.data?.dataPoints),
      uploadChart: formatChartData(uploadChartRes.data?.dataPoints),
      recentActivity: activityRes.data?.recentAnalyses || []
    };
  });

  if (loading) return <LoadingSpinner size="md" text="Cargando dashboard..." className="h-64" />;
  if (error) return <ErrorFallback error={error} retry={refetch} />;

  const { summary, analysisChart, uploadChart, recentActivity } = dashboardData;

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
        <StatCard icon={TrendingUp} value={summary?.totalAnalyses || 0} label="Análisis Completados" />
        <StatCard icon={FileText} value={summary?.totalFiles || 0} label="Archivos Subidos" />
        <StatCard icon={Calendar} value={summary?.analysesToday || 0} label="Análisis Hoy" />
        <StatCard icon={Activity} value={summary?.completionRatePercent ? `${Math.round(summary.completionRatePercent)}%` : 'N/A'} label="Tasa de Completitud" />
      </div>

      {/* Charts Row */}
      {(analysisChart.length > 0 || uploadChart.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {analysisChart.length > 0 && (
            <SimpleBarChart data={analysisChart} title="Análisis por Día" icon={BarChart3} />
          )}
          {uploadChart.length > 0 && (
            <SimpleBarChart data={uploadChart} title="Volumen de Uploads" icon={FileText} color="#3b82f6" />
          )}
        </div>
      )}

      {/* Recent Activity */}
      <Card title="Actividad Reciente" icon={Clock}>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <Activity size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">No hay actividad reciente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="pb-3 border-b border-gray-200 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm flex-1 truncate">{activity.filename}</p>
                  <StatusBadge type="classification" value={activity.classification} />
                  <StatusBadge type="status" value={activity.status} />
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
      </Card>

      {/* ML Status Section */}
      <div className="mt-8">
        <MLStatus />
      </div>
    </div>
  );
};

export default Dashboard;
