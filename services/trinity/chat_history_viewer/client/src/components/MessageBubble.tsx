import { Message } from '@/hooks/useConversations';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp * 1000);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`message-bubble max-w-xs lg:max-w-2xl ${
          isUser ? 'user-message' : 'assistant-message'
        }`}
      >
        <div className="text-xs text-muted-foreground mb-2">
          {isUser ? 'You' : 'Assistant'} • {format(timestamp, 'MMM d, yyyy HH:mm')}
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </p>
      </div>
    </div>
  );
}
