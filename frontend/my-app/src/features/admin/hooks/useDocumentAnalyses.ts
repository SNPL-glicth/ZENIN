import { useState, useEffect, useCallback } from 'react';
import { getDocumentAnalyses, type DocumentAnalysis } from '../services/documentAnalysisService';

interface UseDocumentAnalysesReturn {
  analyses: DocumentAnalysis[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDocumentAnalyses(
  page = 1,
  pageSize = 20,
  status?: string
): UseDocumentAnalysesReturn {
  const [analyses, setAnalyses] = useState<DocumentAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getDocumentAnalyses(page, pageSize, status);
      // Sort by analyzed date descending (most recent first)
      const sorted = data.sort((a, b) => {
        const dateA = a.analyzedAt ? new Date(a.analyzedAt).getTime() : new Date(a.createdAt).getTime();
        const dateB = b.analyzedAt ? new Date(b.analyzedAt).getTime() : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      setAnalyses(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document analyses');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, status]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  return {
    analyses,
    isLoading,
    error,
    refetch: fetchAnalyses,
  };
}
