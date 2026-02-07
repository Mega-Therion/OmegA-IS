import { Plus, MessageSquare, MoreVertical, Trash2 } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  onNewChat: () => void;
}

export function ConversationList({ onNewChat }: ConversationListProps) {
  const { conversations, currentConversationId, setCurrentConversation, agents } = useAppStore();

  return (
    <div className="w-64 border-r border-border bg-sidebar flex flex-col">
      <div className="h-14 flex items-center justify-between px-3 border-b border-border">
        <span className="text-sm font-medium text-foreground">Conversations</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className="h-8 w-8 text-muted-foreground hover:text-primary"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.length === 0 && (
            <div className="text-center py-8 px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onNewChat}
                className="mt-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Start Chat
              </Button>
            </div>
          )}
          
          {conversations.map((conv) => {
            const isActive = conv.id === currentConversationId;
            const agentColors = conv.agentIds
              .map(id => agents.find(a => a.id === id)?.color)
              .filter(Boolean)
              .slice(0, 3);
            
            return (
              <button
                key={conv.id}
                onClick={() => setCurrentConversation(conv.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-md transition-all group",
                  isActive
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-sidebar-accent"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isActive ? "text-primary" : "text-foreground"
                    )}>
                      {conv.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex -space-x-1">
                        {agentColors.map((color, idx) => (
                          <div
                            key={idx}
                            className="w-3 h-3 rounded-full border border-background"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
