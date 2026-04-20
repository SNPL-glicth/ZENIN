import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { getRoutePath } from '../../../router/routes';
import type { UseChatSessionReturn } from '../hooks/useChatSession';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chatSession: UseChatSessionReturn;
}

const SIDEBAR_WIDTH = 260;

/**
 * Sidebar - ChatGPT-style unified sidebar.
 *
 * Single sidebar with:
 * - Logo header
 * - Main menu (Nuevo chat, Buscar)
 * - Recents (collapsible chat list)
 * - User profile & actions at bottom
 */
export function Sidebar({ isOpen, onToggle, chatSession }: SidebarProps): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const username = localStorage.getItem('username') || 'usuario';
  
  // Local UI state only (not session data)
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecents, setShowRecents] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Destructure from chatSession
  const {
    sessions,
    isLoadingSessions,
    isCreatingChat,
    isSwitchingSession,
    deleteDialog,
    createNewChat,
    switchSession,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDeleteSession,
  } = chatSession;

  // Create new chat handler
  const handleNewChat = useCallback(async () => {
    const newId = await createNewChat();
    if (newId) {
      navigate(`${getRoutePath('CHAT')}?session=${newId}`);
    }
  }, [createNewChat, navigate]);

  // Select session handler
  const handleSelectSession = useCallback((sessionId: string) => {
    switchSession(sessionId);
    navigate(`${getRoutePath('CHAT')}?session=${sessionId}`);
  }, [switchSession, navigate]);

  // Delete click handler
  const handleDeleteClick = useCallback((sessionId: string, sessionTitle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openDeleteDialog(sessionId, sessionTitle);
  }, [openDeleteDialog]);

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate(getRoutePath('LOGIN'));
  };

  const currentSessionId = new URLSearchParams(location.search).get('session');

  return (
    <aside
      className="flex-shrink-0 overflow-hidden border-r border-gray-800 bg-[#0a0a0a] transition-all duration-300 ease-in-out"
      style={{ width: isOpen ? SIDEBAR_WIDTH : 0, opacity: isOpen ? 1 : 0 }}
    >
      <div
        className="flex h-full w-[260px] flex-col"
        style={{ minWidth: SIDEBAR_WIDTH }}
      >
        {/* Header with Logo */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-600">
              <span className="font-mono text-sm font-bold text-white">Z</span>
            </div>
            <span className="font-mono text-sm text-gray-300">ZENIN</span>
          </div>
          <button
            onClick={onToggle}
            className="text-gray-500 transition-colors hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Main Menu - ChatGPT Style */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {/* Home */}
          <button
            onClick={() => navigate(getRoutePath('ADMIN'))}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm transition-colors ${
              currentPath === '/app/admin' || currentPath === '/app/admin/'
                ? 'bg-purple-900/30 text-purple-300'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>

          {/* Nuevo chat */}
          <button
            onClick={handleNewChat}
            disabled={isCreatingChat}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingChat ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            {isCreatingChat ? 'Creando...' : 'Nuevo chat'}
          </button>

          {/* Buscar chats */}
          <button
            onClick={() => setIsSearching(!isSearching)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm text-gray-300 transition-colors hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Buscar chats
          </button>

          {/* Métricas */}
          <button
            onClick={() => navigate(getRoutePath('METRICS'))}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm transition-colors ${
              currentPath === '/app/admin/metrics'
                ? 'bg-purple-900/30 text-purple-300'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Métricas
          </button>

          {/* Search input (expandable) */}
          {isSearching && (
            <div className="px-3 py-2">
              <input
                type="text"
                placeholder="Buscar conversación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full rounded bg-gray-800 px-3 py-2 font-mono text-xs text-gray-300 placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {/* Separador */}
          <div className="my-3 border-t border-gray-800" />

          {/* Recientes - Collapsible */}
          <button
            onClick={() => setShowRecents(!showRecents)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-800"
          >
            <span>Recientes</span>
            <svg 
              className={`h-3 w-3 transition-transform ${showRecents ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Lista de sesiones */}
          {showRecents && (
            <div className="mt-1 space-y-1">
              {isLoadingSessions ? (
                // Skeleton loading - 5 items
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2">
                      <div className="h-4 w-full animate-pulse rounded bg-gray-800" />
                    </div>
                  ))}
                </>
              ) : filteredSessions.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <svg className="mx-auto mb-2 h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-xs text-gray-600">
                    {searchQuery ? 'No se encontraron chats' : 'No hay conversaciones'}
                  </p>
                </div>
              ) : (
                filteredSessions.slice(0, 15).map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2 font-mono text-sm transition-colors ${
                      currentSessionId === session.id 
                        ? 'bg-gray-800 text-white' 
                        : 'text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <span 
                      className={`truncate flex-1 cursor-pointer ${isSwitchingSession === session.id ? 'opacity-50' : ''}`}
                      onClick={() => handleSelectSession(session.id)}
                    >
                      {session.title}
                    </span>
                    <button
                      onClick={(e) => handleDeleteClick(session.id, session.title, e)}
                      disabled={isSwitchingSession === session.id}
                      className="ml-2 p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-950/50 transition-colors pointer-events-auto z-10 relative disabled:opacity-30"
                      title="Eliminar chat"
                      type="button"
                    >
                      <svg className="h-4 w-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeDeleteDialog}
            />
            <div className="relative z-10 w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-xl mx-4">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-red-950/50 p-3">
                  <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-center text-lg font-bold text-white">
                ¿Eliminar chat?
              </h2>
              <p className="mb-2 text-center font-mono text-sm text-gray-400">
                "{deleteDialog.sessionTitle}"
              </p>
              <p className="mb-6 text-center font-mono text-xs text-gray-500">
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeDeleteDialog}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-mono text-sm text-gray-300 transition-colors hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteSession}
                  className="flex-1 rounded-lg border border-red-800 bg-red-950/50 px-4 py-2 font-mono text-sm text-red-400 transition-colors hover:bg-red-900/50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Profile & Logout */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-900/50">
                <span className="font-mono text-xs text-purple-300">
                  {username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="truncate font-mono text-xs text-gray-400">{username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
              title="Cerrar sesión"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
