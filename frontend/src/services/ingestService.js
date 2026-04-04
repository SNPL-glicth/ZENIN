import api from './api';

export const ingestService = {
  upload: (file, onProgress) => {
    console.log('[ingestService.upload] Recibiendo file:', file?.name, 'size:', file?.size, 'type:', file?.type);
    const formData = new FormData();
    formData.append('file', file);
    console.log('[ingestService.upload] FormData creado, llamando api.post...');
    return api.post('/ingest/upload', formData, {
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
