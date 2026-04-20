const METRICS_API_URL = import.meta.env.VITE_METRICS_API_URL || 'http://localhost:4423';

export interface MetricsSummary {
  totalDocuments: number;
  bySeverity: { critical: number; warning: number; info: number };
  byDomain: Record<string, number>;
  avgConfidence: number;
  avgUrgency: number;
  documentsWithAnomalies: number;
  lastAnalyzedAt: string | null;
}

export interface TimelineDataPoint {
  date: string;
  avgUrgency: number;
  critical: number;
  warning: number;
  info: number;
}

export interface TopDocument {
  id: string;
  filename: string;
  score: number;
  severity: string;
  urgency: number;
  confidence: number;
  domain: string;
  analyzedAt: string;
  conclusion: string;
}

export interface DomainMetric {
  domain: string;
  count: number;
  avgUrgency: number;
  criticalCount: number;
}

/**
 * Get metrics summary
 * GET /metrics/summary?tenantId={id}
 */
export async function getMetricsSummary(tenantId: string): Promise<MetricsSummary> {
  const response = await fetch(`${METRICS_API_URL}/metrics/summary?tenantId=${tenantId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch metrics summary');
  }
  
  return response.json();
}

/**
 * Get timeline metrics
 * GET /metrics/timeline?tenantId={id}&days=30
 */
export async function getMetricsTimeline(tenantId: string, days: number = 30): Promise<TimelineDataPoint[]> {
  const response = await fetch(`${METRICS_API_URL}/metrics/timeline?tenantId=${tenantId}&days=${days}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch metrics timeline');
  }
  
  return response.json();
}

/**
 * Get top documents
 * GET /metrics/top-documents?tenantId={id}&limit=10
 */
export async function getTopDocuments(tenantId: string, limit: number = 10): Promise<TopDocument[]> {
  const response = await fetch(`${METRICS_API_URL}/metrics/top-documents?tenantId=${tenantId}&limit=${limit}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch top documents');
  }
  
  return response.json();
}

/**
 * Get domain metrics
 * GET /metrics/domains?tenantId={id}
 */
export async function getDomainMetrics(tenantId: string): Promise<DomainMetric[]> {
  const response = await fetch(`${METRICS_API_URL}/metrics/domains?tenantId=${tenantId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch domain metrics');
  }
  
  return response.json();
}
