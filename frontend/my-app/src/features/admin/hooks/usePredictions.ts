import { useState, useEffect, useCallback } from 'react';
import { getPredictions, type Prediction } from '../services/predictionService';

interface UsePredictionsReturn {
  predictions: Prediction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePredictions(limit = 20): UsePredictionsReturn {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getPredictions(limit);
      // Sort by date descending (most recent first)
      const sorted = data.sort((a, b) => 
        new Date(b.predictedAt).getTime() - new Date(a.predictedAt).getTime()
      );
      setPredictions(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load predictions');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return {
    predictions,
    isLoading,
    error,
    refetch: fetchPredictions,
  };
}
