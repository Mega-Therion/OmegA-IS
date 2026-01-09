import { ConversationList } from '@/components/ConversationList';
import { MessageBubble } from '@/components/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConversations } from '@/hooks/useConversations';
import { Menu, X, Search, Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/**
 * Chat History Viewer - Dark Mode Conversational Interface
 * Design Philosophy: Glassmorphism aesthetic with conversational metaphor
 * - Dark navy background with frosted glass cards
 * - Message bubbles with distinct visual separation (warm amber for user, cool blue for assistant)
 * - Smooth animations and transitions
 * - Responsive layout with collapsible sidebar
 */
export default function Home() {
  const {
    conversations,
    allConversations,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedConversation,
    setSelectedConversationId,
  } = useConversations();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation]);

  const handleDownloadTranscript = () => {
    if (!selectedConversation) return;

    const transcript = selectedConversation.messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`)
      .join('\n\n');

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(transcript)
    );
    element.setAttribute('download', `${selectedConversation.title}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } glass-card border-r border-border transition-all duration-300 flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <h1 className="text-xl font-bold text-primary">Chat History</h1>
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
              {allConversations.length}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading conversations...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id || null}
              onSelect={setSelectedConversationId}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="glass-card border-b border-border p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {selectedConversation && (
            <div className="flex-1 mx-4">
              <h2 className="text-lg font-semibold truncate">
                {selectedConversation.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedConversation.messageCount} messages
              </p>
            </div>
          )}

          {selectedConversation && (
            <Button
              onClick={handleDownloadTranscript}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download size={16} />
              Export
            </Button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedConversation ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-2xl font-bold mb-2">Select a Conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the sidebar to view its messages
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {selectedConversation.messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No messages in this conversation</p>
                </div>
              ) : (
                <>
                  {selectedConversation.messages.map((message, index) => (
                    <MessageBubble key={index} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
