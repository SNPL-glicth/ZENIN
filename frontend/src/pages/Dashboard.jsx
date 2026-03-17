import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Database, AlertTriangle, Activity } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardService.getOverview();
      setData(response.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e',
      none: '#6b7280',
    };
    return colors[severity] || colors.none;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-red-500 p-6 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
        <h2 className="text-2xl font-bold mb-2 text-red-600">Error</h2>
        <p className="text-gray-700 mb-4">{error}</p>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.totalSeries === 0) {
    return (
      <div className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
        <Database size={64} className="mx-auto mb-4 text-gray-400" />
        <h2 className="text-2xl font-bold mb-2">No Data Yet</h2>
        <p className="text-gray-600 mb-4">Upload your first file to get started with time-series analysis.</p>
      </div>
    );
  }

  const stats = [
    { label: 'Total Series', value: data.totalSeries, icon: Database },
    { label: 'Unresolved Anomalies', value: data.unacknowledgedAnomalies, icon: AlertTriangle },
    { label: 'Patterns Detected', value: data.totalPatterns, icon: Activity },
    { label: 'Total Predictions', value: data.totalPredictions, icon: TrendingUp },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.firstName}!</h1>
        <p className="text-gray-600">Here's what's happening with your projects today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon size={24} className="text-black" />
              <span className="text-sm font-bold bg-black text-white px-2 py-1">
                {stat.trend}
              </span>
            </div>
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold mb-4">Recent Anomalies</h2>
          {data.recentAnomalies.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No anomalies detected</p>
          ) : (
            <div className="space-y-4">
              {data.recentAnomalies.map((anomaly) => (
                <div key={anomaly.id} className="flex items-center gap-4 pb-4 border-b border-gray-200 last:border-0">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getSeverityColor(anomaly.severity) }}
                  ></div>
                  <div className="flex-1">
                    <p className="font-medium">{anomaly.seriesName}</p>
                    <p className="text-sm text-gray-600">
                      Score: {anomaly.anomalyScore.toFixed(2)} • {anomaly.severity} •{' '}
                      {new Date(anomaly.detectedAt).toLocaleString()}
                    </p>
                  </div>
                  {anomaly.isAcknowledged && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Resolved</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold mb-4">Active Series</h2>
          {data.topSeries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No series yet</p>
          ) : (
            <div className="space-y-3">
              {data.topSeries.map((series) => (
                <div
                  key={series.id}
                  className="px-4 py-3 border-2 border-black hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium">{series.name}</p>
                  <p className="text-sm text-gray-600">
                    {series.latestValue !== null
                      ? `Latest: ${series.latestValue.toFixed(2)}`
                      : 'No data'}
                    {series.regime && ` • Regime: ${series.regime}`}
                  </p>
                  {series.latestTimestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      Updated: {new Date(series.latestTimestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
