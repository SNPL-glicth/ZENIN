import { useCallback, RefObject } from 'react';
import { Paperclip, Send, X, File } from 'lucide-react';

interface ChatInputProps {
  selectedFile: File | null;
  uploading: boolean;
  analyzing: boolean;
  onFileSelect: (file: File | null) => void;
  onSend: () => void;
  onCancel: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  isMobile?: boolean;
}

export const ChatInput = ({
  selectedFile,
  uploading,
  analyzing,
  onFileSelect,
  onSend,
  onCancel,
  inputRef,
  isMobile = false,
}: ChatInputProps): React.ReactElement => {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const isDisabled = uploading || analyzing || (!selectedFile && !uploading);

console.log('[ChatInput] rendering with analyzing:', analyzing);

  return (
    <div
      className="border-t border-gray-200 bg-white p-4"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {selectedFile && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 border rounded">
          <File size={16} className="text-gray-500" />
          <span className="text-sm font-medium flex-1 truncate">{selectedFile.name}</span>
          {!uploading && !analyzing && (
            <button
              onClick={() => onFileSelect(null)}
              className="p-1 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <div className={`flex items-center gap-2 ${isMobile && analyzing ? 'flex-wrap' : ''}`}>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="*/*"
        />

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || analyzing}
          className="p-2 md:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Paperclip size={isMobile ? 18 : 20} />
        </button>

        <div className="flex-1 text-sm text-gray-500 px-2 md:px-3 min-w-0">
          <span className="block truncate">
            {selectedFile 
              ? (isMobile ? 'Listo' : 'Listo para enviar') 
              : (isMobile ? 'Adjunta archivo' : 'Adjunta un archivo o arrástralo aquí')
            }
          </span>
        </div>

        <button
          onClick={onSend}
          disabled={isDisabled}
          className="p-2 md:p-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {uploading ? (
            <span className="text-xs md:text-sm">Subiendo...</span>
          ) : analyzing ? (
            <span className="text-xs md:text-sm">Analizando...</span>
          ) : (
            <Send size={isMobile ? 18 : 20} />
          )}
        </button>

        {analyzing && (
          <button
            onClick={onCancel}
            className={`px-3 md:px-4 py-2 md:py-3 bg-red-500 text-white hover:bg-red-600 font-medium text-xs md:text-sm rounded ${isMobile ? 'w-full order-last mt-1' : ''}`}
            type="button"
          >
            ✕ {isMobile ? 'Cancelar' : 'Cancelar'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
