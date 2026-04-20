import { useEffect, useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MessageBubble } from './MessageBubble';
import { FileUploadButton } from './FileUploadButton';
import type { UseChatSessionReturn } from '../hooks/useChatSession';

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

/**
 * ChatArea - Pure chat interface component using shared context.
 * 
 * This component:
 * - Gets session state from useOutletContext (provided by AdminLayout)
 * - DOES NOT manage sidebar or session selection
 * - ALL state synchronization happens via shared hook
 * - NO localStorage usage for messages
 */
export function ChatArea(): React.ReactElement {
  // Get shared session state from context
  const { 
    activeSessionId,
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
  } = useOutletContext<UseChatSessionReturn>();
  
  const [input, setInput] = useState('');
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const isSendingRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);
  const lastLoadedSessionRef = useRef<string | null>(null);

  // Load messages when activeSessionId changes
  useEffect(() => {
    // Only load if we have a session and it's different from last loaded
    if (activeSessionId && activeSessionId !== lastLoadedSessionRef.current) {
      lastLoadedSessionRef.current = activeSessionId;
      
      // Reset states when session changes
      setInput('');
      setProcessingFile(null);
      clearError();
      shouldScrollRef.current = true;
      
      setIsLoadingSession(true);
      loadSessionMessages()
        .finally(() => setIsLoadingSession(false));
    } else if (!activeSessionId) {
      // No active session - clear everything
      lastLoadedSessionRef.current = null;
      clearMessages();
      clearError();
    }
    
    // Cleanup: mark any ongoing send as stale
    return () => {
      isSendingRef.current = false;
    };
  }, [activeSessionId]); // Only depend on activeSessionId

  // Check if user is near bottom before auto-scrolling
  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100; // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  // Handle scroll to track user position
  const handleScroll = () => {
    shouldScrollRef.current = isNearBottom();
  };

  // Auto-scroll to bottom on new messages (only if user is near bottom)
  useEffect(() => {
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messagesEndRef]);

  const displayValue = pendingFile ? `[${pendingFile.name}] ${input}` : input;
  const canSend = !!activeSessionId && (input.trim() || pendingFile) && !isLoading;

  const handleSend = async (): Promise<void> => {
    if (!canSend || !activeSessionId || isSendingRef.current) return;
    
    isSendingRef.current = true;

    if (pendingFile) {
      setProcessingFile(pendingFile.name);
      try {
        await sendWithFile(input, pendingFile);
      } finally {
        setProcessingFile(null);
        isSendingRef.current = false;
      }
    } else {
      try {
        await sendText(input);
      } finally {
        isSendingRef.current = false;
      }
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && e.shiftKey) {
      // Allow shift+enter to insert newline
      e.preventDefault();
      setInput((prev) => prev + '\n');
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

  // Skeleton Loading Component
  const MessageSkeleton = () => (
    <div className="flex w-full animate-pulse space-x-3">
      <div className="h-8 w-8 rounded-full bg-gray-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/4 rounded bg-gray-700" />
        <div className="h-16 w-3/4 rounded bg-gray-700" />
      </div>
    </div>
  );

  // Show loading state when switching sessions (skeleton)
  if (isLoadingSession) {
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
        {/* Skeleton Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <MessageSkeleton />
          <MessageSkeleton />
          <MessageSkeleton />
        </div>
      </div>
    );
  }

  // Show empty state when no session selected
  if (!activeSessionId) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-gray-800 bg-gray-900/50">
        <div className="flex flex-1 items-center justify-center text-gray-500">
          <div className="text-center">
            <svg className="mx-auto mb-4 h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="font-mono text-lg text-gray-400">Ninguna conversación seleccionada</p>
            <p className="mt-2 text-sm text-gray-600">Selecciona un chat del sidebar o crea uno nuevo</p>
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
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && !isLoading && !error && (
          <div className="flex h-full items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="mx-auto mb-4 h-10 w-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <p className="font-mono text-lg text-gray-400">Sin mensajes aún</p>
              <p className="mt-2 text-sm text-gray-600">Envía un mensaje o adjunta un documento para empezar</p>
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
          <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-mono text-sm font-medium text-red-400">Error al cargar mensajes</p>
                <p className="mt-1 font-mono text-xs text-red-300/70">{error}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      clearError();
                      loadSessionMessages();
                    }}
                    className="rounded bg-red-900/50 px-3 py-1.5 font-mono text-xs text-red-400 transition-colors hover:bg-red-800/50"
                  >
                    Reintentar
                  </button>
                  <button
                    onClick={clearError}
                    className="rounded border border-red-900/50 px-3 py-1.5 font-mono text-xs text-red-400/70 transition-colors hover:bg-red-950/30"
                  >
                    Cerrar
                  </button>
                </div>
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
            placeholder={!activeSessionId ? 'Selecciona una conversación...' : isLoading ? 'Procesando...' : 'Escribe un mensaje... (Shift+Enter para nueva línea)'}
            disabled={isLoading || !activeSessionId}
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
