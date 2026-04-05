import { useState, useEffect, useCallback, DependencyList } from 'react';
import { FetchFunction, UseAsyncDataReturn, ApiError } from '../types/hooks';

export function useAsyncData<T>(
  fetchFn: FetchFunction<T>,
  deps: DependencyList = []
): UseAsyncDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
      return result;
    } catch (err) {
      const apiErr = err as ApiError;
      const errorMsg = apiErr.response?.data?.message || apiErr.message || 'Error al cargar datos';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  const refetch = useCallback((): Promise<T> => {
    return execute();
  }, [execute]);

  const setOptimistic = useCallback((newData: T): void => {
    setData(newData);
  }, []);

  useEffect(() => {
    execute();
  }, deps);

  return { data, loading, error, refetch, setOptimistic };
}

export default useAsyncData;
