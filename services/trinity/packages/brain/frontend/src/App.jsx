import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Send, Activity, BarChart3, MessageSquare, Target, Volume2, VolumeX, Upload, X, CheckCircle, Clock, AlertCircle, Brain, Code } from 'lucide-react'
import MissionBoard from './components/MissionBoard'
import AgentChat from './components/AgentChat'
import HealthMonitor from './components/HealthMonitor'
import Analytics from './components/Analytics'
import VoiceInterface from './components/VoiceInterface'
import NeuroLink from './components/NeuroLink'
import CodeWorkbench from './components/CodeWorkbench'

// Sound effects (beep sounds using Web Audio API)
const playSound = (frequency = 800, duration = 100) => {
  if (typeof window === 'undefined') return
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = frequency
  oscillator.type = 'sine'

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration / 1000)
}

function App() {
  // Navigation state
  const [currentView, setCurrentView] = useState('mission') // mission, chat, health, analytics, code

  // Voice state
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState('')

  // Mission state
  const [missions, setMissions] = useState([])
  const [newMission, setNewMission] = useState('')

  // Agent state
  const [agents, setAgents] = useState([
    { id: 'claude', name: 'Claude', status: 'online', specialty: 'Analysis & Architecture' },
    { id: 'gemini', name: 'Gemini', specialty: 'Planning & Coordination' },
    { id: 'codex', name: 'Codex', specialty: 'Quick Edits' },
    { id: 'perplexity', name: 'Perplexity', specialty: 'Research' },
    { id: 'deepseek', name: 'DeepSeek', specialty: 'Code Generation' },
    { id: 'grok', name: 'Grok', specialty: 'Real-time Search' }
  ])
  const [selectedAgent, setSelectedAgent] = useState('claude')

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalMissions: 0,
    completedMissions: 0,
    activeAgents: 6,
    avgResponseTime: 0
  })

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState([])

  // WebSocket connection
  const ws = useRef(null)
  const recognition = useRef(null)
  const synthesis = window.speechSynthesis

  // Initialize WebSocket
  useEffect(() => {
    connectWebSocket()
    loadMissions()
    loadAgentHealth()

    return () => {
      if (ws.current) ws.current.close()
    }
  }, [])

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.hostname}:8080/ws?agent=frontend`

    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      console.log('WebSocket connected')
      playSound(1200, 100)
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleWebSocketMessage(data)
    }

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.current.onclose = () => {
      console.log('WebSocket closed, reconnecting...')
      setTimeout(connectWebSocket, 3000)
    }
  }

  const handleWebSocketMessage = (data) => {
    playSound(900, 50)

    if (data.type === 'mission_update') {
      setMissions(prev => prev.map(m =>
        m.id === data.mission.id ? data.mission : m
      ))
    } else if (data.type === 'agent_status') {
      setAgents(prev => prev.map(a =>
        a.id === data.agent ? { ...a, status: data.status } : a
      ))
    }
  }

  // Load missions from backend
  const loadMissions = async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()

      if (data.ok && data.tasks) {
        setMissions(data.tasks.map(task => ({
          id: task.id,
          title: task.description || task.payload?.description || 'Untitled Mission',
          status: task.status,
          agent: task.assigned_agent || 'unassigned',
          priority: task.priority || 'medium',
          created: task.created_at,
          deadline: task.deadline
        })))
      }
    } catch (error) {
      console.error('Failed to load missions:', error)
    }
  }

  // Load agent health
  const loadAgentHealth = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()

      if (data.ok && data.agents) {
        setAgents(prev => prev.map(agent => {
          const healthData = data.agents.find(a => a.name === agent.id)
          return healthData ? { ...agent, ...healthData } : agent
        }))
      }
    } catch (error) {
      console.error('Failed to load agent health:', error)
    }
  }

  // Voice recognition setup
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition.current = new SpeechRecognition()
    recognition.current.continuous = true
    recognition.current.interimResults = true

    recognition.current.onstart = () => {
      setIsListening(true)
      playSound(1000, 100)
    }

    recognition.current.onresult = (event) => {
      const current = event.resultIndex
      const transcriptText = event.results[current][0].transcript
      setTranscript(transcriptText)

      if (event.results[current].isFinal) {
        handleVoiceCommand(transcriptText)
      }
    }

    recognition.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.current.onend = () => {
      setIsListening(false)
    }

    recognition.current.start()
  }

  const stopListening = () => {
    if (recognition.current) {
      recognition.current.stop()
      setIsListening(false)
      playSound(800, 100)
    }
  }

  const handleVoiceCommand = async (command) => {
    console.log('Voice command:', command)

    // Send to backend for processing
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'user',
          recipient: selectedAgent,
          content: command,
          message_type: 'voice_command'
        })
      })

      const data = await response.json()

      if (data.ok && !isMuted) {
        // Speak response
        const utterance = new SpeechSynthesisUtterance(data.message?.content || 'Command received')
        synthesis.speak(utterance)
      }
    } catch (error) {
      console.error('Failed to send voice command:', error)
    }

    setTranscript('')
  }

  // Create new mission
  const createMission = async () => {
    if (!newMission.trim()) return

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newMission,
          assigned_agent: selectedAgent,
          priority: 'medium'
        })
      })

      const data = await response.json()

      if (data.ok) {
        playSound(1200, 150)
        setNewMission('')
        loadMissions()
      }
    } catch (error) {
      console.error('Failed to create mission:', error)
    }
  }

  // File upload
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files)

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        // If it's an image, use vision endpoint
        if (file.type.startsWith('image/')) {
          const response = await fetch('/api/eyes/analyze', {
            method: 'POST',
            body: formData
          })

          const data = await response.json()

          if (data.ok) {
            setUploadedFiles(prev => [...prev, {
              name: file.name,
              type: 'image',
              analysis: data.description
            }])
            playSound(1100, 100)
          }
        }
      } catch (error) {
        console.error('Failed to upload file:', error)
      }
    }
  }

  // Swipe gestures for mobile
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    const views = ['mission', 'neuro', 'chat', 'health', 'analytics', 'code']
    const currentIndex = views.indexOf(currentView)

    if (isLeftSwipe && currentIndex < views.length - 1) {
      setCurrentView(views[currentIndex + 1])
      playSound(900, 50)
    }

    if (isRightSwipe && currentIndex > 0) {
      setCurrentView(views[currentIndex - 1])
      playSound(900, 50)
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-omega-dark via-gray-900 to-black text-white"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-omega-accent to-omega-purple rounded-lg flex items-center justify-center animate-glow">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-omega-accent to-omega-purple bg-clip-text text-transparent">
                  gAIng Brain
                </h1>
                <p className="text-xs text-gray-400">Project Omega - Sovereign AI</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Voice toggle */}
              <button
                onClick={isListening ? stopListening : startListening}
                className={`p-3 rounded-lg transition-all ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-omega-accent/20 hover:bg-omega-accent/30'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Mute toggle */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              {/* File upload */}
              <label className="p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all cursor-pointer">
                <Upload className="w-5 h-5" />
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {/* Voice transcript */}
          {transcript && (
            <div className="mt-3 p-3 bg-omega-accent/10 border border-omega-accent/30 rounded-lg">
              <p className="text-sm text-omega-accent">{transcript}</p>
            </div>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-black/30">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {[
              { id: 'mission', icon: Target, label: 'Missions' },
              { id: 'neuro', icon: Brain, label: 'Neuro-Link' },
              { id: 'chat', icon: MessageSquare, label: 'Agent Chat' },
              { id: 'health', icon: Activity, label: 'Health' },
              { id: 'analytics', icon: BarChart3, label: 'Analytics' },
              { id: 'code', icon: Code, label: 'Code Ops' }
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => {
                  setCurrentView(view.id)
                  playSound(900, 50)
                }}
                className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-all whitespace-nowrap ${
                  currentView === view.id
                    ? 'border-omega-accent text-omega-accent'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <view.icon className="w-4 h-4" />
                <span className="font-medium">{view.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {currentView === 'mission' && (
          <MissionBoard
            missions={missions}
            onCreateMission={createMission}
            newMission={newMission}
            setNewMission={setNewMission}
            selectedAgent={selectedAgent}
            setSelectedAgent={setSelectedAgent}
            agents={agents}
            onRefresh={loadMissions}
          />
        )}

        {currentView === 'neuro' && (
          <NeuroLink
            agents={agents}
            selectedAgent={selectedAgent}
            setSelectedAgent={setSelectedAgent}
          />
        )}

        {currentView === 'chat' && (
          <AgentChat
            agents={agents}
            selectedAgent={selectedAgent}
            setSelectedAgent={setSelectedAgent}
          />
        )}

        {currentView === 'health' && (
          <HealthMonitor
            agents={agents}
            onRefresh={loadAgentHealth}
          />
        )}

        {currentView === 'analytics' && (
          <Analytics
            missions={missions}
            agents={agents}
            analytics={analytics}
          />
        )}

        {currentView === 'code' && (
          <CodeWorkbench />
        )}
      </main>

      {/* Uploaded files notification */}
      {uploadedFiles.length > 0 && (
        <div className="fixed bottom-4 right-4 space-y-2">
          {uploadedFiles.map((file, idx) => (
            <div key={idx} className="bg-green-500/20 border border-green-500 rounded-lg p-3 max-w-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <button
                  onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {file.analysis && (
                <p className="text-xs text-gray-300 mt-2">{file.analysis}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
