import { useState, useEffect, useRef } from 'react';
import { Upload as UploadIcon, File, CheckCircle, AlertCircle, Loader, X, Trash2 } from 'lucide-react';
import { ingestService } from '../services/ingestService';
import { documentsService } from '../services/documentsService';

const Uploads = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentsService.list(1);
      setFiles(response.data || []);
    } catch (err) {
      console.error('Error loading files:', err);
      setError(err.response?.data?.message || 'Error al cargar archivos');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setAnalyzing(false);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const response = await ingestService.upload(selectedFile, (progress) => {
        setUploadProgress(progress);
      });
      const data = response.data;

      if (data.status === 'pending' || data.status === 'processing') {
        setUploading(false);
        setAnalyzing(true);
        const pollResult = await ingestService.pollForResult(data.analysisId);
        setUploadResult(pollResult.data);
        setAnalyzing(false);
      } else {
        setUploadResult(data);
        setUploading(false);
      }
      
      loadFiles();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.response?.data?.error || err.response?.data?.message || err.message || 'Error al procesar');
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadError(null);
    setUploadProgress(0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusColor = (status) => {
    switch (status) {
      case 'analyzed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const classificationColor = (cls) => {
    switch (cls) {
      case 'numeric': return 'bg-blue-100 text-blue-800';
      case 'text': return 'bg-purple-100 text-purple-800';
      case 'mixed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando archivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Uploads</h1>
        <p className="text-gray-600">Todos tus archivos subidos e historial</p>
      </div>

      {/* Upload Section */}
      <div className="mb-8 bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <UploadIcon size={20} /> Subir Nuevo Archivo
        </h2>

        {!uploadResult ? (
          <div>
            <div
              className={`border-2 border-dashed ${
                dragActive ? 'border-black bg-gray-50' : 'border-gray-300'
              } p-6 text-center transition-colors rounded`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {!selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <UploadIcon size={32} className="text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Arrastra un archivo o{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
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
                    onChange={handleFileChange}
                    accept="*/*"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <File size={24} className="text-black flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>

                  {!uploading && !analyzing && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={handleUpload}
                        className="px-4 py-2 bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                      >
                        Subir y Analizar
                      </button>
                      <button
                        onClick={resetUpload}
                        className="p-2 border-2 border-black hover:bg-gray-100 transition-colors"
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
            </div>

            {uploadError && (
              <div className="mt-3 p-3 border-2 border-red-400 bg-red-50 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{uploadError}</p>
                <button onClick={resetUpload} className="ml-auto text-xs font-bold underline text-red-600">
                  Reintentar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle size={24} className="text-green-600" />
              <div>
                <p className="font-bold">{uploadResult.filename}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-bold ${classificationColor(uploadResult.classification)}`}>
                    {uploadResult.classification?.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                    {uploadResult.status}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={resetUpload}
              className="text-sm px-4 py-2 bg-black text-white font-bold hover:bg-gray-800 transition-colors"
            >
              Subir Otro Archivo
            </button>
          </div>
        )}
      </div>

      {/* Files History */}
      <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-lg font-bold mb-4">Historial de Archivos</h2>
        
        {error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadFiles}
              className="px-4 py-2 bg-black text-white font-bold hover:bg-gray-800"
            >
              Reintentar
            </button>
          </div>
        ) : files.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">Sin archivos subidos</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-4 p-3 border-2 border-gray-200 hover:border-black transition-colors"
              >
                <File size={20} className="text-black flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.originalFilename}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{formatFileSize(file.fileSizeBytes)}</span>
                    <span>•</span>
                    <span>{file.contentType}</span>
                    <span>•</span>
                    <span>{formatDate(file.uploadedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-1 text-xs font-bold ${statusColor(file.status)}`}>
                    {file.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Uploads;
