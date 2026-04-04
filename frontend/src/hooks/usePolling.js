import { useState, useEffect, useCallback, useRef } from 'react';

export const usePolling = (fetchFn, {
  intervalMs = 3000,
  maxAttempts = 40,
  stopCondition = null,
  onSuccess = null,
  onError = null,
  onTimeout = null,
  enabled = true
} = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef(null);
  const attemptsRef = useRef(0);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const start = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    setAttempts(0);
    attemptsRef.current = 0;
    setIsPolling(true);

    const poll = async () => {
      try {
        attemptsRef.current += 1;
        setAttempts(attemptsRef.current);

        const result = await fetchFn();
        setData(result);

        const shouldStop = stopCondition ? stopCondition(result) : false;

        if (shouldStop) {
          stop();
          setLoading(false);
          onSuccess?.(result);
          return;
        }

        if (attemptsRef.current >= maxAttempts) {
          stop();
          setLoading(false);
          const timeoutError = new Error('Timeout esperando resultado');
          setError(timeoutError.message);
          onTimeout?.(timeoutError);
          return;
        }
      } catch (err) {
        stop();
        setLoading(false);
        const errorMsg = err.response?.data?.message || err.message || 'Error en polling';
        setError(errorMsg);
        onError?.(err);
      }
    };

    // Primera ejecución inmediata
    await poll();

    // Continuar con intervalo si sigue polling
    if (!intervalRef.current && attemptsRef.current < maxAttempts) {
      intervalRef.current = setInterval(poll, intervalMs);
    }
  }, [fetchFn, intervalMs, maxAttempts, stopCondition, onSuccess, onError, onTimeout, enabled, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    data,
    loading,
    error,
    attempts,
    isPolling,
    start,
    stop,
    refetch: start
  };
};

export default usePolling;
