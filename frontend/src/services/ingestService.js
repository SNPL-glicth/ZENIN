import api from './api';

export const ingestService = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ingest/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        const pct = Math.round((e.loaded * 100) / e.total);
        onProgress?.(pct);
      }
    });
  },

  getAnalysisResult: (analysisId) => {
    return api.get(`/ingest/analysis/${analysisId}`);
  },

  pollForResult: async (analysisId, { intervalMs = 3000, maxAttempts = 40 } = {}) => {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await api.get(`/ingest/analysis/${analysisId}`);
      const status = res.data?.status;
      if (status && status !== 'pending' && status !== 'processing') {
        return res;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error('Timeout esperando resultado del análisis ML');
  },
};
