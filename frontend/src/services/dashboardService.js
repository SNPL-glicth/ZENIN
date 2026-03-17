import api from './api';

export const dashboardService = {
  getOverview: () => api.get('/dashboard/overview'),
};
