import api from './api';
import { AxiosResponse } from 'axios';

export interface QueryRequest {
  question: string;
}

export interface QueryResponse {
  answer: string;
  sources?: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  confidence?: number;
}

export const queryService = {
  ask: (question: string): Promise<AxiosResponse<QueryResponse>> =>
    api.post('/query', { question }),
};

export default queryService;
