import { FileText, User, Bot, Loader } from 'lucide-react';

export interface ChatMessageData {
  id: string;
  type: 'user' | 'system';
  content: string;
  filename?: string;
  classification?: string;
  status?: string;
  urgency?: number;
  sentiment?: string;
  isTyping?: boolean;
  timestamp: number;
}

interface ChatMessageProps {
  message: ChatMessageData;
  isMobile?: boolean;
}

const classificationLabel = (cls: string): string => {
  const labels: Record<string, string> = {
    numeric: 'Infrastructure',
    text: 'Documento',
    mixed: 'Datos Mixtos',
  };
  return labels[cls] || cls;
};

const classificationColor = (cls: string): string => {
  const colors: Record<string, string> = {
    numeric: 'bg-blue-100 text-blue-800',
    text: 'bg-purple-100 text-purple-800',
    mixed: 'bg-orange-100 text-orange-800',
  };
  return colors[cls] || 'bg-gray-100 text-gray-800';
};

export const ChatMessage = ({ message, isMobile = false }: ChatMessageProps): React.ReactElement => {
  const isUser = message.type === 'user';

  return (
    <div className={`flex gap-2 md:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
      }`}>
        {isUser ? <User size={isMobile ? 14 : 16} /> : <Bot size={isMobile ? 14 : 16} />}
      </div>

      <div className={`${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} ${isUser ? 'text-right' : ''}`}>
        {message.isTyping ? (
          <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg ${
            isUser ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
          }`}>
            <Loader size={16} className="animate-spin" />
            <span className="text-sm">Analizando...</span>
          </div>
        ) : (
          <div className={`inline-block text-left px-4 py-3 rounded-lg ${
            isUser ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'
          }`}>
            {message.filename && (
              <div className="flex items-center gap-2 mb-2">
                <FileText size={isMobile ? 14 : 16} className={isUser ? 'text-white/70' : 'text-gray-500'} />
                <span className="text-sm font-medium truncate max-w-[200px] md:max-w-none">{message.filename}</span>
              </div>
            )}

            {message.classification && (
              <div className="mb-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                  classificationColor(message.classification)
                }`}>
                  {classificationLabel(message.classification)}
                  {message.status && message.status !== 'analyzed' && ' — '}
                  {message.status && message.status !== 'analyzed' && message.status}
                </span>
              </div>
            )}

            <p className="text-sm whitespace-pre-line">{message.content}</p>

            {message.urgency !== undefined && (
              <div className="mt-2 pt-2 border-t border-current/20 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Urgency:</span>
                  <span className="font-medium">{message.urgency.toFixed(2)}</span>
                </div>
                {message.sentiment && (
                  <div className="flex justify-between">
                    <span>Sentiment:</span>
                    <span className="font-medium">{message.sentiment}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
