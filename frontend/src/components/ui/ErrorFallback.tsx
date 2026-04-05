export interface ErrorFallbackProps {
  error: string;
  retry?: (() => void) | null;
  className?: string;
}

export const ErrorFallback = ({ error, retry, className = '' }: ErrorFallbackProps): React.ReactElement => {
  return (
    <div
      className={`bg-white border-2 border-red-500 p-6 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] ${className}`}
    >
      <p className="text-red-600 font-medium">{error}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-4 px-4 py-2 bg-black text-white font-bold hover:bg-gray-800"
        >
          Reintentar
        </button>
      )}
    </div>
  );
};

export default ErrorFallback;
