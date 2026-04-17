const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface Prediction {
  id: string;
  seriesId: string;
  predictedValue: number;
  confidenceScore?: number;
  confidenceLevel?: string;
  trend?: string;
  predictedAt: string;
  targetTimestamp?: string;
  isAnomaly: boolean;
  anomalyScore?: number;
  riskLevel: string;
  explanation?: string;
  engineName?: string;
  metadata?: string;
}

interface PredictionsResponse {
  predictions: Prediction[];
  total: number;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Fetch predictions for the authenticated user.
 * GET /api/predictions
 */
export async function getPredictions(limit = 20): Promise<Prediction[]> {
  const response = await fetch(`${API_URL}/api/predictions?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to fetch predictions');
  }

  const data = (await response.json()) as PredictionsResponse;
  return data.predictions;
}

/**
 * Fetch recent predictions.
 * GET /api/predictions/recent
 */
export async function getRecentPredictions(limit = 10): Promise<Prediction[]> {
  const response = await fetch(`${API_URL}/api/predictions/recent?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to fetch recent predictions');
  }

  return response.json();
}

/**
 * Get prediction trace/explanation.
 * GET /api/predictions/{id}/trace
 */
export async function getPredictionTrace(id: string): Promise<{
  id: string;
  seriesId: string;
  selectedEngine: string;
  predictedAt: string;
  explanation: string;
  phases: Array<{ kind: string; summary: string; durationMs: number }>;
  raw: {
    trend: string;
    riskLevel: string;
    severity: string;
    confidence: number;
  };
}> {
  const response = await fetch(`${API_URL}/api/predictions/${id}/trace`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to fetch prediction trace');
  }

  return response.json();
}
