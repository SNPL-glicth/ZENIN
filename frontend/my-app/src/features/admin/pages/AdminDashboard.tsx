import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ChatArea } from '../components/ChatArea';
import {
  createChatSession,
  getChatSessions,
} from '../../chat/services/chatService';

/**
 * AdminDashboard - Chat interface with unified sidebar.
 * 
 * The sidebar (in Sidebar.tsx) now handles:
 * - Nuevo chat button
 * - Buscar chats
 * - Recents (chat list)
 * - User profile & Reset
 * 
 * This component just reads sessionId from URL and renders ChatArea.
 */
export function AdminDashboard(): React.ReactElement {
  const location = useLocation();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Read sessionId from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session');
    
    if (sessionId) {
      setActiveSessionId(sessionId);
      setIsInitializing(false);
    } else {
      // No session selected - create one or load existing
      const initChat = async () => {
        try {
          const sessions = await getChatSessions();
          if (sessions.length > 0) {
            // Redirect to first session
            window.location.href = `/app/admin/chat?session=${sessions[0].id}`;
          } else {
            // Create new session
            const newSession = await createChatSession();
            window.location.href = `/app/admin/chat?session=${newSession.id}`;
          }
        } catch (err) {
          console.error('Failed to initialize chat:', err);
          setIsInitializing(false);
        }
      };
      initChat();
    }
  }, [location.search]);

  if (isInitializing) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500 font-mono text-sm">Inicializando chat...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <ChatArea 
        sessionId={activeSessionId}
        onDocumentUploaded={() => {
          // Refresh sidebar data by reloading page or triggering event
          window.dispatchEvent(new CustomEvent('refresh-sessions'));
        }}
      />
    </div>
  );
}

