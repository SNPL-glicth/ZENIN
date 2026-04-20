const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface DocumentAnalysis {
  id: string;
  originalFilename: string;
  fileExtension: string;
  fileSizeBytes: number;
  classification: string;  // text | numeric | mixed
  status: string;  // pending | processing | analyzed | error
  conclusion?: string;
  mlResult?: string;  // JSON string with confidence, domain, entities
  semanticName?: string;
  mlDocId?: string;
  analyzedAt?: string;
  createdAt: string;
}

interface DocumentAnalysesResponse {
  analyses: DocumentAnalysis[];
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
 * Fetch ML analysis results for documents (text/numeric/mixed).
 * GET /api/documents/analyses
 * Note: This is separate from /api/predictions which is for IoT sensors.
 */
export async function getDocumentAnalyses(
  page = 1,
  pageSize = 20,
  status?: string
): Promise<DocumentAnalysis[]> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (status) params.append('status', status);

  const response = await fetch(`${API_URL}/api/documents/analyses?${params}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to fetch document analyses');
  }

  const data = (await response.json()) as DocumentAnalysesResponse;
  return data.analyses;
}
