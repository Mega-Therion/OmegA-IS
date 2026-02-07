import { Conversation } from '@/hooks/useConversations';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="flex flex-col gap-2">
      {conversations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 opacity-50" size={32} />
          <p>No conversations found</p>
        </div>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`glass-card w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-white/12 ${
              selectedId === conv.id
                ? 'ring-2 ring-primary bg-white/12'
                : 'hover:bg-white/8'
            }`}
          >
            <h3 className="font-semibold text-sm line-clamp-2 text-foreground mb-1">
              {conv.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {conv.preview}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{conv.messageCount} messages</span>
              <span>
                {formatDistanceToNow(new Date(conv.createdAt * 1000), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
