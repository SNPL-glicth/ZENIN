import { useState } from 'react';
import { Upload as UploadIcon, File, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { documentsService } from '../services/documentsService';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const response = await documentsService.upload(selectedFile, (progress) => {
        setUploadProgress(progress);
      });
      setUploadResult(response.data);
      setUploading(false);
      
      // Start polling for analysis completion
      if (response.data.documentId) {
        pollDocumentStatus(response.data.documentId);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Error al subir el archivo');
      setUploading(false);
    }
  };

  const pollDocumentStatus = async (documentId) => {
    const maxAttempts = 20;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await documentsService.getById(documentId);
        const doc = response.data;

        if (doc.status === 'analyzed') {
          setUploadResult(prev => ({ ...prev, ...doc, status: 'analyzed' }));
          return;
        } else if (doc.status === 'error') {
          setError(doc.errorMessage || 'Error en el análisis');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    poll();
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError(null);
    setUploadProgress(0);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Subir Archivo</h1>
        <p className="text-gray-600">
          CSV, Excel, PDF, Word, JSON, imágenes, audio, logs, XML... cualquier formato
        </p>
      </div>

      {!uploadResult && (
        <div
          className={`border-2 border-dashed ${
            dragActive ? 'border-black bg-gray-50' : 'border-gray-300'
          } p-12 text-center transition-colors ${
            selectedFile ? 'bg-gray-50' : ''
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <div>
              <UploadIcon size={64} className="mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-medium mb-2">
                Arrastra cualquier archivo aquí
              </p>
              <p className="text-gray-500 mb-4">o</p>
              <label className="inline-block px-6 py-3 bg-black text-white font-medium cursor-pointer hover:bg-gray-800 transition-colors">
                Seleccionar archivo
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="*/*"
                />
              </label>
              <p className="text-sm text-gray-500 mt-4">Límite: 500MB</p>
            </div>
          ) : (
            <div>
              <File size={64} className="mx-auto mb-4 text-black" />
              <p className="text-xl font-medium mb-2">{selectedFile.name}</p>
              <p className="text-gray-600 mb-4">
                {formatFileSize(selectedFile.size)}
              </p>
              
              {!uploading && !uploadResult && (
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleUpload}
                    className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
                  >
                    Subir y Analizar
                  </button>
                  <button
                    onClick={resetUpload}
                    className="px-6 py-3 border-2 border-black font-medium hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {uploading && (
                <div>
                  <div className="w-full bg-gray-200 h-4 mb-4">
                    <div
                      className="bg-black h-4 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-600">{uploadProgress}% completado</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-6 bg-white border-2 border-red-500 p-6 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle size={24} className="text-red-600" />
            <h2 className="text-2xl font-bold text-red-600">Error</h2>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={resetUpload}
            className="px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {uploadResult && (
        <div className="mt-6 bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 mb-4">
            {uploadResult.status === 'analyzed' ? (
              <CheckCircle size={32} className="text-green-600" />
            ) : (
              <Loader size={32} className="text-black animate-spin" />
            )}
            <h2 className="text-2xl font-bold">
              {uploadResult.status === 'analyzed' ? 'Análisis Completado' : 'Analizando...'}
            </h2>
          </div>

          <div className="space-y-3 mb-6">
            <p>
              <span className="font-medium">Archivo:</span> {uploadResult.filename || selectedFile?.name}
            </p>
            <p>
              <span className="font-medium">Tipo:</span>{' '}
              <span className="bg-black text-white px-2 py-1 text-sm font-medium">
                {uploadResult.contentType}
              </span>
            </p>
            <p>
              <span className="font-medium">Estado:</span>{' '}
              <span
                className={`px-2 py-1 text-sm font-medium ${
                  uploadResult.status === 'analyzed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {uploadResult.status}
              </span>
            </p>
          </div>

          {uploadResult.status === 'processing' && (
            <p className="text-gray-600 mb-4">
              El archivo ha sido recibido. El análisis ML está en progreso...
            </p>
          )}

          {uploadResult.status === 'analyzed' && uploadResult.conclusion && (
            <div className="bg-gray-50 border-2 border-gray-300 p-4 mb-6">
              <p className="font-medium mb-2">Conclusión:</p>
              <p className="text-gray-800">{uploadResult.conclusion}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/documents/${uploadResult.documentId}`)}
              className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
            >
              Ver Resultados Completos
            </button>
            <button
              onClick={resetUpload}
              className="px-6 py-3 border-2 border-black font-medium hover:bg-gray-100 transition-colors"
            >
              Subir Otro Archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
