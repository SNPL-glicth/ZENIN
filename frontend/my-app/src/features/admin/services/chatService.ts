const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface QueryResponse {
  answer?: string;
  error?: string;
}

interface UploadResponse {
  analysisId: string;
  queueId: string;
  status: string;
}

interface AnalysisResult {
  analysisId: string;
  filename: string;
  status: string;
  conclusion?: string;
  mlResult?: unknown;
  textSummary?: unknown;
  numericSummary?: unknown;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function getAuthHeadersMultipart(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Send a text query to the cognitive backend.
 * POST /api/query
 */
export async function sendMessage(message: string): Promise<QueryResponse> {
  const response = await fetch(`${API_URL}/api/query`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ question: message }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Query failed');
  }

  return response.json();
}

/**
 * Upload a file to the ingestion pipeline.
 * POST /api/ingest/upload
 * Returns immediately with pending status; caller must poll analysis/{id}.
 */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/ingest/upload`, {
    method: 'POST',
    headers: getAuthHeadersMultipart(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Upload failed');
  }

  return response.json();
}

/**
 * Poll for analysis result.
 * GET /api/ingest/analysis/{id}
 */
export async function getAnalysisResult(analysisId: string): Promise<AnalysisResult> {
  const response = await fetch(`${API_URL}/api/ingest/analysis/${analysisId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to get analysis');
  }

  return response.json();
}
