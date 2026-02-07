import { useEffect, useState, useMemo } from 'react';

export interface Message {
  role: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  messages: Message[];
  preview: string;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await fetch('/conversations-processed.json');
        if (!response.ok) throw new Error('Failed to load conversations');
        const data = await response.json();
        setConversations(data);
        if (data.length > 0) {
          setSelectedConversationId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, []);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const titleMatch = conv.title.toLowerCase().includes(query);
      const previewMatch = conv.preview.toLowerCase().includes(query);
      const messageMatch = conv.messages.some((msg) =>
        msg.text.toLowerCase().includes(query)
      );
      return titleMatch || previewMatch || messageMatch;
    });
  }, [conversations, searchQuery]);

  const selectedConversation = useMemo(() => {
    return conversations.find((conv) => conv.id === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  return {
    conversations: filteredConversations,
    allConversations: conversations,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedConversation,
    setSelectedConversationId,
  };
}
