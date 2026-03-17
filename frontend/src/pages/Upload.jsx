import { useState } from 'react';
import { Upload as UploadIcon, File, CheckCircle, AlertCircle, Loader, BarChart3, FileText, Layers } from 'lucide-react';
import { ingestService } from '../services/ingestService';

const Upload = () => {
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

  const [analyzing, setAnalyzing] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setAnalyzing(false);
    setError(null);
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
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Error al procesar el archivo');
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError(null);
    setUploadProgress(0);
  };

  const classificationIcon = (cls) => {
    switch (cls) {
      case 'numeric': return <BarChart3 size={20} className="text-blue-600" />;
      case 'text': return <FileText size={20} className="text-purple-600" />;
      case 'mixed': return <Layers size={20} className="text-orange-600" />;
      default: return <File size={20} className="text-gray-600" />;
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Subir Archivo</h1>
        <p className="text-gray-600">
          CSV, Excel, PDF, Word, JSON, logs... procesamiento en memoria, sin almacenar archivos crudos.
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
              
              {!uploading && (
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
                  <div className="flex items-center justify-center gap-2">
                    <Loader size={16} className="animate-spin" />
                    <p className="text-gray-600">{uploadProgress}% — procesando en memoria...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {analyzing && (
        <div className="mt-6 bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <Loader size={24} className="animate-spin text-black" />
            <div>
              <p className="text-lg font-bold">Analizando documento...</p>
              <p className="text-gray-500 text-sm">ML Service procesando. Esto puede tardar unos segundos.</p>
            </div>
          </div>
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
        <div className="space-y-6 mt-6">
          {/* Header */}
          <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={32} className="text-green-600" />
              <h2 className="text-2xl font-bold">Análisis Completado</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Archivo</p>
                <p className="font-medium">{uploadResult.filename}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Clasificación</p>
                <div className="flex items-center gap-2 mt-1">
                  {classificationIcon(uploadResult.classification)}
                  <span className={`px-2 py-1 text-sm font-bold ${classificationColor(uploadResult.classification)}`}>
                    {uploadResult.classification?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <span className="px-2 py-1 text-sm font-medium bg-green-100 text-green-800">
                  {uploadResult.status}
                </span>
              </div>
            </div>
          </div>

          {/* Conclusion */}
          {uploadResult.conclusion && (
            <div className="bg-gray-50 border-2 border-gray-300 p-6">
              <p className="font-bold mb-2">Conclusión</p>
              <p className="text-gray-800 whitespace-pre-line">{uploadResult.conclusion}</p>
            </div>
          )}

          {/* Numeric Summary */}
          {uploadResult.numericSummary && (
            <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={20} /> Resumen Numérico
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {uploadResult.numericSummary.record_count !== undefined && (
                  <div className="text-center p-3 bg-gray-50 border">
                    <p className="text-2xl font-bold">{uploadResult.numericSummary.record_count}</p>
                    <p className="text-xs text-gray-500">Registros</p>
                  </div>
                )}
                {uploadResult.numericSummary.numeric_columns !== undefined && (
                  <div className="text-center p-3 bg-gray-50 border">
                    <p className="text-2xl font-bold">{uploadResult.numericSummary.numeric_columns}</p>
                    <p className="text-xs text-gray-500">Columnas Numéricas</p>
                  </div>
                )}
                {uploadResult.numericSummary.total_columns !== undefined && (
                  <div className="text-center p-3 bg-gray-50 border">
                    <p className="text-2xl font-bold">{uploadResult.numericSummary.total_columns}</p>
                    <p className="text-xs text-gray-500">Total Columnas</p>
                  </div>
                )}
                {uploadResult.numericSummary.total_chunks !== undefined && (
                  <div className="text-center p-3 bg-gray-50 border">
                    <p className="text-2xl font-bold">{uploadResult.numericSummary.total_chunks}</p>
                    <p className="text-xs text-gray-500">Fragmentos</p>
                  </div>
                )}
              </div>

              {uploadResult.numericSummary.columns && (
                <div className="space-y-2">
                  {Object.entries(uploadResult.numericSummary.columns).slice(0, 6).map(([col, stats]) => (
                    <div key={col} className="flex items-center gap-4 text-sm border-b pb-2">
                      <span className="font-medium w-32 truncate">{col}</span>
                      <span className="text-gray-500">min: {stats.min?.toFixed(2)}</span>
                      <span className="text-gray-500">max: {stats.max?.toFixed(2)}</span>
                      <span className="text-gray-500">avg: {stats.mean?.toFixed(2)}</span>
                      <span className="text-gray-500">std: {stats.stddev?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={resetUpload}
            className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Subir Otro Archivo
          </button>
        </div>
      )}
    </div>
  );
};

export default Upload;
