'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ErrorBoundary } from 'react-error-boundary'
import { useHotkeys } from 'react-hotkeys-hook'
import { knowledgeBase } from '@/data/knowledge'
import { retrieveContext } from '@/utils/rag'
import { useNeuroStore } from '@/store/useNeuroStore'

const qualityConfig = {
  ultra: { glow: 'shadow-glow', density: 'bg-cyan-400/20' },
  balanced: { glow: 'shadow-lg', density: 'bg-cyan-400/10' },
  lite: { glow: 'shadow-md', density: 'bg-cyan-400/5' }
}

const generateAssistantReply = async (prompt: string, ragSnippets: string[], agent: string, useOmega: boolean): Promise<string> => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context: ragSnippets, agent, useOmega })
    })
    const data = await response.json()
    return data.reply || 'Neural link established. Awaiting calibration.'
  } catch (error) {
    console.error('Chat API error:', error)
    const trimmed = prompt.slice(0, 140)
    const grounded = ragSnippets.length
      ? `Grounded context: ${ragSnippets.join(' | ')}`
      : 'No external context surfaced; responding from core heuristics.'
    return `[Offline] Acknowledged. Optimizing response for: "${trimmed}". ${grounded}`
  }
}

const AGENTS = [
  { id: 'gemini', name: 'Gemini', desc: 'Planning & Strategy' },
  { id: 'claude', name: 'Claude', desc: 'Deep Reasoning' },
  { id: 'codex', name: 'Codex', desc: 'Code Execution' },
  { id: 'grok', name: 'Grok', desc: 'Real-time Search' }
]

const FallbackScreen = ({ error }: { error: Error }) => (
  <div className="min-h-screen flex items-center justify-center bg-black text-red-400">
    <div className="text-center space-y-4">
      <h1 className="text-2xl">Neuro-Link Fault Detected</h1>
      <p className="text-sm opacity-70">{error.message}</p>
      <button
        className="rounded-full border border-red-400/50 px-5 py-2"
        onClick={() => window.location.reload()}
      >
        Restart Session
      </button>
    </div>
  </div>
)

import { Terminal } from '@/components/Terminal'
import { Podcast } from '@/components/Podcast'
import { Vision } from '@/components/Vision'

export default function Home() {
  const {
    messages,
    memory,
    metrics,
    ragEnabled,
    qualityMode,
    activeTab,
    addMessage,
    addMemory,
    togglePin,
    toggleRag,
    setQualityMode,
    setActiveTab,
    clearSession,
    setMetrics
  } = useNeuroStore()

  // ... (keep search, voice, submit logic same as previous Home function up to handleSubmit)
  const [input, setInput] = useState('')
  const [ragMatches, setRagMatches] = useState(() => retrieveContext('', knowledgeBase))
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState('gemini')
  const [omegaMode, setOmegaMode] = useState(false)
  const [omegaSpeak, setOmegaSpeak] = useState(false)
  const [omegaVoiceId, setOmegaVoiceId] = useState('')
  const [omegaVoiceProvider, setOmegaVoiceProvider] = useState('elevenlabs')
  const [omegaVoiceName, setOmegaVoiceName] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        fps: Math.round(55 + Math.random() * 10),
        latency: Math.round(18 + Math.random() * 20),
        memory: Math.round(420 + Math.random() * 180),
        mood: Math.round((0.4 + Math.random() * 0.5) * 100) / 100
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [setMetrics])

  // (rest of useEffects and voice logic remains similar to previous version)

  const fetchRagContext = (text: string) => {
    if (ragEnabled) {
      setRagMatches(retrieveContext(text, knowledgeBase))
    }
  }

  const playEffect = async (reply: string) => {
    if (omegaMode && omegaSpeak) {
      try {
        const response = await fetch('/api/omega/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: reply, voiceId: omegaVoiceId, provider: omegaVoiceProvider })
        })
        const data = await response.json()
        if (data?.audioBase64) {
          const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`)
          await audio.play()
        }
      } catch (e) {
        console.warn('Speech failed', e)
      }
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return
    const timestamp = new Date().toISOString()
    const msg = input.trim()
    setInput('')

    addMessage({ id: `msg-${timestamp}`, role: 'user', content: msg, timestamp })

    setIsLoading(true)
    const matches = ragEnabled ? retrieveContext(msg, knowledgeBase) : []
    const snippets = matches.flatMap(m => m.highlights)

    const response = await generateAssistantReply(msg, snippets, selectedAgent, omegaMode)
    setIsLoading(false)

    addMessage({ id: `assist-${timestamp}`, role: 'assistant', content: response, timestamp })
    playEffect(response)

    if (msg.length > 10) {
      addMemory({ id: `mem-${timestamp}`, label: `Note: ${msg.slice(0, 20)}`, content: msg, pinned: false, updatedAt: timestamp })
    }
  }

  return (
    <ErrorBoundary FallbackComponent={FallbackScreen}>
      <div className="flex h-screen bg-cyber-bg overflow-hidden text-cyan-100 font-sans">
        {/* Navigation Sidebar */}
        <aside className="w-20 lg:w-64 border-r border-cyan-400/20 bg-black/40 flex flex-col items-center lg:items-stretch py-8 px-4 gap-8">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-xl bg-cyan-400 shadow-glow flex items-center justify-center text-black font-bold">Ω</div>
            <span className="hidden lg:block text-xl font-bold tracking-tighter">OmegA HUD</span>
          </div>

          <nav className="flex-1 space-y-2 w-full">
            {[
              { id: 'console', label: 'Command Center', icon: '⚡' },
              { id: 'terminal', label: 'Neural Terminal', icon: '💻' },
              { id: 'podcast', label: 'Briefings', icon: '🎙️' },
              { id: 'vision', label: 'Vision Stream', icon: '👁️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 shadow-glow-small' : 'text-cyan-100/40 hover:bg-white/5'}`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="hidden lg:block text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="hidden lg:block p-4 rounded-3xl bg-purple-400/10 border border-purple-400/20 space-y-2">
            <div className="flex justify-between text-[10px] uppercase opacity-50">
              <span>Agent Status</span>
              <span className="text-green-400">Ready</span>
            </div>
            <div className="text-xs font-medium text-purple-300 capitalize">{selectedAgent} Online</div>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-20 border-b border-cyan-400/10 flex items-center justify-between px-8 bg-black/20">
            <div className="flex items-center gap-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-cyan-400/60">{activeTab}</h2>
              <div className="h-4 w-px bg-cyan-400/20" />
              <div className="flex gap-4 text-[10px] mono opacity-80">
                <span>FPS: {metrics.fps}</span>
                <span>LAT: {metrics.latency}ms</span>
                <span>MEM: {metrics.memory}MB</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={clearSession} className="text-xs text-red-400/60 hover:text-red-400 underline decoration-red-400/30">Reset Link</button>
              <div className="h-8 w-8 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center">RY</div>
            </div>
          </header>

          <main className="flex-1 p-8 overflow-y-auto">
            {activeTab === 'console' && (
              <div className="grid gap-8 lg:grid-cols-[1fr_320px] h-full max-w-7xl mx-auto">
                <div className="flex flex-col h-full bg-black/40 rounded-3xl border border-cyan-400/10 p-6">
                  <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                    {messages.map(m => (
                      <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl border ${m.role === 'user' ? 'bg-cyan-400/10 border-cyan-400/40' : 'bg-purple-400/10 border-purple-400/40'}`}>
                          <div className="text-[10px] uppercase opacity-40 mb-1">{m.role}</div>
                          <p className="text-sm leading-relaxed">{m.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && <div className="text-xs italic opacity-50 animate-pulse">Assistant is thinking...</div>}
                    <div ref={endRef} />
                  </div>
                  <form onSubmit={handleSubmit} className="mt-6 flex gap-3 p-2 bg-black/40 rounded-2xl border border-cyan-400/20 shadow-inner">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Transmit directive..."
                      className="flex-1 bg-transparent border-none outline-none px-2 text-sm"
                    />
                    <button type="submit" className="h-10 w-10 flex items-center justify-center rounded-xl bg-cyan-400 text-black hover:scale-105 transition-transform shadow-glow">➜</button>
                  </form>
                </div>

                <aside className="space-y-6 hidden lg:block">
                  <div className="p-6 rounded-3xl bg-cyan-400/5 border border-cyan-400/10">
                    <h3 className="text-xs font-bold uppercase mb-4 opacity-50">Memory Lattice</h3>
                    <div className="space-y-3">
                      {memory.slice(0, 5).map(m => (
                        <div key={m.id} className="text-xs p-3 rounded-xl bg-white/5 border border-white/5">
                          {m.content.slice(0, 100)}...
                        </div>
                      ))}
                      {memory.length === 0 && <div className="text-xs opacity-30 italic">No memories captured.</div>}
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === 'terminal' && <div className="h-full max-w-5xl mx-auto"><Terminal /></div>}
            {activeTab === 'podcast' && <div className="h-full max-w-4xl mx-auto"><Podcast /></div>}
            {activeTab === 'vision' && <div className="h-full max-w-6xl mx-auto"><Vision /></div>}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
