import api from './api';

export const metricsService = {
  getOverview: () => api.get('/dashboard/overview'),
  
  getSummary: () => api.get('/metrics/summary'),
  
  getChartData: (type, from = null, to = null) => {
    const params = { type };
    if (from) params.from = from;
    if (to) params.to = to;
    return api.get('/metrics/chart-data', { params });
  },
  
  getRecentActivity: (limit = 10) =>
    api.get('/metrics/recent-activity', { params: { limit } }),
};
