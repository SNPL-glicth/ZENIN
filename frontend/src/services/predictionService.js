import api from './api';

export const predictionService = {
  getPredictions: (seriesId = null, page = 1, pageSize = 20) =>
    api.get('/predictions', { params: { seriesId, page, pageSize } }),

  getPredictionById: (id) =>
    api.get(`/predictions/${id}`),

  getPredictionsBySeries: (seriesId, limit = 50) =>
    api.get(`/predictions/series/${seriesId}`, { params: { limit } }),

  getAnomalies: (seriesId = null, severity = null, page = 1, pageSize = 20) =>
    api.get('/anomalies', { params: { seriesId, severity, page, pageSize } }),

  getAnomaliesBySeries: (seriesId, limit = 50) =>
    api.get(`/anomalies/series/${seriesId}`, { params: { limit } }),

  getMLHealth: () =>
    api.get('/ml/health'),

  getMLMetrics: () =>
    api.get('/ml/metrics'),

  getExplainability: (predictionId) =>
    api.get(`/predictions/${predictionId}/trace`),

  getCognitiveTrace: (predictionId) =>
    api.get(`/predictions/${predictionId}/cognitive-trace`),

  getRecentPredictions: (limit = 10) =>
    api.get('/predictions/recent', { params: { limit } }),

  getActiveSeries: () =>
    api.get('/ml/active-series'),
};

export default predictionService;
