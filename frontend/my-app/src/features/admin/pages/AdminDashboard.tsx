import { ChatWindow } from '../components/ChatWindow';

/**
 * AdminDashboard - Chat interface view.
 *
 * Renders within AdminLayout (sidebar already provided by parent).
 * Clean chat interface without sidebar wrapper.
 * Accessible via /app/admin/chat route.
 */
export function AdminDashboard(): React.ReactElement {
  return (
    <>
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-800 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="font-mono text-xs text-emerald-500">SYSTEM ONLINE</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Chat Interface</h1>
            <p className="font-mono text-xs text-gray-500">{'>'} interact with the cognitive system</p>
          </div>
        </div>
      </header>

      {/* Chat container */}
      <main className="flex-1 overflow-hidden p-4">
        <ChatWindow />
      </main>
    </>
  );
}
