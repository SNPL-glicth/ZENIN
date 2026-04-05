import api from './api';
import { AxiosResponse } from 'axios';
import { AnalysisResult, PaginatedResponse } from '../types/services';

export interface AnalysisStats {
  total: number;
  pending: number;
  processing: number;
  analyzed: number;
  error: number;
}

export interface AnalysesResponse extends PaginatedResponse<AnalysisResult> {}

export const analysisService = {
  getAll: (page = 1, pageSize = 20): Promise<AxiosResponse<AnalysesResponse>> =>
    api.get('/ingest/analyses', { params: { page, pageSize } }),

  getStats: (): Promise<AxiosResponse<AnalysisStats>> =>
    api.get('/ingest/stats'),

  deleteAll: (): Promise<AxiosResponse<void>> =>
    api.delete('/ingest/analyses'),
};

export default analysisService;
