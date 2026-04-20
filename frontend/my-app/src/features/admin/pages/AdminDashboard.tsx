import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { ChatArea } from '../components/ChatArea';
import type { UseChatSessionReturn } from '../hooks/useChatSession';

/**
 * AdminDashboard - Chat interface page.
 * 
 * This component:
 * - Reads sessionId from URL and syncs with shared state
 * - Renders ChatArea which gets state from useOutletContext
 * - All session management is handled by useChatSession in AdminLayout
 */
export function AdminDashboard(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeSessionId, switchSession, sessions, loadSessions } = 
    useOutletContext<UseChatSessionReturn>();
  
  const hasRedirectedRef = useRef(false);

  // Single effect to handle URL sync, session loading, and redirects
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Load sessions on mount only
    loadSessions();
  }, []); // Intentionally empty - only run on mount

  // Separate effect for URL/session sync (avoids dependency on loadSessions)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlSessionId = params.get('session');
    const sessionExists = urlSessionId && sessions.some(s => s.id === urlSessionId);
    
    if (urlSessionId && sessionExists && urlSessionId !== activeSessionId) {
      // URL has a valid different session - switch to it
      switchSession(urlSessionId);
      hasRedirectedRef.current = false;
    } else if (sessions.length > 0 && (!sessionExists || !activeSessionId)) {
      // URL session invalid or no active session - redirect to first available
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        navigate(`/app/admin/chat?session=${sessions[0].id}`, { replace: true });
      }
    }
  }, [location.search, activeSessionId, sessions, switchSession, navigate]);

  return (
    <div className="h-full overflow-hidden">
      <ChatArea />
    </div>
  );
}

