import { useNavigate } from 'react-router-dom';
import { getRoutePath } from '../router/routes';

/**
 * Home Page - Landing page for ZENIN.
 *
 * Clean, professional landing with:
 * - Centered content layout
 * - Brand title and value proposition
 * - Primary CTA to enter the application
 */
export function HomePage(): React.ReactElement {
  const navigate = useNavigate();

  const handleEnterApp = (): void => {
    navigate(getRoutePath('APP'));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
          ZENIN
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-gray-400 sm:text-xl">
          Cognitive analytics platform for intelligent systems.
          <br />
          Real-time insights. Predictive intelligence. Unified control.
        </p>
        <button
          onClick={handleEnterApp}
          className="rounded-lg bg-violet-600 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-950 sm:text-lg"
        >
          Enter Dashboard
        </button>
      </div>

      <footer className="absolute bottom-8 text-sm text-gray-500">
        Built for scale. Designed for clarity.
      </footer>
    </div>
  );
}
