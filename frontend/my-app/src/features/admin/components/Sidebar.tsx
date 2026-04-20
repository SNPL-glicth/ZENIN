import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { getRoutePath } from '../../../router/routes';
import {
  getChatSessions,
  createChatSession,
  deleteChatSession,
  type ChatSession,
} from '../../chat/services/chatService';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
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
export function Sidebar({ isOpen, onToggle }: SidebarProps): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const username = localStorage.getItem('username') || 'usuario';
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [showRecents, setShowRecents] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Load sessions
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

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Listen for refresh events from ChatArea
  useEffect(() => {
    const handleRefresh = () => loadSessions();
    window.addEventListener('refresh-sessions', handleRefresh);
    return () => window.removeEventListener('refresh-sessions', handleRefresh);
  }, [loadSessions]);

  // Create new chat
  const handleNewChat = async () => {
    try {
      const newSession = await createChatSession();
      await loadSessions();
      window.location.href = `${getRoutePath('CHAT')}?session=${newSession.id}`;
    } catch (err) {
      console.error('Failed to create new chat:', err);
      alert('Error al crear chat. Intenta de nuevo.');
    }
  };

  // Select session
  const handleSelectSession = (sessionId: string) => {
    window.location.href = `${getRoutePath('CHAT')}?session=${sessionId}`;
  };

  // Delete session - direct deletion for better UX
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    console.log('🚨 handleDeleteSession called with:', sessionId);
    
    // Direct deletion without confirmation for now
    try {
      console.log('📤 Calling deleteChatSession...');
      await deleteChatSession(sessionId);
      console.log('✅ deleteChatSession completed');
      await loadSessions();
      console.log('✅ Sessions reloaded');
    } catch (err) {
      console.error('❌ Failed to delete session:', err);
      alert('Error al eliminar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

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
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm text-gray-300 transition-colors hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo chat
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
                <div className="px-3 py-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-800" />
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-600">
                  No hay conversaciones
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
                      className="truncate flex-1 cursor-pointer"
                      onClick={() => handleSelectSession(session.id)}
                    >
                      {session.title}
                    </span>
                    <button
                      onClick={(e) => {
                        console.log('🗑️ Delete button clicked for session:', session.id);
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteSession(session.id, e);
                      }}
                      className="ml-2 p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-950/50 transition-colors pointer-events-auto z-10 relative"
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
