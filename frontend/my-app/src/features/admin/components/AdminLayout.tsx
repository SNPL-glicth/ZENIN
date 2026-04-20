import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useChatSession } from '../hooks/useChatSession';

/**
 * AdminLayout - Shared layout for all admin views.
 *
 * Provides consistent navigation and structure for:
 * - Chat interface (/app/admin/chat)
 * - Metrics & Analytics dashboard (/app/admin/metrics)
 *
 * Features:
 * - Sidebar always visible (push-based, not overlay)
 * - Dynamic content area via Outlet
 * - Consistent styling across all admin views
 */
export function AdminLayout(): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatSession = useChatSession();

  // Load sessions on mount
  useEffect(() => {
    chatSession.loadSessions();
  }, [chatSession.loadSessions]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Sidebar - always visible, pushes content */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen((v) => !v)} 
        chatSession={chatSession}
      />

      {/* Main content area - dynamic via Outlet */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Content injected here based on route - receives chat context */}
        <Outlet context={chatSession} />
      </div>
    </div>
  );
}
