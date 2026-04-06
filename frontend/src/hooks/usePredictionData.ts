import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface Prediction {
  id: string;
  seriesId: string;
  predictedValue: number;
  confidence: number;
  trend: string;
  selectedEngine: string;
  riskLevel: string;
  severity: string;
  explanation?: string;
  explanationJson?: string;
  metadata?: string;
  regime: string;
  isAnomaly: boolean;
  anomalyScore: number;
  predictedAt: string;
  targetTimestamp?: string;
  horizonMinutes: number;
}

export interface Anomaly {
  id: string;
  seriesId: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  detectedAt: string;
  anomalyScore?: number;
  anomalyConfidence?: number;
  methodVotes?: Record<string, number>;
  explanation?: string;
  auditTraceId?: string;
}

export interface Pattern {
  id: string;
  seriesId: string;
  patternType: string;
  confidence: number;
  description?: string;
  detectedAt: string;
  startTimestamp: string;
  endTimestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface UsePredictionDataReturn {
  predictions: Prediction[];
  anomalies: Anomaly[];
  patterns: Pattern[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  getPredictionsBySeries: (seriesId: string) => Promise<Prediction[]>;
  getRecentPredictions: (limit?: number) => Promise<Prediction[]>;
  getAnomalies: () => Promise<Anomaly[]>;
}

export function usePredictionData(): UsePredictionDataReturn {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recent predictions from .NET Backend
  const getRecentPredictions = useCallback(async (limit: number = 20): Promise<Prediction[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/predictions/recent?limit=${limit}`);
      const data = response.data || [];
      
      setPredictions(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch predictions';
      setError(errorMessage);
      console.error('[usePredictionData] Error fetching predictions:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch predictions by series ID
  const getPredictionsBySeries = useCallback(async (seriesId: string): Promise<Prediction[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/predictions?seriesId=${seriesId}&pageSize=50`);
      const data = response.data?.predictions || [];
      
      setPredictions(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch series predictions';
      setError(errorMessage);
      console.error('[usePredictionData] Error fetching series predictions:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch anomalies from .NET Backend
  const getAnomalies = useCallback(async (): Promise<Anomaly[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/anomalies');
      const data = response.data?.anomalies || [];
      
      setAnomalies(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch anomalies';
      setError(errorMessage);
      console.error('[usePredictionData] Error fetching anomalies:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch patterns from .NET Backend (if available)
  const getPatterns = useCallback(async (): Promise<Pattern[]> => {
    try {
      const response = await api.get('/api/patterns');
      const data = response.data?.patterns || [];
      
      setPatterns(data);
      return data;
    } catch (err) {
      console.warn('[usePredictionData] Patterns endpoint not available:', err);
      return [];
    }
  }, []);

  // Combined refetch function
  const refetch = useCallback(async () => {
    await Promise.all([
      getRecentPredictions(),
      getAnomalies(),
      getPatterns(),
    ]);
  }, [getRecentPredictions, getAnomalies, getPatterns]);

  // Initial fetch on mount
  useEffect(() => {
    refetch();
    
    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refetch]);

  return {
    predictions,
    anomalies,
    patterns,
    loading,
    error,
    refetch,
    getPredictionsBySeries,
    getRecentPredictions,
    getAnomalies,
  };
}
