import { useRef, useCallback } from 'react';
import { Upload as UploadIcon, File, Loader, X } from 'lucide-react';
import { formatFileSize } from '../../utils/formatters';
import { classificationColor } from '../../utils/statusColors';
import { StatusBadge } from '../../components/ui';

export const UploadZone = ({
  dragActive,
  selectedFile,
  uploading,
  uploadProgress,
  analyzing,
  uploadError,
  onDrag,
  onDrop,
  onFileChange,
  onUpload,
  onReset,
  fileInputRef
}) => {
  const handleSelectClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  return (
    <div
      className={`border-2 border-dashed ${
        dragActive ? 'border-black bg-gray-50' : 'border-gray-300'
      } p-6 text-center transition-colors rounded`}
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
    >
      {!selectedFile ? (
        <div className="flex flex-col items-center gap-2">
          <UploadIcon size={32} className="text-gray-400" />
          <p className="text-sm text-gray-600">
            Arrastra un archivo o{' '}
            <button
              onClick={handleSelectClick}
              className="font-bold text-black underline hover:no-underline"
            >
              selecciona uno
            </button>
          </p>
          <p className="text-xs text-gray-500">CSV, Excel, PDF, Word, JSON, TXT — hasta 500MB</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onFileChange}
            accept="*/*"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <File size={24} className="text-black flex-shrink-0" />
            <div className="min-w-0 text-left">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>

          {!uploading && !analyzing && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  console.log('[UploadZone] Botón Subir y Analizar clickeado!');
                  console.log('[UploadZone] onUpload prop:', onUpload);
                  onUpload?.();
                }}
                className="px-4 py-2 bg-black text-white text-sm font-bold hover:bg-gray-800"
              >
                Subir y Analizar
              </button>
              <button
                onClick={onReset}
                className="p-2 border-2 border-black hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-32 bg-gray-200 h-2 rounded">
                <div className="bg-black h-2 rounded transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <Loader size={16} className="animate-spin" />
              <span className="text-xs text-gray-600">{uploadProgress}%</span>
            </div>
          )}

          {analyzing && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Loader size={16} className="animate-spin" />
              <span className="text-xs font-medium text-gray-700">Analizando...</span>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <div className="mt-3 p-3 border-2 border-red-400 bg-red-50 flex items-center gap-2 text-left">
          <p className="text-sm text-red-700 flex-1">{uploadError}</p>
          <button onClick={onReset} className="text-xs font-bold underline text-red-600">
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
