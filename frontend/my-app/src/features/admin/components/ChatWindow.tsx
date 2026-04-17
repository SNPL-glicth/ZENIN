import { useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { FileUploadButton } from './FileUploadButton';
import { useChat } from '../hooks/useChat';

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
 * ChatWindow - Cognitive interface terminal.
 *
 * Fills parent flex container.
 * Shows filename in input when file selected.
 * Animated loading dots for processing states.
 */
export function ChatWindow(): React.ReactElement {
  const { messages, isLoading, error, pendingFile, setPendingFile, sendText, sendWithFile, clearError, messagesEndRef } = useChat();
  const [input, setInput] = useState('');
  const [processingFile, setProcessingFile] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  const displayValue = pendingFile ? `[${pendingFile.name}] ${input}` : input;
  const canSend = (input.trim() || pendingFile) && !isLoading;

  const handleSend = (): void => {
    if (!canSend || isLoading) return;

    if (pendingFile) {
      setProcessingFile(pendingFile.name);
      sendWithFile(input, pendingFile).then(() => {
        setProcessingFile(null);
      });
    } else {
      sendText(input);
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
      // Remove the filename prefix if it exists
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

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-800 bg-gray-900/50">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="font-mono text-sm text-emerald-500">SYSTEM ONLINE</span>
        </div>
        <span className="font-mono text-xs text-gray-500">ZENIN COGNITIVE INTERFACE</span>
      </div>

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
          <MessageBubble key={msg.id} content={msg.content} isUser={msg.isUser} timestamp={msg.timestamp} fileName={msg.fileName} />
        ))}
        {processingFile && !messages.find(m => m.isLoading) && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-purple-900/50 bg-purple-950/30 px-4 py-3">
              <AnimatedDots text={`processing ${processingFile}`} />
            </div>
          </div>
        )}
        {error && (
          <div className="cursor-pointer rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-center" onClick={clearError}>
            <p className="font-mono text-sm text-red-400">ERROR: {error}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <FileUploadButton onFileSelect={handleFileSelect} disabled={isLoading || !!pendingFile} />
          <div className="relative flex-1">
            <input
              type="text"
              value={displayValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isLoading ? 'Procesando...' : '> ingrese consulta...'}
              className={`w-full rounded-lg border px-4 py-3 font-mono text-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                pendingFile
                  ? 'border-cyan-700 bg-cyan-950/20 text-cyan-100 placeholder-cyan-700 focus:border-cyan-500'
                  : 'border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:border-purple-500'
              }`}
            />
            {pendingFile && (
              <button
                onClick={clearFile}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 transition-colors hover:text-cyan-300 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex h-10 items-center justify-center rounded-lg bg-purple-600 px-4 font-mono text-sm text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ENVIAR
          </button>
        </div>
      </div>
    </div>
  );
}
