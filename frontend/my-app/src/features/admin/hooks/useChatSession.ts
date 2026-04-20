import { useState, useCallback, useRef } from 'react';
import { sendMessage, uploadFile, getAnalysisResult } from '../services/chatService';
import { addMessage, getChatSession } from '../../chat/services/chatService';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  fileName?: string;
  isLoading?: boolean;
}

interface UseChatSessionReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  pendingFile: File | null;
  setPendingFile: (file: File | null) => void;
  sendText: (text: string, sessionId: string) => Promise<void>;
  sendWithFile: (text: string, file: File, sessionId: string) => Promise<void>;
  loadSessionMessages: (sessionId: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const generateId = (): string =>
  `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const pollAnalysis = async (analysisId: string, maxAttempts = 40): Promise<{
  conclusion?: string;
}> => {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getAnalysisResult(analysisId);
    if (result.status === 'analyzed' || result.status === 'completed') {
      return { conclusion: result.conclusion };
    }
    if (result.status === 'error' || result.status === 'failed') {
      throw new Error('Analysis failed');
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Analysis timeout');
};

export function useChatSession(): UseChatSessionReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addTempMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>): string => {
    const id = generateId();
    setMessages((prev) => [...prev, { ...msg, id, timestamp: new Date() }]);
    return id;
  }, []);

  const removeTempMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const session = await getChatSession(sessionId);
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
      setMessages([]);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const sendText = useCallback(async (text: string, sessionId: string) => {
    if (!text.trim() || isLoading) return;

    const tempUserMsgId = addTempMessage({ content: text.trim(), isUser: true });
    const tempLoadingId = addTempMessage({ content: '> procesando...', isUser: false, isLoading: true });
    
    setIsLoading(true);
    setError(null);

    try {
      await addMessage(sessionId, 'user', text.trim());
      const response = await sendMessage(text.trim());
      await addMessage(sessionId, 'assistant', response.answer || '> sin respuesta');
      
      await loadSessionMessages(sessionId);
    } catch (err) {
      removeTempMessage(tempUserMsgId);
      removeTempMessage(tempLoadingId);
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, addTempMessage, removeTempMessage, loadSessionMessages]);

  const sendWithFile = useCallback(async (text: string, file: File, sessionId: string) => {
    if (isLoading) return;
    
    const displayText = text.trim() || file.name;
    const tempUserMsgId = addTempMessage({ content: displayText, isUser: true, fileName: file.name });
    const tempLoadingId = addTempMessage({ content: '> analizando documento...', isUser: false, isLoading: true });
    
    setIsLoading(true);
    setError(null);
    setPendingFile(null);

    try {
      await addMessage(sessionId, 'user', displayText);
      const upload = await uploadFile(file);
      const result = await pollAnalysis(upload.analysisId);
      await addMessage(sessionId, 'assistant', result.conclusion || '> análisis completado', upload.analysisId);
      
      await loadSessionMessages(sessionId);
    } catch (err) {
      removeTempMessage(tempUserMsgId);
      removeTempMessage(tempLoadingId);
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, addTempMessage, removeTempMessage, loadSessionMessages]);

  return {
    messages,
    isLoading,
    error,
    pendingFile,
    setPendingFile,
    sendText,
    sendWithFile,
    loadSessionMessages,
    clearMessages,
    clearError: () => setError(null),
    messagesEndRef,
  };
}
