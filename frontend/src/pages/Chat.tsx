import { useState, useRef, useCallback, useEffect } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { ChatMessage, ChatMessageData } from '../components/chat/ChatMessage';
import { ChatInput } from '../components/chat/ChatInput';
import { usePolling } from '../hooks/usePolling';
import { ingestService, UploadResponse } from '../services/ingestService';
import { analysisService } from '../services/analysisService';
import { AnalysisResult } from '../types/services';

const STORAGE_KEY = 'zenin_chat_messages';

const Chat = (): React.ReactElement => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const pendingIdRef = useRef<string | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load history
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatMessageData[];
        setMessages(parsed);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }

    analysisService.getAll(1, 50).then((res) => {
      // Backend .NET usa PascalCase: { Analyses: [...], TotalCount, Page, PageSize }
      const responseData = res.data as { Analyses?: Array<Record<string, unknown>>; items?: Array<Record<string, unknown>> };
      const analyses = responseData.Analyses || responseData.items || [];
      const historyMessages: ChatMessageData[] = analyses
        .filter((a) => (a.Status || a.status) === 'analyzed')
        .map((a): ChatMessageData => ({
          id: `hist-${a.Id || a.id}`,
          type: 'user',
          content: (a.Conclusion || a.conclusion || '') as string,
          filename: (a.Filename || a.filename || 'Archivo') as string,
          timestamp: new Date((a.CreatedAt || a.uploadedAt || Date.now()) as string).getTime(),
        }))
        .slice(0, 20);

      if (historyMessages.length > 0 && messages.length === 0) {
        setMessages(historyMessages);
      }
    });
  }, []);
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteAll = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
    setMenuOpen(false);
  }, []);

  const handleDeleteMessage = useCallback((msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  }, []);
  useEffect(() => {
    const bc = new BroadcastChannel('zenin_analysis_complete');
    bc.onmessage = (e: MessageEvent<{ type?: string; analysisId?: string }>) => {
      if (e.data?.type === 'ANALYSIS_COMPLETE' && e.data.analysisId === pendingIdRef.current) {
        stopPolling();
      }
    };
    return () => bc.close();
  }, []);

  const fetchResult = useCallback(async (): Promise<AnalysisResult> => {
    const id = pendingIdRef.current;
    console.log('[Chat.fetchResult] Obteniendo resultado para analysisId:', id);
    if (!id) {
      console.error('[Chat.fetchResult] ERROR: No hay pendingIdRef.current');
      throw new Error('No pending analysis');
    }
    console.log('[Chat.fetchResult] Llamando GET /ingest/analysis/' + id);
    const res = await ingestService.getAnalysisResult(id);
    console.log('[Chat.fetchResult] Respuesta:', JSON.stringify(res.data));
    return res.data;
  }, []);

  const { start: startPolling, stop: stopPolling, loading: analyzing } = usePolling(
    fetchResult,
    {
      stopCondition: (data: AnalysisResult) =>
        data?.status !== 'pending' && data?.status !== 'processing',
      onSuccess: (data: Record<string, unknown>) => {
        const typedData = data as { 
          analysisId?: string;
          id?: string;
          conclusion?: string;
          filename?: string;
          classification?: string;
          status?: string;
          mlResult?: { sentimentLabel?: string; urgencyScore?: number; };
        };
        const id = typedData.analysisId || typedData.id || 'unknown';

        const systemMsg: ChatMessageData = {
          id: `sys-${id}`,
          type: 'system' as const,
          content: typedData.conclusion || 'Análisis completado',
          filename: typedData.filename,
          classification: typedData.classification,
          status: typedData.status,
          urgency: typedData.mlResult?.urgencyScore,
          sentiment: typedData.mlResult?.sentimentLabel,
          timestamp: Date.now(),
        };
        setMessages((prev) => prev.filter((m) => !m.isTyping).concat(systemMsg));
        pendingIdRef.current = null;
        setSelectedFile(null);

        const bc = new BroadcastChannel('zenin_analysis_complete');
        bc.postMessage({ type: 'ANALYSIS_COMPLETE', analysisId: typedData.analysisId || id });
        bc.close();
      },
      onTimeout: () => {
        setMessages((prev) =>
          prev
            .filter((m) => !m.isTyping)
            .concat({
              id: `error-${Date.now()}`,
              type: 'system' as const,
              content: 'El análisis tardó demasiado. Inténtalo de nuevo más tarde.',
              timestamp: Date.now(),
            })
        );
        pendingIdRef.current = null;
      },
      enabled: true,
    }
  );

  const handleSend = useCallback(async () => {
    if (!selectedFile || uploading || analyzing || isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    setUploading(true);
    const userMsg: ChatMessageData = {
      id: `user-${Date.now()}`,
      type: 'user' as const,
      content: '',
      filename: selectedFile.name,
      timestamp: Date.now(),
    };
    setMessages((prev) => prev.concat(userMsg));

    try {
      console.log('[Chat] Iniciando upload...');
      const res = await ingestService.upload(selectedFile);
      const data = res.data as UploadResponse;
      
      console.log('[Chat] Upload response data:', JSON.stringify(data));
      console.log('[Chat] analysisId:', data.analysisId);
      console.log('[Chat] status:', data.status);

      if (data.status === 'pending' || data.status === 'processing') {
        console.log('[Chat] Status es pending/processing, preparando polling...');
        pendingIdRef.current = data.analysisId;
        console.log('[Chat] pendingIdRef seteado a:', pendingIdRef.current);
        
        const typingMsg: ChatMessageData = {
          id: `typing-${data.analysisId}`,
          type: 'system' as const,
          content: '',
          isTyping: true,
          timestamp: Date.now(),
        };
        setMessages((prev) => prev.concat(typingMsg));
        
        console.log('[Chat] Llamando startPolling()...');
        startPolling();
        console.log('[Chat] startPolling() llamado');
      } else {
        console.log('[Chat] Status NO requiere polling:', data.status);
        pendingIdRef.current = null;
      }
    } catch (err) {
      console.error('[Chat] Error en upload:', err);
      setMessages((prev) =>
        prev.concat({
          id: `error-${Date.now()}`,
          type: 'system' as const,
          content: 'Error al subir el archivo. Inténtalo de nuevo.',
          timestamp: Date.now(),
        })
      );
    } finally {
      setUploading(false);
      isSubmittingRef.current = false;
    }
  }, [selectedFile, uploading, analyzing, startPolling]);

  const handleCancel = useCallback(() => {
    stopPolling();
    setMessages((prev) => prev.filter((m) => !m.isTyping));
    pendingIdRef.current = null;
    isSubmittingRef.current = false;
  }, [stopPolling]);

  return (
    <div className="h-full flex flex-col -m-4 md:-m-8">
      <div className="bg-black text-white p-3 md:p-4 flex items-center justify-end flex-shrink-0 rounded-t-lg">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors text-white"
            aria-label="Opciones"
          >
            <Settings size={20} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={handleDeleteAll}
                disabled={messages.length === 0}
                className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 disabled:text-gray-400 disabled:hover:bg-white flex items-center gap-2"
              >
                <Trash2 size={16} />
                Eliminar conversación
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8 md:py-12">
            <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
              <span className="text-gray-400 text-lg md:text-xl">📄</span>
            </div>
            <p className="text-sm md:text-base">No hay mensajes. Sube un archivo para comenzar.</p>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} isMobile={isMobile} />)
        )}
      </div>

      <div className="flex-shrink-0">
        <ChatInput
          selectedFile={selectedFile}
          uploading={uploading}
          analyzing={analyzing}
          onFileSelect={setSelectedFile}
          onSend={handleSend}
          onCancel={handleCancel}
          inputRef={fileInputRef}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
};

export default Chat;
