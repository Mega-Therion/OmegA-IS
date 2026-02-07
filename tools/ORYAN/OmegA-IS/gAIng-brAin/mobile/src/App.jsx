/**
 * OMEGA Mobile - Main App Component
 */

import React, { useState, useRef, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import './App.css';

const API_URL = typeof __API_URL__ !== 'undefined' ? __API_URL__ : 'http://localhost:8080';

const AGENTS = [
  { id: 'gemini', name: 'Gemini', emoji: '🌟', color: '#4285f4' },
  { id: 'claude', name: 'Claude', emoji: '🧠', color: '#7c3aed' },
  { id: 'codex', name: 'Codex', emoji: '💻', color: '#10b981' },
  { id: 'grok', name: 'Grok', emoji: '🔍', color: '#f59e0b' },
];

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [currentAgent, setCurrentAgent] = useState('gemini');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef(null);

  // Check connection status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/health`, { timeout: 5000 });
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Haptic feedback helper
  const haptic = async (style = ImpactStyle.Light) => {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      // Not on mobile
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    await haptic(ImpactStyle.Medium);
    
    const userMessage = { type: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          agent: currentAgent,
          context: messages.slice(-10).map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        })
      });

      const data = await response.json();
      
      await haptic(ImpactStyle.Light);
      
      setMessages(prev => [...prev, {
        type: 'ai',
        agent: currentAgent,
        content: data.reply || 'No response',
        timestamp: new Date()
      }]);
    } catch (error) {
      await haptic(ImpactStyle.Heavy);
      
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'Failed to connect. Check your network.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle agent switch
  const switchAgent = async (agentId) => {
    await haptic();
    setCurrentAgent(agentId);
  };

  const currentAgentData = AGENTS.find(a => a.id === currentAgent);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="status-indicator" data-online={isOnline} />
          <h1>OMEGA Brain</h1>
        </div>
        <div className="agent-pills">
          {AGENTS.map(agent => (
            <button
              key={agent.id}
              className={`agent-pill ${agent.id === currentAgent ? 'active' : ''}`}
              onClick={() => switchAgent(agent.id)}
              style={{ '--agent-color': agent.color }}
            >
              <span>{agent.emoji}</span>
              <span>{agent.name}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Messages */}
      <main className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <div className="welcome-emoji">{currentAgentData.emoji}</div>
            <h2>Hello!</h2>
            <p>I'm {currentAgentData.name}. How can I help you today?</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.type}`}>
            {msg.type === 'ai' && (
              <div className="message-agent">
                {AGENTS.find(a => a.id === msg.agent)?.emoji} {msg.agent}
              </div>
            )}
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai loading">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="input-area">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder={`Ask ${currentAgentData.name}...`}
          disabled={isLoading}
        />
        <button 
          onClick={sendMessage} 
          disabled={isLoading || !input.trim()}
          className="send-btn"
        >
          {isLoading ? '...' : '↑'}
        </button>
      </footer>
    </div>
  );
}

export default App;
