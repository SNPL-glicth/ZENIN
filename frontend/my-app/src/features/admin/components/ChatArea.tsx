import { useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { FileUploadButton } from './FileUploadButton';
import { useChatSession } from '../hooks/useChatSession';

/**
 * AnimatedDots - Blinking dots for loading states.
 */
function AnimatedDots({ text = 'processing' }: { text?: string }): React.ReactElement {
  return (
    <span className="inline-flex items-center font-mono text-sm text-gray-400">
      {text}
      <span className="ml-1 inline-flex">
        <span className="animate-bounce px-[1px] text-emerald-500" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce px-[1px] text-emerald-500" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce px-[1px] text-emerald-500" style={{ animationDelay: '300ms' }}>.</span>
      </span>
    </span>
  );
}

interface ChatAreaProps {
  /** Current active session ID - REQUIRED for operation */
  sessionId: string | null;
  /** Callback when document upload completes successfully */
  onDocumentUploaded?: () => void;
  /** Callback when session changes (for parent sync) */
  onSessionChange?: (sessionId: string | null) => void;
}

/**
 * ChatArea - Pure chat interface component (NO sidebar).
 * 
 * This component:
 * - ONLY displays chat messages for the given sessionId
 * - DOES NOT manage sidebar or session selection
 * - REQUIRES sessionId to be provided by parent component
 * - ALL state synchronization happens via backend API
 * - NO localStorage usage for messages
 * 
 * @param sessionId - Required session ID to load/send messages
 * @param onDocumentUploaded - Optional callback when file upload completes
 */
export function ChatArea({ 
  sessionId, 
  onDocumentUploaded,
  onSessionChange 
}: ChatAreaProps): React.ReactElement {
  const { 
    messages, 
    isLoading, 
    error, 
    pendingFile, 
    setPendingFile, 
    sendText, 
    sendWithFile, 
    loadSessionMessages, 
    clearMessages, 
    clearError, 
    messagesEndRef 
  } = useChatSession();
  
  const [input, setInput] = useState('');
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Load messages when sessionId changes
  useEffect(() => {
    if (sessionId) {
      setIsLoadingSession(true);
      loadSessionMessages(sessionId)
        .finally(() => setIsLoadingSession(false));
    } else {
      clearMessages();
    }
  }, [sessionId, loadSessionMessages, clearMessages]);

  // Notify parent of session changes
  useEffect(() => {
    onSessionChange?.(sessionId);
  }, [sessionId, onSessionChange]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  const displayValue = pendingFile ? `[${pendingFile.name}] ${input}` : input;
  const canSend = !!sessionId && (input.trim() || pendingFile) && !isLoading;

  const handleSend = async (): Promise<void> => {
    if (!canSend || !sessionId) return;

    if (pendingFile) {
      setProcessingFile(pendingFile.name);
      try {
        await sendWithFile(input, pendingFile, sessionId);
        onDocumentUploaded?.();
      } finally {
        setProcessingFile(null);
      }
    } else {
      await sendText(input, sessionId);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (file: File): void => {
    setPendingFile(file);
  };

  const clearFile = (): void => {
    setPendingFile(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (pendingFile) {
      const value = e.target.value;
      const prefix = `[${pendingFile.name}] `;
      if (value.startsWith(prefix)) {
        setInput(value.slice(prefix.length));
      } else {
        setInput(value);
      }
    } else {
      setInput(e.target.value);
    }
  };

  // Show loading state when switching sessions
  if (isLoadingSession) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-gray-800 bg-gray-900/50">
        <div className="flex flex-1 items-center justify-center">
          <AnimatedDots text="cargando sesión" />
        </div>
      </div>
    );
  }

  // Show empty state when no session selected
  if (!sessionId) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-gray-800 bg-gray-900/50">
        <div className="flex flex-1 items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="font-mono text-sm">{'>'} selecciona un chat</p>
            <p className="mt-2 text-xs">O crea uno nuevo desde el sidebar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-800 bg-gray-900/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="font-mono text-sm text-emerald-500">SYSTEM ONLINE</span>
        </div>
        <span className="font-mono text-xs text-gray-500">ZENIN COGNITIVE INTERFACE</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="font-mono text-sm">{'>'} inicializando interfaz cognitiva...</p>
              <p className="mt-2 text-xs">Envía un mensaje o adjunta un documento</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            content={msg.content} 
            isUser={msg.isUser} 
            timestamp={msg.timestamp} 
            fileName={msg.fileName} 
          />
        ))}

        {processingFile && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3">
            <svg className="h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1">
              <p className="font-mono text-sm text-emerald-400">{processingFile}</p>
              <AnimatedDots text="analizando documento" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3">
            <div className="flex items-start gap-2">
              <svg className="h-5 w-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-mono text-sm text-red-400">ERROR: {error}</p>
                <button
                  onClick={clearError}
                  className="mt-2 font-mono text-xs text-red-500 hover:text-red-400"
                >
                  [dismiss]
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-2">
          <FileUploadButton 
            onFileSelect={handleFileSelect} 
            disabled={isLoading || !!pendingFile} 
          />
          {pendingFile && (
            <button
              onClick={clearFile}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-xs text-gray-400 transition-colors hover:bg-gray-700"
            >
              ✕ {pendingFile.name.substring(0, 15)}{pendingFile.name.length > 15 ? '...' : ''}
            </button>
          )}
          <input
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={!sessionId ? '> selecciona un chat...' : isLoading ? 'Procesando...' : '> type your message...'}
            disabled={isLoading || !sessionId}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-mono text-sm text-gray-300 placeholder-gray-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="rounded-lg border border-emerald-800 bg-emerald-950/50 px-4 py-2 font-mono text-sm text-emerald-400 transition-colors hover:bg-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <AnimatedDots text="" /> : 'send'}
          </button>
        </div>
      </div>
    </div>
  );
}
