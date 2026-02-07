import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Hash, Brain } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ConversationList } from './ConversationList';
import { MessageBubble } from './MessageBubble';
import { AgentSelector } from './AgentSelector';
import { MessageTag } from '@/lib/types';
import { streamChat, ChatMessage } from '@/lib/ai-stream';
import { VoiceChatInput } from './VoiceChatInput';
import { toast } from 'sonner';
import { 
  generateEmbedding, 
  findSimilar, 
  routeToAgent, 
  generateTitle 
} from '@/lib/vector-search';

export function ChatView() {
  const { 
    messages, 
    agents, 
    conversations,
    currentConversationId,
    memories,
    addMessage,
    createConversation,
    updateConversation,
    fourEyesMode,
    addMemory
  } = useAppStore();
  
  const [inputValue, setInputValue] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<MessageTag | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [retrievedMemories, setRetrievedMemories] = useState<string[]>([]);
  const [isRouting, setIsRouting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  useEffect(() => {
    if (currentConversation?.agentIds) {
      setSelectedAgents(currentConversation.agentIds);
    }
  }, [currentConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    
    let conversationId = currentConversationId;
    const userInput = inputValue.trim();
    const isFirstMessage = !conversationId || messages.length === 0;
    
    // Create new conversation if none exists
    if (!conversationId) {
      const conv = await createConversation('New Chat', selectedAgents.length > 0 ? selectedAgents : agents.slice(0, 2).map(a => a.id));
      conversationId = conv.id;
    }
    
    const tags: MessageTag[] = activeTag ? [activeTag] : [];
    
    // Add user message
    await addMessage({
      conversationId,
      authorType: 'user',
      content: userInput,
      tags,
    });
    
    setInputValue('');
    setActiveTag(null);
    setIsTyping(true);
    setIsRouting(true);
    
    // Smart agent routing - find the best agent for this query
    let respondingAgent = agents.find(a => selectedAgents.includes(a.id)) || agents[0];
    
    if (agents.length > 1) {
      const routedAgentId = await routeToAgent(
        userInput,
        agents.map(a => ({ id: a.id, name: a.name, role: a.role, strengths: a.strengths }))
      );
      
      if (routedAgentId) {
        const routed = agents.find(a => a.id === routedAgentId);
        if (routed) {
          respondingAgent = routed;
          // Update selected agents to show who's responding
          if (!selectedAgents.includes(routed.id)) {
            setSelectedAgents(prev => [routed.id, ...prev.filter(id => id !== routed.id)]);
          }
        }
      }
    }
    setIsRouting(false);
    
    if (!respondingAgent) {
      toast.error('No agent available to respond');
      setIsTyping(false);
      return;
    }
    
    // RAG: Retrieve relevant memories
    let memoryContext = '';
    setRetrievedMemories([]);
    
    if (memories.length > 0) {
      try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(userInput);
        
        if (queryEmbedding.length > 0) {
          // Find similar memories
          const similar = findSimilar(queryEmbedding, memories, 3, 0.25);
          
          if (similar.length > 0) {
            const memoryTitles = similar.map(s => s.item.title);
            setRetrievedMemories(memoryTitles);
            
            memoryContext = `\n\n[Relevant memories from the Memory Vault:]\n${similar
              .map(s => `- ${s.item.title}: ${s.item.content.slice(0, 300)}${s.item.content.length > 300 ? '...' : ''}`)
              .join('\n')}`;
          }
        }
      } catch (error) {
        console.error('RAG retrieval error:', error);
      }
    }
    
    // Build conversation history for context
    const chatHistory: ChatMessage[] = messages.slice(-10).map(m => ({
      role: m.authorType === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));
    
    // Include memory context in the user message for RAG
    const userMessageWithContext = memoryContext 
      ? `${userInput}${memoryContext}`
      : userInput;
    chatHistory.push({ role: 'user', content: userMessageWithContext });
    
    // Track streaming response
    let streamedContent = '';
    let agentMessageId: string | null = null;
    
    await streamChat({
      messages: chatHistory,
      agentName: respondingAgent.name,
      agentRole: respondingAgent.role,
      agentRules: respondingAgent.rules,
      onDelta: async (chunk) => {
        streamedContent += chunk;
        
        // Create or update the agent message in real-time
        if (!agentMessageId) {
          const msg = await addMessage({
            conversationId: conversationId!,
            authorType: 'agent',
            agentId: respondingAgent.id,
            content: streamedContent,
            tags: [],
          });
          agentMessageId = msg.id;
        } else {
          // Update existing message content in store
          useAppStore.setState((state) => ({
            messages: state.messages.map(m => 
              m.id === agentMessageId 
                ? { ...m, content: streamedContent }
                : m
            ),
          }));
        }
      },
      onDone: async () => {
        setIsTyping(false);
        setRetrievedMemories([]);
        
        // Auto-generate title for new conversations
        if (isFirstMessage && conversationId) {
          const title = await generateTitle(userInput);
          if (title && title !== 'New Chat') {
            await updateConversation(conversationId, { title });
          }
        }
      },
      onError: (error) => {
        console.error('Stream error:', error);
        toast.error(error.message || 'Failed to get AI response');
        setIsTyping(false);
        setRetrievedMemories([]);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = async () => {
    await createConversation('New Chat', agents.slice(0, 2).map(a => a.id));
  };

  const handleSaveToMemory = async (content: string) => {
    await addMemory({
      title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
      content,
      tags: ['from-chat'],
      source: 'Chat',
      confidence: 0.9,
      pinned: false,
    });
  };

  return (
    <div className="h-full flex">
      {/* Conversation List Sidebar */}
      <ConversationList onNewChat={handleNewChat} />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-background-elevated">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-foreground truncate">
              {currentConversation?.title || 'New Conversation'}
            </h2>
            {selectedAgents.length > 0 && (
              <div className="flex items-center gap-1">
                {selectedAgents.slice(0, 3).map(agentId => {
                  const agent = agents.find(a => a.id === agentId);
                  if (!agent) return null;
                  return (
                    <div 
                      key={agent.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: agent.color + '30', color: agent.color }}
                    >
                      {agent.name[0]}
                    </div>
                  );
                })}
                {selectedAgents.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{selectedAgents.length - 3}</span>
                )}
              </div>
            )}
          </div>
          <AgentSelector 
            selectedAgents={selectedAgents} 
            onSelectionChange={setSelectedAgents} 
          />
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4 glow-cyan">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Ready for your command</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Start a conversation with your AI crew. Use tags like "hot thot:" or "Bside:" to categorize messages.
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message}
                agent={message.agentId ? agents.find(a => a.id === message.agentId) : undefined}
                fourEyesMode={fourEyesMode}
                onSaveToMemory={() => handleSaveToMemory(message.content)}
              />
            ))}
            
            {isTyping && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm font-mono">
                  {isRouting ? 'Routing to best agent...' : 'Agent typing...'}
                </span>
              </div>
            )}
            
            {retrievedMemories.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                <Brain className="h-3 w-3 text-primary" />
                <span>Using memories: {retrievedMemories.join(', ')}</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-background-elevated">
          <div className="max-w-3xl mx-auto px-4 pt-4">
            {/* Tag selector */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">Tag:</span>
              {(['hot thot', 'Bside'] as const).map(tag => (
                <Badge
                  key={tag}
                  variant={activeTag === tag ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer text-xs",
                    activeTag === tag && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  <Hash className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <VoiceChatInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSend={async (message, isVoiceAuthenticated) => {
              if (isVoiceAuthenticated) {
                await handleSend();
              } else {
                await handleSend();
              }
            }}
            isTyping={isTyping}
            inputRef={inputRef}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
}
