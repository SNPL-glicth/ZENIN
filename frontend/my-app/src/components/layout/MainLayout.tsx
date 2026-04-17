import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';

interface MainLayoutProps {
  children?: React.ReactNode;
}

/**
 * Main Layout component.
 *
 * Wraps all pages with consistent structure:
 * - Fixed header at top (Footer component repurposed as header)
 * - Main content with padding for fixed header
 * - Dark cyber theme background
 * - Ensures responsive behavior across devices
 *
 * Can render children directly or use Outlet for nested routes.
 */
export function MainLayout({ children }: MainLayoutProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Fixed Header */}
      <div className="fixed left-0 right-0 top-0 z-50">
        <Footer />
      </div>

      {/* Main content with padding for fixed header */}
      <main className="pt-20">{children ?? <Outlet />}</main>
    </div>
  );
}
