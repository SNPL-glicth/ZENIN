const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Document Analysis interface (replaces IoT Prediction)
export interface Prediction {
  id: string;
  originalFilename: string;
  fileExtension: string;
  fileSizeBytes: number;
  classification: string;  // text | numeric | mixed
  status: string;  // pending | processing | analyzed | error
  conclusion?: string;
  mlResult?: string;  // JSON string with full ML analysis (kept for backward compatibility)
  semanticName?: string;
  mlDocId?: string;
  analyzedAt?: string;  // Date when ML analysis completed
  predictedAt: string;  // Maps to analyzedAt or createdAt for backward compatibility
  createdAt: string;
  
  // Extracted from MlResult JSON by backend for frontend convenience
  confidence?: number;
  domain?: string;
  riskLevel: string;  // HIGH | MEDIUM | LOW | NONE
  severity: string;  // critical | warning | info
  urgencyScore: number;
  sentimentLabel: string;  // positive | negative | neutral
  pattern: string;
  actionRequired: boolean;
  actions: string[];
  entities: string[];
}

interface PredictionsResponse {
  analyses: Prediction[];
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
 * Fetch document analyses for the authenticated user.
 * GET /api/documents/analyses
 * Note: Replaces /api/predictions (IoT sensors) with document ML analysis.
 */
export async function getPredictions(limit = 20): Promise<Prediction[]> {
  const response = await fetch(`${API_URL}/api/documents/analyses?page=1&pageSize=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to fetch predictions');
  }

  const data = (await response.json()) as PredictionsResponse;
  // Map analyses to Prediction interface for backward compatibility with UI
  return data.analyses.map(a => ({
    ...a,
    predictedAt: a.analyzedAt || a.createdAt,  // Map for date sorting
  }));
}

/**
 * Fetch recent document analyses.
 * GET /api/documents/analyses (sorted by most recent)
 */
export async function getRecentPredictions(limit = 10): Promise<Prediction[]> {
  const response = await fetch(`${API_URL}/api/documents/analyses?page=1&pageSize=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to fetch recent predictions');
  }

  const data = (await response.json()) as PredictionsResponse;
  return data.analyses.map(a => ({
    ...a,
    predictedAt: a.analyzedAt || a.createdAt,
  }));
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

/**
 * Delete document and its analysis.
 * DELETE /api/documents/{id}
 */
export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/documents/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to delete document');
  }
}

/**
 * Delete analysis only.
 * DELETE /api/documents/analyses/{id}
 */
export async function deleteAnalysis(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/documents/analyses/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to delete analysis');
  }
}

/**
 * Bulk delete analyses.
 * DELETE /api/documents/analyses/bulk
 */
export async function bulkDeleteAnalyses(ids: string[]): Promise<void> {
  const response = await fetch(`${API_URL}/api/documents/analyses/bulk`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to bulk delete analyses');
  }
}

/**
 * Delete prediction.
 * DELETE /api/predictions/{id}
 */
export async function deletePrediction(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/predictions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to delete prediction');
  }
}

/**
 * Bulk delete predictions.
 * DELETE /api/predictions/bulk
 */
export async function bulkDeletePredictions(ids: string[]): Promise<void> {
  const response = await fetch(`${API_URL}/api/predictions/bulk`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to bulk delete predictions');
  }
}
