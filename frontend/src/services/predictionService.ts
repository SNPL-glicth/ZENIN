import api from './api';
import { AxiosResponse } from 'axios';
import { Prediction, Anomaly, MLHealth, MLMetrics } from '../types/services';

export interface PredictionsResponse {
  predictions: Prediction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AnomaliesResponse {
  anomalies: Anomaly[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExplainabilityTrace {
  predictionId: string;
  trace: Record<string, unknown>;
}

export interface CognitiveTrace {
  predictionId: string;
  cognitive: Record<string, unknown>;
}

export interface ActiveSeriesResponse {
  seriesIds: string[];
}

export const predictionService = {
  getPredictions: (seriesId: string | null = null, page = 1, pageSize = 20): Promise<AxiosResponse<PredictionsResponse>> =>
    api.get('/predictions', { params: { seriesId, page, pageSize } }),

  getPredictionById: (id: string): Promise<AxiosResponse<Prediction>> =>
    api.get(`/predictions/${id}`),

  getPredictionsBySeries: (seriesId: string, limit = 50): Promise<AxiosResponse<Prediction[]>> =>
    api.get(`/predictions/series/${seriesId}`, { params: { limit } }),

  getAnomalies: (seriesId: string | null = null, severity: string | null = null, page = 1, pageSize = 20): Promise<AxiosResponse<AnomaliesResponse>> =>
    api.get('/anomalies', { params: { seriesId, severity, page, pageSize } }),

  getAnomaliesBySeries: (seriesId: string, limit = 50): Promise<AxiosResponse<Anomaly[]>> =>
    api.get(`/anomalies/series/${seriesId}`, { params: { limit } }),

  getMLHealth: (): Promise<AxiosResponse<MLHealth>> =>
    api.get('/ml/health'),

  getMLMetrics: (): Promise<AxiosResponse<MLMetrics>> =>
    api.get('/ml/metrics'),

  getExplainability: (predictionId: string): Promise<AxiosResponse<ExplainabilityTrace>> =>
    api.get(`/predictions/${predictionId}/trace`),

  getCognitiveTrace: (predictionId: string): Promise<AxiosResponse<CognitiveTrace>> =>
    api.get(`/predictions/${predictionId}/cognitive-trace`),

  getRecentPredictions: (limit = 10): Promise<AxiosResponse<Prediction[]>> =>
    api.get('/predictions/recent', { params: { limit } }),

  getActiveSeries: (): Promise<AxiosResponse<ActiveSeriesResponse>> =>
    api.get('/ml/active-series'),
};

export default predictionService;
