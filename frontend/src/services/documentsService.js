import api from './api';

export const documentsService = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        const pct = Math.round((e.loaded * 100) / e.total);
        onProgress?.(pct);
      }
    });
  },
  list: (page = 1, status = null) =>
    api.get('/documents', { params: { page, pageSize: 20, status } }),
  getById: (id) => api.get(`/documents/${id}`),
  reanalyze: (id) => api.post(`/documents/${id}/analyze`),
};
