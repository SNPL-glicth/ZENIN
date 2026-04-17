import { useNavigate } from 'react-router-dom';
import { getRoutePath } from '../../../router/routes';

/**
 * AdminHome - Landing page for admin panel.
 *
 * Welcome screen with primary navigation actions.
 * User lands here after login.
 */
export function AdminHome(): React.ReactElement {
  const navigate = useNavigate();

  const handleGoToChat = (): void => {
    navigate(getRoutePath('CHAT'));
  };

  const handleViewPredictions = (): void => {
    navigate(getRoutePath('PREDICTIONS'));
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-3xl font-bold text-white">ZENIN Admin Panel</h1>
        <p className="font-mono text-sm text-gray-500">{'>'} Sistema de análisis cognitivo</p>
      </div>

      {/* Action Cards */}
      <div className="grid w-full max-w-3xl gap-6 md:grid-cols-2">
        {/* Chat Card */}
        <button
          onClick={handleGoToChat}
          className="group flex flex-col items-center rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center transition-all hover:border-purple-700 hover:bg-gray-800"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-900/30 transition-colors group-hover:bg-purple-900/50">
            <svg className="h-8 w-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">Chat</h2>
          <p className="font-mono text-sm text-gray-500">
            Interact with the cognitive system
          </p>
          <div className="mt-4 font-mono text-xs text-purple-400">
            {'>'} Go to Chat
          </div>
        </button>

        {/* Predictions Card */}
        <button
          onClick={handleViewPredictions}
          className="group flex flex-col items-center rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center transition-all hover:border-emerald-700 hover:bg-gray-800"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900/30 transition-colors group-hover:bg-emerald-900/50">
            <svg className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">Predictions</h2>
          <p className="font-mono text-sm text-gray-500">
            View AI-generated predictions
          </p>
          <div className="mt-4 font-mono text-xs text-emerald-400">
            {'>'} View Predictions
          </div>
        </button>
      </div>

      {/* Footer hint */}
      <div className="mt-12 text-center">
        <p className="font-mono text-xs text-gray-600">
          Use the sidebar to navigate between sections
        </p>
      </div>
    </div>
  );
}
