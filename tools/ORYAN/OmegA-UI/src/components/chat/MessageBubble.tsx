import { Bookmark, Copy, MoreVertical, User } from 'lucide-react';
import { Message, Agent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message;
  agent?: Agent;
  fourEyesMode: boolean;
  onSaveToMemory: () => void;
}

export function MessageBubble({ message, agent, fourEyesMode, onSaveToMemory }: MessageBubbleProps) {
  const isUser = message.authorType === 'user';
  const isSystem = message.authorType === 'system';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Copied to clipboard');
  };

  const handleSaveToMemory = () => {
    onSaveToMemory();
    toast.success('Saved to Memory Vault');
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 rounded-full bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground font-mono">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-3 group animate-fade-in",
      isUser && "flex-row-reverse"
    )}>
      {/* Avatar */}
      <div 
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser 
            ? "bg-secondary/30 text-secondary" 
            : "border"
        )}
        style={agent ? { 
          backgroundColor: agent.color + '20', 
          borderColor: agent.color + '50',
          color: agent.color 
        } : undefined}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <span className="text-sm font-bold">{agent?.name?.[0] || 'A'}</span>
        )}
      </div>

      {/* Message Content */}
      <div className={cn("max-w-[75%] space-y-1", isUser && "items-end")}>
        {/* Header */}
        <div className={cn(
          "flex items-center gap-2 text-xs",
          isUser && "flex-row-reverse"
        )}>
          <span className={cn(
            "font-medium",
            agent && "glow-text"
          )} style={agent ? { color: agent.color } : undefined}>
            {isUser ? 'You' : agent?.name || 'Agent'}
          </span>
          <span className="text-muted-foreground font-mono">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
          {message.tags.length > 0 && (
            <div className="flex gap-1">
              {message.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-[10px] h-4">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Bubble */}
        <div className={cn(
          "relative rounded-lg px-4 py-3",
          isUser 
            ? "bg-primary/20 border border-primary/30" 
            : "bg-card border border-border",
          fourEyesMode && message.tags.includes('Bside') && "four-eyes-blur"
        )}>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
          
          {/* Actions */}
          <div className={cn(
            "absolute -top-2 opacity-0 group-hover:opacity-100 transition-opacity",
            isUser ? "left-2" : "right-2"
          )}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 bg-background border border-border">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isUser ? "start" : "end"}>
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="h-3 w-3 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSaveToMemory}>
                  <Bookmark className="h-3 w-3 mr-2" />
                  Save to Memory
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
