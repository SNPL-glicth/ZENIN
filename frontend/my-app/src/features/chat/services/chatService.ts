const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
  lastMessage: string;
  severity: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  analysisResultId?: string;
}

export interface CreateChatResult {
  id: string;
  createdAt: string;
}

export interface ChatSessionDetail {
  id: string;
  messages: ChatMessage[];
  messageCount: number;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Get all chat sessions for the authenticated user.
 * GET /api/chat-sessions
 */
export async function getChatSessions(): Promise<ChatSession[]> {
  const response = await fetch(`${API_URL}/api/chat-sessions`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch chat sessions');
  }

  return response.json();
}

/**
 * Create a new chat session.
 * POST /api/chat-sessions
 */
export async function createChatSession(): Promise<CreateChatResult> {
  const response = await fetch(`${API_URL}/api/chat-sessions`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to create chat session');
  }

  return response.json();
}

/**
 * Get a specific chat session with all its messages.
 * GET /api/chat-sessions/{id}
 */
export async function getChatSession(chatId: string): Promise<ChatSessionDetail> {
  const response = await fetch(`${API_URL}/api/chat-sessions/${chatId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch chat session');
  }

  return response.json();
}

/**
 * Delete a chat session.
 * DELETE /api/chat-sessions/{id}
 */
export async function deleteChatSession(chatId: string): Promise<void> {
  console.log('Making DELETE request to:', `${API_URL}/api/chat-sessions/${chatId}`);
  const response = await fetch(`${API_URL}/api/chat-sessions/${chatId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  console.log('Delete response status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('Delete failed:', response.status, errorText);
    throw new Error(`Failed to delete chat session: ${response.status} ${errorText}`);
  }
  
  console.log('Delete successful');
}

/**
 * Add a message to a chat session.
 * POST /api/chat-sessions/{id}/messages
 */
export async function addMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  analysisResultId?: string
): Promise<{ id: string; createdAt: string }> {
  const response = await fetch(`${API_URL}/api/chat-sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role, content, analysisResultId }),
  });

  if (!response.ok) {
    throw new Error('Failed to add message');
  }

  return response.json();
}

/**
 * Reset all user data (chat sessions, messages, analysis results).
 * POST /api/chat-sessions/reset
 */
export async function resetUserData(): Promise<{
  chatSessionsDeleted: number;
  chatMessagesDeleted: number;
  analysisResultsDeleted: number;
}> {
  const response = await fetch(`${API_URL}/api/chat-sessions/reset`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to reset user data');
  }

  return response.json();
}

/**
 * Bulk delete chat sessions.
 * DELETE /api/chat-sessions/bulk
 */
export async function bulkDeleteChatSessions(ids: string[]): Promise<void> {
  const response = await fetch(`${API_URL}/api/chat-sessions/bulk`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    throw new Error('Failed to bulk delete chat sessions');
  }
}
