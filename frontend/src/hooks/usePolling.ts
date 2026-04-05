import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PollFetchFunction,
  UsePollingOptions,
  UsePollingReturn,
  ApiError,
} from '../types/hooks';

export function usePolling<T>(
  fetchFn: PollFetchFunction<T>,
  {
    intervalMs = 3000,
    maxAttempts = 40,
    stopCondition = null,
    onSuccess = null,
    onError = null,
    onTimeout = null,
    enabled = true,
  }: UsePollingOptions<T> = {}
): UsePollingReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<number>(0);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef<number>(0);

  const stop = useCallback((): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (!enabled) {
      console.log('[usePolling] start() llamado pero enabled=false, abortando');
      return;
    }

    console.log('[usePolling] start() iniciando polling...');

    setLoading(true);
    setError(null);
    setAttempts(0);
    attemptsRef.current = 0;
    setIsPolling(true);

    const poll = async (): Promise<void> => {
      console.log(`[usePolling] poll() intento #${attemptsRef.current + 1}`);
      try {
        attemptsRef.current += 1;
        setAttempts(attemptsRef.current);

        console.log('[usePolling] Llamando fetchFn...');
        const result = await fetchFn();
        console.log('[usePolling] fetchFn resultado:', JSON.stringify(result));
        setData(result);

        const shouldStop = stopCondition ? stopCondition(result) : false;
        console.log('[usePolling] stopCondition:', shouldStop);

        if (shouldStop) {
          console.log('[usePolling] Deteniendo polling (condición de parada)');
          stop();
          setLoading(false);
          onSuccess?.(result);
          return;
        }

        if (attemptsRef.current >= maxAttempts) {
          console.log('[usePolling] Máximo intentos alcanzado, timeout');
          stop();
          setLoading(false);
          const timeoutError = new Error('Timeout esperando resultado');
          setError(timeoutError.message);
          onTimeout?.(timeoutError);
          return;
        }
      } catch (err) {
        console.error('[usePolling] Error en poll:', err);
        stop();
        setLoading(false);
        const apiErr = err as ApiError;
        const errorMsg = apiErr.response?.data?.message || apiErr.message || 'Error en polling';
        setError(errorMsg);
        onError?.(apiErr);
      }
    };

    await poll();

    if (!intervalRef.current && attemptsRef.current < maxAttempts) {
      console.log(`[usePolling] Seteando intervalo de ${intervalMs}ms`);
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
    refetch: start,
  };
}

export default usePolling;
