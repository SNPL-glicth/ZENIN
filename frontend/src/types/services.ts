// Tipos compartidos para servicios

// Callbacks
export type ProgressCallback = (percentage: number) => void;

// Parámetros comunes
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface DateRangeParams {
  from?: string | null;
  to?: string | null;
}

// Respuestas genéricas de Axios (se extienden según el endpoint)
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
}

// Tipos para upload de archivos
export interface UploadProgressEvent {
  loaded: number;
  total: number;
}

// Respuesta de análisis (usada por ingest y analysis)
export interface AnalysisResult {
  id: string;
  status: 'pending' | 'processing' | 'analyzed' | 'error';
  filename?: string;
  [key: string]: unknown;
}

// Respuesta paginada genérica
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Predicción
export interface Prediction {
  id: string;
  seriesId: string;
  predictedValue: number;
  timestamp: string;
  confidence: number;
  trend?: string;
  selectedEngine?: string;
  riskLevel?: string;
  severity?: string;
  explanation?: string;
  explanationJson?: string;
  metadata?: object;
  regime?: string;
  isAnomaly?: boolean;
  anomalyScore?: number;
  predictedAt?: string;
  targetTimestamp?: string;
  horizonMinutes?: number;
  [key: string]: unknown;
}

// Anomalía
export interface Anomaly {
  id: string;
  seriesId: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  detectedAt?: string;
  anomalyScore?: number;
  anomalyConfidence?: number;
  methodVotes?: Record<string, number>;
  explanation?: string;
  auditTraceId?: string;
  [key: string]: unknown;
}

// Health/Metrics
export interface MLHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  [key: string]: unknown;
}

export interface MLMetrics {
  totalPredictions: number;
  totalAnomalies: number;
  [key: string]: unknown;
}

// Dashboard
export interface DashboardOverview {
  recentAnalyses: AnalysisResult[];
  stats: {
    total: number;
    pending: number;
    analyzed: number;
  };
}

export interface MetricsSummary {
  predictions: number;
  anomalies: number;
  accuracy: number;
}

export interface ChartData {
  labels: string[];
  data: number[];
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}
