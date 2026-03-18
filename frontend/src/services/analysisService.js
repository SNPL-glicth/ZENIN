import api from './api';

export const analysisService = {
  getAll: (page = 1, pageSize = 20) =>
    api.get('/ingest/analyses', { params: { page, pageSize } }),
  
  getStats: () =>
    api.get('/ingest/stats'),
  
  deleteAll: () =>
    api.delete('/ingest/analyses'),
};
