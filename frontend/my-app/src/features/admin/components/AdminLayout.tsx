import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/**
 * AdminLayout - Shared layout for all admin views.
 *
 * Provides consistent navigation and structure for:
 * - Chat interface (/app/admin/chat)
 * - Predictions dashboard (/app/admin/predictions)
 *
 * Features:
 * - Sidebar always visible (push-based, not overlay)
 * - Dynamic content area via Outlet
 * - Consistent styling across all admin views
 */
export function AdminLayout(): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Sidebar - always visible, pushes content */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />

      {/* Main content area - dynamic via Outlet */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Content injected here based on route */}
        <Outlet />
      </div>
    </div>
  );
}
