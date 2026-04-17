import { useRef } from 'react';

interface FileUploadButtonProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

/**
 * FileUploadButton - Clip icon button for file attachment.
 *
 * Opens native file picker and stores file for manual send.
 * File is NOT auto-uploaded - user must click send.
 */
export function FileUploadButton({
  onFileSelect,
  disabled,
}: FileUploadButtonProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = (): void => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    e.target.value = '';
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-gray-400 transition-colors hover:border-purple-600 hover:text-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
      title="Adjuntar archivo"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
        />
      </svg>
      <input
        ref={inputRef}
        type="file"
        onChange={handleChange}
        className="hidden"
      />
    </button>
  );
}
