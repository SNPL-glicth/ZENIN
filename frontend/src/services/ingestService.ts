import api from './api';
import { AxiosResponse } from 'axios';
import { AnalysisResult, ProgressCallback } from '../types/services';

export interface UploadResponse {
  analysisId: string;
  status: 'pending' | 'processing' | 'analyzed';
  filename: string;
}

export interface PollOptions {
  intervalMs?: number;
  maxAttempts?: number;
}

export const ingestService = {
  upload: (file: File, onProgress?: ProgressCallback): Promise<AxiosResponse<UploadResponse>> => {
    console.log('[ingestService.upload] Recibiendo file:', file?.name, 'size:', file?.size, 'type:', file?.type);
    const formData = new FormData();
    formData.append('file', file);
    console.log('[ingestService.upload] FormData creado, llamando api.post...');
    return api.post('/ingest/upload', formData, {
      onUploadProgress: (e: { loaded: number; total: number }) => {
        const pct = Math.round((e.loaded * 100) / e.total);
        onProgress?.(pct);
      }
    });
  },

  getAnalysisResult: (analysisId: string): Promise<AxiosResponse<AnalysisResult>> => {
    return api.get(`/ingest/analysis/${analysisId}`);
  },

  pollForResult: async (analysisId: string, { intervalMs = 3000, maxAttempts = 40 }: PollOptions = {}): Promise<AxiosResponse<AnalysisResult>> => {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await api.get<AnalysisResult>(`/ingest/analysis/${analysisId}`);
      const status = res.data?.status;
      if (status && status !== 'pending' && status !== 'processing') {
        return res;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error('Timeout esperando resultado del análisis ML');
  },
};

export default ingestService;
