import api from './api';
import { AxiosResponse } from 'axios';
import { ProgressCallback } from '../types/services';

export interface Document {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'analyzed' | 'error';
  uploadedAt: string;
  [key: string]: unknown;
}

export interface DocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
}

export interface ReanalyzeResponse {
  documentId: string;
  status: string;
}

export const documentsService = {
  upload: (file: File, onProgress?: ProgressCallback): Promise<AxiosResponse<Document>> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e: { loaded: number; total: number }) => {
        const pct = Math.round((e.loaded * 100) / e.total);
        onProgress?.(pct);
      }
    });
  },

  list: (page = 1, status: string | null = null): Promise<AxiosResponse<DocumentsResponse>> =>
    api.get('/documents', { params: { page, pageSize: 20, status } }),

  getById: (id: string): Promise<AxiosResponse<Document>> =>
    api.get(`/documents/${id}`),

  reanalyze: (id: string): Promise<AxiosResponse<ReanalyzeResponse>> =>
    api.post(`/documents/${id}/analyze`),
};

export default documentsService;
