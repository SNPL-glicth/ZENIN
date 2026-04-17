import { useState, useCallback, useRef, useEffect } from 'react';
import { sendMessage, uploadFile, getAnalysisResult } from '../services/chatService';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  fileName?: string;
  isLoading?: boolean;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  pendingFile: File | null;
  setPendingFile: (file: File | null) => void;
  sendText: (text: string) => Promise<void>;
  sendWithFile: (text: string, file: File) => Promise<void>;
  clearError: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const getStorageKey = (): string => {
  const username = localStorage.getItem('username') || 'anonymous';
  return `chat_history_${username}`;
};

const saveMessages = (msgs: Message[]): void => {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(msgs));
  } catch {
    // Silent fail if storage full
  }
};

const loadMessages = (): Message[] => {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
};

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

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>): string => {
    const id = generateId();
    setMessages((prev) => [...prev, { ...msg, id, timestamp: new Date() }]);
    return id;
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    addMessage({ content: text.trim(), isUser: true });
    setIsLoading(true);
    setError(null);

    const loadingId = addMessage({ content: '> procesando...', isUser: false, isLoading: true });

    try {
      const response = await sendMessage(text.trim());
      removeMessage(loadingId);
      addMessage({ content: response.answer || '> sin respuesta', isUser: false });
    } catch (err) {
      removeMessage(loadingId);
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, addMessage, removeMessage]);

  const sendWithFile = useCallback(async (text: string, file: File) => {
    if (isLoading) return;
    const displayText = text.trim() || file.name;
    addMessage({ content: displayText, isUser: true, fileName: file.name });
    setIsLoading(true);
    setError(null);
    setPendingFile(null);

    const loadingId = addMessage({ content: '> analizando documento...', isUser: false, isLoading: true });

    try {
      const upload = await uploadFile(file);
      const result = await pollAnalysis(upload.analysisId);
      removeMessage(loadingId);
      addMessage({ content: result.conclusion || '> análisis completado', isUser: false });
    } catch (err) {
      removeMessage(loadingId);
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, addMessage, removeMessage]);

  return {
    messages,
    isLoading,
    error,
    pendingFile,
    setPendingFile,
    sendText,
    sendWithFile,
    clearError: () => setError(null),
    messagesEndRef,
  };
}
