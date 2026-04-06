import { useAuth } from '../context/AuthContext';
import { TrendingUp, FileText, Activity, Calendar, BarChart3, Clock, LucideIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAsyncData } from '../hooks/useAsyncData';
import { metricsService } from '../services/metricsService';
import type { MetricsSummary, RecentActivity } from '../types/services';
import { Card, LoadingSpinner, ErrorFallback, StatusBadge } from '../components/ui';
import { MLStatus } from '../components/sections';
import { formatDate } from '../utils/formatters';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
}

const StatCard = ({ icon: Icon, value, label }: StatCardProps): React.ReactElement => (
  <Card className="p-4">
    <Icon size={20} className="text-black mb-2" />
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-gray-600">{label}</p>
  </Card>
);

interface ChartDataPoint {
  date: string;
  value: number;
}

interface SimpleBarChartProps {
  data: ChartDataPoint[];
  title: string;
  icon: LucideIcon;
  color?: string;
}

const SimpleBarChart = ({ data, title, icon: Icon, color = "#000" }: SimpleBarChartProps): React.ReactElement => (
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

interface DashboardData {
  summary: MetricsSummary;
  analysisChart: ChartDataPoint[];
  uploadChart: ChartDataPoint[];
  recentActivity: RecentActivity[];
}

const Dashboard = (): React.ReactElement => {
  const { user } = useAuth();

  const {
    data: dashboardData,
    loading,
    error,
    refetch
  } = useAsyncData<DashboardData>(async () => {
    const [summaryRes, analysisChartRes, uploadChartRes, activityRes] = await Promise.all([
      metricsService.getSummary(),
      metricsService.getChartData('analysis_count'),
      metricsService.getChartData('upload_volume'),
      metricsService.getRecentActivity(5),
    ]);

    const formatChartData = (chartData: { labels: string[]; data: number[] }) =>
      chartData?.labels?.map((label, index) => ({
        date: label,
        value: chartData.data[index] || 0
      })) || [];

    return {
      summary: summaryRes.data,
      analysisChart: formatChartData(analysisChartRes.data),
      uploadChart: formatChartData(uploadChartRes.data),
      recentActivity: activityRes.data || []
    };
  });

  if (loading) return <LoadingSpinner size="md" text="Cargando dashboard..." className="h-64" />;
  if (error) return <ErrorFallback error={error} retry={refetch} />;

  const { summary, analysisChart, uploadChart, recentActivity } = dashboardData || {} as DashboardData;

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-bold mb-1">
          {user?.firstName ? `Hola, ${user.firstName}` : 'Dashboard'}
        </h1>
        <p className="text-gray-600 text-sm md:text-base">Resumen de tus análisis y actividad</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={TrendingUp} value={summary?.predictions || 0} label="Análisis Completados" />
        <StatCard icon={FileText} value={summary?.anomalies || 0} label="Archivos Subidos" />
        <StatCard icon={Calendar} value={summary?.accuracy || 0} label="Análisis Hoy" />
        <StatCard icon={Activity} value={summary ? `${Math.round(summary.predictions / (summary.anomalies || 1) * 100)}%` : 'N/A'} label="Tasa de Completitud" />
      </div>

      {(analysisChart?.length > 0 || uploadChart?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {analysisChart?.length > 0 && (
            <SimpleBarChart data={analysisChart} title="Análisis por Día" icon={BarChart3} />
          )}
          {uploadChart?.length > 0 && (
            <SimpleBarChart data={uploadChart} title="Volumen de Uploads" icon={FileText} color="#3b82f6" />
          )}
        </div>
      )}

      <Card title="Actividad Reciente" icon={Clock}>
        {recentActivity?.length === 0 ? (
          <div className="text-center py-8">
            <Activity size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">No hay actividad reciente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity?.map((activity) => (
              <div key={activity.id} className="pb-3 border-b border-gray-200 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm flex-1 truncate">{activity.type || 'Actividad'}</p>
                  <StatusBadge type="classification" value={activity.type || 'unknown'} />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatDate(activity.timestamp)}</span>
                  <span>•</span>
                  <span>{activity.description || 'Sin descripción'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-8">
        <MLStatus />
      </div>
    </div>
  );
};

export default Dashboard;
