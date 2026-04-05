import api from './api';
import { AxiosResponse } from 'axios';
import { 
  DashboardOverview, 
  MetricsSummary, 
  ChartData, 
  RecentActivity 
} from '../types/services';

export type ChartType = 'predictions' | 'anomalies' | 'accuracy' | 'latency';

export const metricsService = {
  getOverview: (): Promise<AxiosResponse<DashboardOverview>> =>
    api.get('/dashboard/overview'),

  getSummary: (): Promise<AxiosResponse<MetricsSummary>> =>
    api.get('/metrics/summary'),

  getChartData: (type: ChartType, from: string | null = null, to: string | null = null): Promise<AxiosResponse<ChartData>> => {
    const params: { type: ChartType; from?: string; to?: string } = { type };
    if (from) params.from = from;
    if (to) params.to = to;
    return api.get('/metrics/chart-data', { params });
  },

  getRecentActivity: (limit = 10): Promise<AxiosResponse<RecentActivity[]>> =>
    api.get('/metrics/recent-activity', { params: { limit } }),
};

export default metricsService;
