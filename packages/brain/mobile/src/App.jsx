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
  const [omegaMode, setOmegaMode] = useState(false);
  const [omegaSpeak, setOmegaSpeak] = useState(false);
  const [omegaVoiceProvider, setOmegaVoiceProvider] = useState('elevenlabs');
  const [omegaVoiceId, setOmegaVoiceId] = useState('');
  const [omegaVoiceName, setOmegaVoiceName] = useState('');
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

  const playOmegaAudio = async (text) => {
    if (!omegaSpeak) return;
    try {
      const response = await fetch(`${API_URL}/omega/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          provider: omegaVoiceProvider,
          voiceId: omegaVoiceProvider === 'elevenlabs' ? omegaVoiceId : undefined,
          voice: omegaVoiceProvider === 'openai' ? omegaVoiceName : undefined
        })
      });
      const data = await response.json();
      if (!data?.audioBase64) return;
      const audio = new Audio(`data:${data.audioContentType || 'audio/mpeg'};base64,${data.audioBase64}`);
      await audio.play();
    } catch (error) {
      console.error('Omega speak failed:', error);
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
            const history = messages.slice(-6).map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      const payload = omegaMode
        ? {
            messages: [...history, { role: 'user', content: input }],
            max_tokens: 500,
            temperature: 0.7
          }
        : {
            messages: [...history, { role: 'user', content: input }],
            model: currentAgent,
            max_tokens: 500,
            temperature: 0.7
          };

      const response = await fetch(`${API_URL}${omegaMode ? '/omega/chat' : '/llm/chat'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      await haptic(ImpactStyle.Light);

      const reply = data?.response?.content
        || data?.choices?.[0]?.message?.content
        || data?.reply
        || 'No response';

      setMessages(prev => [...prev, {
        type: 'ai',
        agent: omegaMode ? 'omega' : currentAgent,
        content: reply,
        timestamp: new Date()
      }]);

      if (omegaMode && omegaSpeak && reply) {
        await playOmegaAudio(reply);
      }
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
  const omegaAgent = { id: 'omega', name: 'OmegA', emoji: '??', color: '#10b981' };
  const activeAgent = omegaMode ? omegaAgent : currentAgentData;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="omega-controls">
          <button
            className={`omega-toggle ${omegaMode ? 'active' : ''}`}
            onClick={() => setOmegaMode(!omegaMode)}
          >
            OmegA {omegaMode ? 'On' : 'Off'}
          </button>
          <button
            className={`omega-toggle ${omegaSpeak ? 'active' : ''}`}
            onClick={() => setOmegaSpeak(!omegaSpeak)}
            disabled={!omegaMode}
          >
            Speak {omegaSpeak ? 'On' : 'Off'}
          </button>
          <select
            value={omegaVoiceProvider}
            onChange={(event) => setOmegaVoiceProvider(event.target.value)}
            disabled={!omegaMode}
          >
            <option value="elevenlabs">ElevenLabs</option>
            <option value="openai">OpenAI</option>
          </select>
          <input
            value={omegaVoiceProvider === 'elevenlabs' ? omegaVoiceId : omegaVoiceName}
            onChange={(event) => {
              if (omegaVoiceProvider === 'elevenlabs') {
                setOmegaVoiceId(event.target.value);
              } else {
                setOmegaVoiceName(event.target.value);
              }
            }}
            placeholder={omegaVoiceProvider === 'elevenlabs' ? 'Voice ID' : 'OpenAI voice'}
            disabled={!omegaMode}
          />
        </div>

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
            <div className="welcome-emoji">{activeAgent.emoji}</div>
            <h2>Hello!</h2>
            <p>I'm {activeAgent.name}. How can I help you today?</p>
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
          placeholder={`Ask ${activeAgent.name}...`}
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



