import { useState, useEffect, useCallback } from 'react';

export const useAsyncData = (fetchFn, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al cargar datos');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  const setOptimistic = useCallback((newData) => {
    setData(newData);
  }, []);

  useEffect(() => {
    execute();
  }, deps);

  return { data, loading, error, refetch, setOptimistic };
};

export default useAsyncData;
