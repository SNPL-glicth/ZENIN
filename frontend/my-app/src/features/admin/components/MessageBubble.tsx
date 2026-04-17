interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp?: Date;
  fileName?: string;
}

/**
 * MessageBubble - Terminal-styled chat message.
 *
 * User messages align right (cyan theme).
 * System messages align left (purple theme).
 * Clean file display without emojis.
 */
export function MessageBubble({
  content,
  isUser,
  timestamp,
  fileName,
}: MessageBubbleProps): React.ReactElement {
  const isFileMessage = !!fileName;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg border px-4 py-3 ${
          isUser
            ? 'border-cyan-900/50 bg-cyan-950/30 text-cyan-100'
            : 'border-purple-900/50 bg-purple-950/30 text-purple-100'
        }`}
      >
        {isFileMessage && (
          <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate font-mono">{fileName}</span>
          </div>
        )}
        <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
          {content}
        </p>
        {timestamp && (
          <div className="mt-2 text-right text-xs text-gray-500">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}
