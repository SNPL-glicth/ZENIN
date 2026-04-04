export const LoadingSpinner = ({ size = 'md', text = null, className = '' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-b-2',
    lg: 'h-16 w-16 border-4'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full border-black animate-spin`}
      ></div>
      {text && (
        <p className={`${textSizes[size]} text-gray-600 mt-4`}>{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
