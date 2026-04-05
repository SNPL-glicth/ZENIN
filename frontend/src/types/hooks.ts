// Tipos para hooks

// Error de API
export interface ApiError extends Error {
  response?: {
    data?: {
      message?: string;
    };
  };
}

// useAsyncData tipos
export type FetchFunction<T> = () => Promise<T>;

export interface UseAsyncDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<T>;
  setOptimistic: (newData: T) => void;
}

// usePolling tipos
export type PollFetchFunction<T> = () => Promise<T>;
export type StopCondition<T> = (data: T) => boolean;
export type PollSuccessCallback<T> = (data: T) => void;
export type PollErrorCallback = (error: ApiError) => void;
export type PollTimeoutCallback = (error: Error) => void;

export interface UsePollingOptions<T> {
  intervalMs?: number;
  maxAttempts?: number;
  stopCondition?: StopCondition<T> | null;
  onSuccess?: PollSuccessCallback<T> | null;
  onError?: PollErrorCallback | null;
  onTimeout?: PollTimeoutCallback | null;
  enabled?: boolean;
}

export interface UsePollingReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  attempts: number;
  isPolling: boolean;
  start: () => Promise<void>;
  stop: () => void;
  refetch: () => Promise<void>;
}
