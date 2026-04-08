import { useNavigate } from 'react-router-dom';
import { getRoutePath } from '../../../router/routes';

/**
 * CTASection - System activation terminal.
 *
 * Final step before entering the platform.
 * Terminal-style interface showing system ready state.
 */
export function CTASection(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden border-t border-gray-900 bg-[#0a0a0a] px-4 py-20 sm:px-6 lg:px-8">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      {/* Subtle glow from bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-violet-900/5 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-3xl">
        {/* Terminal Window */}
        <div className="rounded-lg border border-gray-800 bg-[#0f0f0f] p-6 sm:p-8">
          {/* Terminal Header */}
          <div className="mb-6 flex items-center gap-2 border-b border-gray-800 pb-4 font-[family-name:var(--font-mono)] text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
            <span>zenin-core</span>
            <span className="text-gray-700">—</span>
            <span>system_boot</span>
          </div>

          {/* Terminal Output */}
          <div className="space-y-2 font-[family-name:var(--font-mono)] text-sm">
            <p className="text-gray-500">
              {'>'} system_ready = true
            </p>
            <p className="text-gray-500">
              {'>'} awaiting_connection<span className="animate-pulse text-emerald-500">_</span>
            </p>
            <p className="text-gray-500">
              {'>'} <span className="text-emerald-400">ready to initialize session</span>
            </p>
          </div>

          {/* Action */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate(getRoutePath('APP'))}
              className="group relative rounded-md border border-violet-500/50 bg-violet-500/10 px-8 py-3 font-[family-name:var(--font-mono)] text-sm font-semibold text-violet-300 transition-all duration-300 hover:bg-violet-500/20 hover:text-violet-200 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 active:scale-[1.02]"
            >
              <span className="mr-2 text-violet-400">$</span>
              initialize_session
            </button>
          </div>

          {/* System Status Line */}
          <div className="mt-6 border-t border-gray-800 pt-4 text-center">
            <p className="font-[family-name:var(--font-mono)] text-xs text-gray-600">
              [ READY ] [ AUTH: PENDING ] [ PRESS ENTER TO CONNECT ]
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
