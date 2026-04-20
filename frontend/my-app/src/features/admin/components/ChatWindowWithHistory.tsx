import { useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { FileUploadButton } from './FileUploadButton';
import { useChatSession } from '../hooks/useChatSession';
import { ConfirmDeleteModal } from '../../../components/modals/ConfirmDeleteModal';
import {
  getChatSessions,
  createChatSession,
  deleteChatSession,
  type ChatSession,
} from '../../chat/services/chatService';

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
 * ChatWindowWithHistory - Chat interface with sidebar history.
 * Inspired by Claude.ai
 */
export function ChatWindowWithHistory(): React.ReactElement {
  const { messages, isLoading, error, pendingFile, setPendingFile, sendText, sendWithFile, loadSessionMessages, clearMessages, clearError, messagesEndRef } = useChatSession();
  const [input, setInput] = useState('');
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Chat history state
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    chatId?: string;
    chatTitle?: string;
  }>({ isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);

  // Load chats on mount and create initial session if none exist
  useEffect(() => {
    const initializeChat = async () => {
      await loadChats();
      const chatList = await getChatSessions();
      if (chatList.length === 0) {
        const newSession = await createChatSession();
        setSelectedChatId(newSession.id);
        await loadChats();
      } else if (!selectedChatId) {
        setSelectedChatId(chatList[0].id);
      }
    };
    initializeChat();
  }, []);

  // Load messages when session is selected
  useEffect(() => {
    if (selectedChatId) {
      loadSessionMessages(selectedChatId);
    } else {
      clearMessages();
    }
  }, [selectedChatId, loadSessionMessages, clearMessages]);

  const loadChats = async () => {
    setIsLoadingChats(true);
    try {
      const chatList = await getChatSessions();
      setChats(chatList);
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  const displayValue = pendingFile ? `[${pendingFile.name}] ${input}` : input;
  const canSend = (input.trim() || pendingFile) && !isLoading;

  const handleSend = (): void => {
    if (!canSend || isLoading || !selectedChatId) return;

    if (pendingFile) {
      setProcessingFile(pendingFile.name);
      sendWithFile(input, pendingFile, selectedChatId).then(() => {
        setProcessingFile(null);
        loadChats();
      });
    } else {
      sendText(input, selectedChatId).then(() => {
        loadChats();
      });
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

  // New chat handler
  const handleNewChat = async () => {
    try {
      const newSession = await createChatSession();
      setSelectedChatId(newSession.id);
      clearMessages();
      await loadChats();
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  // Delete chat handler
  const handleDeleteChat = (chatId: string, chatTitle: string) => {
    setDeleteModal({ isOpen: true, chatId, chatTitle });
  };

  const confirmDeleteChat = async () => {
    if (!deleteModal.chatId) return;
    
    setIsDeleting(true);
    try {
      await deleteChatSession(deleteModal.chatId);
      if (selectedChatId === deleteModal.chatId) {
        setSelectedChatId(null);
      }
      await loadChats();
      setDeleteModal({ isOpen: false });
    } catch (err) {
      console.error('Failed to delete chat:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter chats by search
  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group chats by date
  const groupedChats = groupChatsByDate(filteredChats);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed inset-y-0 left-0 z-30 w-64 flex-shrink-0 border-r border-gray-800 bg-[#0a0a0a] transition-transform duration-300
          md:relative md:inset-auto md:translate-x-0
        `}
      >
        <div className="flex h-full flex-col">
          {/* New Chat Button */}
          <div className="border-b border-gray-800 p-3">
            <button
              onClick={handleNewChat}
              className="w-full rounded-lg border border-emerald-800 bg-emerald-950/30 px-3 py-2 font-mono text-sm text-emerald-400 transition-colors hover:bg-emerald-900/50"
            >
              + Nuevo chat
            </button>
          </div>

          {/* Search */}
          <div className="border-b border-gray-800 p-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-10 pr-3 font-mono text-sm text-gray-300 placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingChats ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-800" />
                ))}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <svg className="h-12 w-12 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p className="font-mono text-sm text-gray-500">No hay chats aún</p>
                <p className="font-mono text-xs text-gray-600 mt-1">Inicia una conversación</p>
              </div>
            ) : (
              <div className="p-2">
                {Object.entries(groupedChats).map(([group, groupChats]) => (
                  <div key={group} className="mb-4">
                    <div className="mb-2 px-2 py-1">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {group}
                      </span>
                    </div>
                    {groupChats.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isSelected={selectedChatId === chat.id}
                        onSelect={() => setSelectedChatId(chat.id)}
                        onDelete={() => handleDeleteChat(chat.id, chat.title)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="mt-auto border-t border-gray-800 p-3">
            <div className="mb-2 flex items-center gap-2 px-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-400">
                Configuración
              </span>
            </div>
            <button
              onClick={async () => {
                if (window.confirm(' ADVERTENCIA\n\nEsto eliminará PERMANENTEMENTE:\n• Todas tus sesiones de chat\n• Todos los mensajes\n• Todos los análisis de documentos\n\n¿Estás completamente seguro?')) {
                  try {
                    const { resetUserData } = await import('../../chat/services/chatService');
                    const result = await resetUserData();
                    console.log('Reset completado:', result);
                    setChats([]);
                    setSelectedChatId(null);
                    clearMessages();
                    const newSession = await createChatSession();
                    setSelectedChatId(newSession.id);
                    await loadChats();
                    alert(` Reset completado:\n• ${result.chatSessionsDeleted} sesiones eliminadas\n• ${result.chatMessagesDeleted} mensajes eliminados\n• ${result.analysisResultsDeleted} análisis eliminados`);
                  } catch (err) {
                    console.error('Failed to reset user data:', err);
                    alert(' Error al resetear datos. Intenta de nuevo.');
                  }
                }
              }}
              className="w-full rounded-lg border border-red-800 bg-red-950/30 px-3 py-2 font-mono text-xs text-red-400 transition-colors hover:bg-red-900/50 hover:border-red-700"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Reset Usuario</span>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Toggle Sidebar Button (Mobile) */}
        <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg border border-gray-700 bg-gray-900 p-2 transition-colors hover:bg-gray-800"
          >
            <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Chat Window */}
        <div className="flex h-full flex-col rounded-lg border border-gray-800 bg-gray-900/50 m-4">
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

          <div className="border-t border-gray-800 p-4">
            <div className="flex items-center gap-2">
              <FileUploadButton onFileSelect={handleFileSelect} />
              {pendingFile && (
                <button
                  onClick={clearFile}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-xs text-gray-400 transition-colors hover:bg-gray-700"
                >
                  ✕ clear file
                </button>
              )}
              <input
                type="text"
                value={displayValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="{'>'} type your message..."
                disabled={isLoading}
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
      </div>

      {/* Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        onConfirm={confirmDeleteChat}
        itemName={deleteModal.chatTitle || ''}
        isLoading={isDeleting}
      />
    </div>
  );
}

/**
 * ChatItem - Individual chat in sidebar
 */
function ChatItem({
  chat,
  isSelected,
  onSelect,
  onDelete,
}: {
  chat: ChatSession;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}): React.ReactElement {
  return (
    <div
      className={`
        group mb-1 flex items-center gap-2 rounded-lg border p-2 transition-all cursor-pointer
        ${isSelected
          ? 'border-emerald-700 bg-emerald-950/30'
          : 'border-transparent hover:border-gray-700 hover:bg-gray-900/50'
        }
      `}
      onClick={onSelect}
    >
      <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>

      <div className="flex-1 min-w-0">
        <p className="truncate font-mono text-xs text-gray-300">
          {chat.title}
        </p>
        <p className="font-mono text-[10px] text-gray-500">
          {chat.messageCount} msg{chat.messageCount !== 1 ? 's' : ''}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex-shrink-0 rounded p-1 text-gray-500 opacity-0 transition-opacity hover:bg-red-950/30 hover:text-red-400 group-hover:opacity-100"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Group chats by date
 */
function groupChatsByDate(chats: ChatSession[]): Record<string, ChatSession[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, ChatSession[]> = {
    'Hoy': [],
    'Ayer': [],
    'Esta semana': [],
    'Anteriores': [],
  };

  chats.forEach(chat => {
    const chatDate = new Date(chat.createdAt);
    const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

    if (chatDay.getTime() === today.getTime()) {
      groups['Hoy'].push(chat);
    } else if (chatDay.getTime() === yesterday.getTime()) {
      groups['Ayer'].push(chat);
    } else if (chatDay >= weekAgo) {
      groups['Esta semana'].push(chat);
    } else {
      groups['Anteriores'].push(chat);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}
