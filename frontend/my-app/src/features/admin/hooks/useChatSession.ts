import { useState, useCallback, useRef, useEffect } from 'react';
import { sendMessage, uploadFile, getAnalysisResult } from '../services/chatService';
import { 
  addMessage, 
  getChatSession, 
  getChatSessions, 
  createChatSession, 
  deleteChatSession,
  type ChatSession 
} from '../../chat/services/chatService';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  fileName?: string;
  isLoading?: boolean;
}

interface ConfirmDialogState {
  isOpen: boolean;
  sessionId?: string;
  sessionTitle?: string;
}

export interface UseChatSessionReturn {
  // Sessions
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoadingSessions: boolean;
  isCreatingChat: boolean;
  isSwitchingSession: string | null;
  deleteDialog: ConfirmDialogState;
  
  // Messages
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  pendingFile: File | null;
  
  // Refs
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  
  // Actions - Sessions
  loadSessions: () => Promise<void>;
  createNewChat: () => Promise<string | null>;
  switchSession: (sessionId: string) => void;
  openDeleteDialog: (sessionId: string, sessionTitle: string) => void;
  closeDeleteDialog: () => void;
  confirmDeleteSession: () => Promise<void>;
  
  // Actions - Messages
  setPendingFile: (file: File | null) => void;
  sendText: (text: string) => Promise<void>;
  sendWithFile: (text: string, file: File) => Promise<void>;
  loadSessionMessages: () => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

const generateId = (): string =>
  `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const pollAnalysis = async (
  analysisId: string, 
  maxAttempts = 40,
  signal?: AbortSignal
): Promise<{ conclusion?: string }> => {
  for (let i = 0; i < maxAttempts; i++) {
    // Check if aborted before each iteration
    if (signal?.aborted) {
      throw new Error('Analysis polling cancelled');
    }
    
    const result = await getAnalysisResult(analysisId);
    if (result.status === 'analyzed' || result.status === 'completed') {
      return { conclusion: result.conclusion };
    }
    if (result.status === 'error' || result.status === 'failed') {
      throw new Error('Analysis failed');
    }
    
    // Wait 3 seconds before next poll, but check for abort
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 3000);
      signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Analysis polling cancelled'));
      }, { once: true });
    });
  }
  throw new Error('Analysis timeout');
};

export function useChatSession(): UseChatSessionReturn {
  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isSwitchingSession, setIsSwitchingSession] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<ConfirmDialogState>({ isOpen: false });
  
  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount - cancel any ongoing polling
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Session Management
  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const sessionList = await getChatSessions();
      setSessions(sessionList);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const createNewChat = useCallback(async (): Promise<string | null> => {
    if (isCreatingChat) return null;
    
    setIsCreatingChat(true);
    try {
      const newSession = await createChatSession();
      await loadSessions();
      setActiveSessionId(newSession.id);
      return newSession.id;
    } catch (err) {
      console.error('Failed to create new chat:', err);
      setError('Error al crear chat. Intenta de nuevo.');
      return null;
    } finally {
      setIsCreatingChat(false);
    }
  }, [isCreatingChat, loadSessions]);

  const switchSession = useCallback((sessionId: string) => {
    if (isSwitchingSession) return; // Prevent switching while another switch is in progress
    
    setIsSwitchingSession(sessionId);
    setActiveSessionId(sessionId);
    
    // Reset states when switching
    setError(null);
    setPendingFile(null);
    setMessages([]);
    
    // Reset switching state after a short delay
    setTimeout(() => setIsSwitchingSession(null), 500);
  }, [isSwitchingSession]);

  const openDeleteDialog = useCallback((sessionId: string, sessionTitle: string) => {
    setDeleteDialog({ isOpen: true, sessionId, sessionTitle });
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ isOpen: false });
  }, []);

  const confirmDeleteSession = useCallback(async () => {
    if (!deleteDialog.sessionId) return;
    
    try {
      await deleteChatSession(deleteDialog.sessionId);
      await loadSessions();
      
      // If we deleted the active session, clear it
      if (activeSessionId === deleteDialog.sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
      
      setDeleteDialog({ isOpen: false });
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Error al eliminar sesión. Intenta de nuevo.');
    }
  }, [deleteDialog.sessionId, activeSessionId, loadSessions]);

  const addTempMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>): string => {
    const id = generateId();
    setMessages((prev) => [...prev, { ...msg, id, timestamp: new Date() }]);
    return id;
  }, []);

  const removeTempMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const loadSessionMessages = useCallback(async () => {
    if (!activeSessionId) return;
    
    try {
      setError(null); // Clear previous errors
      const session = await getChatSession(activeSessionId);
      const loadedMessages: Message[] = session.messages.map(m => ({
        id: m.id,
        content: m.content,
        isUser: m.role === 'user',
        timestamp: new Date(m.createdAt),
        fileName: undefined // AnalysisResultId can be used to fetch filename if needed
      }));
      setMessages(loadedMessages);
    } catch (err) {
      console.error('Failed to load session messages:', err);
      
      // Check if it's a 404 error (session not found - likely deleted)
      const errorMessage = err instanceof Error ? err.message : '';
      const isNotFound = errorMessage.includes('404') || errorMessage.includes('Not Found');
      
      if (isNotFound) {
        // Session was deleted - clear the active session to stop retry loop
        setActiveSessionId(null);
        setError('Esta conversación ya no existe. Selecciona otra o crea una nueva.');
      } else {
        setError('Failed to load messages. Please try again.');
      }
      setMessages([]);
    }
  }, [activeSessionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || !activeSessionId) return;

    const tempUserMsgId = addTempMessage({ content: text.trim(), isUser: true });
    // NOTA: No agregamos mensaje temporal de "procesando" - ChatArea lo indica con isLoading
    
    setIsLoading(true);
    setError(null);

    try {
      await addMessage(activeSessionId, 'user', text.trim());
      const response = await sendMessage(text.trim());
      await addMessage(activeSessionId, 'assistant', response.answer || '> sin respuesta');
      
      await loadSessionMessages();
    } catch (err) {
      removeTempMessage(tempUserMsgId);
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, activeSessionId, addTempMessage, removeTempMessage, loadSessionMessages]);

  const sendWithFile = useCallback(async (text: string, file: File) => {
    if (isLoading || !activeSessionId) return;
    
    const displayText = text.trim() || file.name;
    const tempUserMsgId = addTempMessage({ content: displayText, isUser: true, fileName: file.name });
    // NOTA: No agregamos mensaje temporal de "analizando" - ChatArea lo muestra con processingFile
    
    setIsLoading(true);
    setError(null);
    setPendingFile(null);

    // Cancel any previous polling before starting new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      await addMessage(activeSessionId, 'user', displayText);
      const upload = await uploadFile(file);
      const result = await pollAnalysis(upload.analysisId, 40, abortControllerRef.current.signal);
      await addMessage(activeSessionId, 'assistant', result.conclusion || '> análisis completado', upload.analysisId);
      
      await loadSessionMessages();
    } catch (err) {
      // Don't show error if user cancelled (changed session or closed)
      if (err instanceof Error && err.message === 'Analysis polling cancelled') {
        return;
      }
      removeTempMessage(tempUserMsgId);
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, activeSessionId, addTempMessage, removeTempMessage, loadSessionMessages]);

  return {
    // Sessions
    sessions,
    activeSessionId,
    isLoadingSessions,
    isCreatingChat,
    isSwitchingSession,
    deleteDialog,
    
    // Messages
    messages,
    isLoading,
    error,
    pendingFile,
    
    // Refs
    messagesEndRef,
    
    // Actions - Sessions
    loadSessions,
    createNewChat,
    switchSession,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDeleteSession,
    
    // Actions - Messages
    setPendingFile,
    sendText,
    sendWithFile,
    loadSessionMessages,
    clearMessages,
    clearError: () => setError(null),
  };
}
