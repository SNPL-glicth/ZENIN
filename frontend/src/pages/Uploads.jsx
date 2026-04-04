import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload as UploadIcon } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePolling } from '../hooks/usePolling';
import { ingestService } from '../services/ingestService';
import { documentsService } from '../services/documentsService';
import { UploadZone, FileHistory, UploadResult } from '../components/sections';
import { Card, LoadingSpinner, ErrorFallback } from '../components/ui';

const STORAGE_KEY = 'zenin_pending_analysis';

const Uploads = () => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [pendingAnalysisId, setPendingAnalysisId] = useState(null);

  const {
    data: files,
    loading: filesLoading,
    error: filesError,
    refetch: loadFiles
  } = useAsyncData(() => documentsService.list(1).then(r => r.data));

  // BUG FIX 3: Memorizar fetchFn para evitar loop infinito en usePolling
  const fetchAnalysisResult = useCallback(
    (analysisId) => () => ingestService.getAnalysisResult(analysisId).then(r => r.data),
    []
  );

  const {
    start: startPolling,
    stop: stopPolling,
    loading: analyzing,
    error: pollError
  } = usePolling(
    fetchAnalysisResult,
    {
      stopCondition: (data) => data?.status !== 'pending' && data?.status !== 'processing',
      onSuccess: (data) => {
        setUploadResult(data);
        setPendingAnalysisId(null);
        sessionStorage.removeItem(STORAGE_KEY);
        loadFiles();
      },
      onError: (err) => {
        setUploadError(err.message || 'Error en análisis');
        setPendingAnalysisId(null);
        sessionStorage.removeItem(STORAGE_KEY);
      },
      onTimeout: () => {
        setUploadError('El análisis está tardando demasiado. El ML puede estar saturado o no disponible. Inténtalo de nuevo más tarde.');
        setPendingAnalysisId(null);
        sessionStorage.removeItem(STORAGE_KEY);
      },
      enabled: false
    }
  );

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[handleDrag] Evento drag:', e.type);
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[handleDrop] Drop detectado, files:', e.dataTransfer.files);
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      console.log('[handleDrop] Archivo seleccionado:', e.dataTransfer.files[0].name);
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadResult(null);
      setUploadError(null);
    } else {
      console.log('[handleDrop] ERROR: No hay archivo en dataTransfer');
    }
  }, []);

  const handleFileChange = useCallback((e) => {
    console.log('[handleFileChange] Evento change, files:', e.target.files);
    if (e.target.files?.[0]) {
      console.log('[handleFileChange] Archivo seleccionado:', e.target.files[0].name);
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
      setUploadError(null);
    } else {
      console.log('[handleFileChange] ERROR: No hay archivo seleccionado');
    }
  }, []);

  const resetUpload = useCallback(() => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadError(null);
    setUploadProgress(0);
    setPendingAnalysisId(null);
    sessionStorage.removeItem(STORAGE_KEY);
    stopPolling();
  }, [stopPolling]);

  const handleUpload = useCallback(async () => {
    console.log('[handleUpload] Iniciando upload, selectedFile:', selectedFile);
    if (!selectedFile) {
      console.log('[handleUpload] ERROR: selectedFile es null/undefined, cancelando');
      return;
    }
    setUploadError(null);
    setUploadProgress(0);

    try {
      console.log('[handleUpload] Llamando ingestService.upload...');
      const response = await ingestService.upload(selectedFile, setUploadProgress);
      console.log('[handleUpload] Respuesta recibida:', response);
      const data = response.data;

      if (data.status === 'pending' || data.status === 'processing') {
        setPendingAnalysisId(data.analysisId);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          analysisId: data.analysisId,
          filename: data.filename,
          timestamp: Date.now()
        }));
        startPolling(data.analysisId);
      } else {
        setUploadResult(data);
        loadFiles();
      }
    } catch (err) {
      console.log('[handleUpload] ERROR en catch:', err);
      console.log('[handleUpload] Error response:', err.response);
      setUploadError(err.response?.data?.error || err.message || 'Error al procesar');
    }
  }, [selectedFile, startPolling, loadFiles]);

  // BUG FIX 2: Recuperar estado pendiente de sessionStorage al montar
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { analysisId, filename, timestamp } = JSON.parse(saved);
        const ageMs = Date.now() - timestamp;
        const maxAgeMs = 10 * 60 * 1000; // 10 minutos máximo

        if (ageMs < maxAgeMs && analysisId) {
          setPendingAnalysisId(analysisId);
          setSelectedFile({ name: filename || 'Archivo pendiente' });
          startPolling(analysisId);
        } else {
          // Expirado, limpiar
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [startPolling]);

  if (filesLoading) return <LoadingSpinner size="md" text="Cargando archivos..." className="h-64" />;
  if (filesError) return <ErrorFallback error={filesError} retry={loadFiles} />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Uploads</h1>
        <p className="text-gray-600">Sube archivos y consulta tu historial</p>
      </div>

      {!uploadResult ? (
        <Card title="Subir Nuevo Archivo" icon={UploadIcon} className="mb-8">
          <UploadZone
            dragActive={dragActive}
            selectedFile={selectedFile}
            uploading={uploadProgress > 0 && uploadProgress < 100}
            uploadProgress={uploadProgress}
            analyzing={analyzing}
            uploadError={uploadError || pollError}
            onDrag={handleDrag}
            onDrop={handleDrop}
            onFileChange={handleFileChange}
            onUpload={handleUpload}
            onReset={resetUpload}
            fileInputRef={fileInputRef}
          />
        </Card>
      ) : (
        <div className="mb-8">
          <UploadResult result={uploadResult} onReset={resetUpload} />
        </div>
      )}

      <FileHistory files={files || []} error={filesError} onRetry={loadFiles} />
    </div>
  );
};

export default Uploads;
