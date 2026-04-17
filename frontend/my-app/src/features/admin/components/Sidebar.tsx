import { useNavigate, useLocation } from 'react-router-dom';
import { getRoutePath } from '../../../router/routes';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SIDEBAR_WIDTH = 260;

/**
 * Sidebar - Push-based navigation panel.
 *
 * Pushes content rather than overlaying.
 * Smooth width transition with flex layout.
 */
export function Sidebar({ isOpen, onToggle }: SidebarProps): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem('username') || 'usuario';
  
  const currentPath = location.pathname;

  const handleLogout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate(getRoutePath('LOGIN'));
  };

  return (
    <aside
      className="flex-shrink-0 overflow-hidden border-r border-gray-800 bg-[#0a0a0a] transition-all duration-300 ease-in-out"
      style={{ width: isOpen ? SIDEBAR_WIDTH : 0, opacity: isOpen ? 1 : 0 }}
    >
      <div
        className="flex h-full w-[260px] flex-col"
        style={{ minWidth: SIDEBAR_WIDTH }}
      >
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-gray-400">ZENIN SYSTEM</span>
            <button
              onClick={onToggle}
              className="text-gray-500 transition-colors hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-900/50">
              <span className="font-mono text-sm text-purple-300">
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm text-white">{username}</p>
              <p className="truncate font-mono text-xs text-gray-500">{'>'} authenticated</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {/* Home */}
          <button
            onClick={() => navigate(getRoutePath('ADMIN'))}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm transition-colors ${
              currentPath === '/app/admin' || currentPath === '/app/admin/'
                ? 'bg-purple-900/30 text-purple-300'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>

          {/* Chat */}
          <button
            onClick={() => navigate(getRoutePath('CHAT'))}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm transition-colors ${
              currentPath === '/app/admin/chat'
                ? 'bg-purple-900/30 text-purple-300'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
          </button>

          {/* Predictions */}
          <button
            onClick={() => navigate(getRoutePath('PREDICTIONS'))}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm transition-colors ${
              currentPath === '/app/admin/predictions'
                ? 'bg-purple-900/30 text-purple-300'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Predictions
          </button>
        </nav>

        <div className="border-t border-gray-800 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm text-red-400 transition-colors hover:bg-red-950/30"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
