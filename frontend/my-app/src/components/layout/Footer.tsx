import { useNavigate } from 'react-router-dom';
import { getRoutePath } from '../../router/routes';

/**
 * Footer - Terminal-style system access panel.
 *
 * Provides authentication access points with cyber/terminal aesthetic:
 * - System status display
 * - Terminal-style messaging
 * - Login/Register actions
 * - Live system indicator
 */
export function Footer(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <footer className="border-b border-gray-800 bg-[#0a0a0a]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* System Status */}
          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="font-[family-name:var(--font-mono)] text-xs text-emerald-500">
                ONLINE
              </span>
            </div>

            {/* System label */}
            <div className="font-[family-name:var(--font-mono)] text-sm text-gray-500">
              <span className="text-gray-400">ZENIN</span>
              <span className="mx-2 text-gray-700">|</span>
              <span>v1.0</span>
            </div>
          </div>

          {/* Terminal Line */}
          <div className="flex-1 text-center sm:text-left">
            <p className="font-[family-name:var(--font-mono)] text-sm text-gray-400">
              {'>'} System ready. Authentication required.
              <span className="animate-pulse text-emerald-500">_</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(getRoutePath('LOGIN'))}
              className="rounded-md border border-gray-700 bg-transparent px-4 py-2 font-[family-name:var(--font-mono)] text-xs text-gray-400 transition-all duration-200 hover:border-emerald-500/50 hover:text-emerald-400 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
              login
            </button>
            <button
              onClick={() => navigate(getRoutePath('LOGIN'))}
              className="rounded-md border border-violet-500/30 bg-violet-500/10 px-4 py-2 font-[family-name:var(--font-mono)] text-xs text-violet-400 transition-all duration-200 hover:bg-violet-500/20 hover:text-violet-300 hover:shadow-[0_0_10px_rgba(139,92,246,0.3)]"
            >
              register
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
