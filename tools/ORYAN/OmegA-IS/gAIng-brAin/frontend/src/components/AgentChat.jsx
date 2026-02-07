import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Loader } from 'lucide-react'

function AgentChat({ agents, selectedAgent, setSelectedAgent }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadMessages()
  }, [selectedAgent])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages?recipient=${selectedAgent}&limit=50`)
      const data = await response.json()

      if (data.ok && data.messages) {
        setMessages(data.messages.map(msg => ({
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.created_at,
          type: msg.message_type
        })))
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'user',
          recipient: selectedAgent,
          content: input,
          message_type: 'text'
        })
      })

      const data = await response.json()

      if (data.ok && data.message) {
        // Simulate agent response (in real system, this would come via WebSocket)
        setTimeout(async () => {
          // Try to get LLM response
          try {
            const llmResponse = await fetch('/api/llm/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [
                  { role: 'system', content: `You are ${selectedAgent}, an AI agent. ${agents.find(a => a.id === selectedAgent)?.specialty || ''}` },
                  { role: 'user', content: input }
                ],
                max_tokens: 500
              })
            })

            const llmData = await llmResponse.json()

            if (llmData.ok && llmData.response?.choices?.[0]?.message?.content) {
              setMessages(prev => [...prev, {
                id: Date.now(),
                sender: selectedAgent,
                content: llmData.response.choices[0].message.content,
                timestamp: new Date().toISOString(),
                type: 'text'
              }])
            } else {
              // Fallback response
              setMessages(prev => [...prev, {
                id: Date.now(),
                sender: selectedAgent,
                content: `Message received. I'll process this request.`,
                timestamp: new Date().toISOString(),
                type: 'text'
              }])
            }
          } catch (error) {
            console.error('LLM error:', error)
            setMessages(prev => [...prev, {
              id: Date.now(),
              sender: selectedAgent,
              content: `Message received and logged.`,
              timestamp: new Date().toISOString(),
              type: 'text'
            }])
          }

          setLoading(false)
        }, 1000)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const currentAgent = agents.find(a => a.id === selectedAgent)

  return (
    <div className="flex flex-col h-[calc(100vh-250px)]">
      {/* Agent selector */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Select Agent</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedAgent === agent.id
                  ? 'border-omega-accent bg-omega-accent/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <Bot className="w-4 h-4" />
                <span className="font-medium text-sm">{agent.name}</span>
              </div>
              <p className="text-xs text-gray-400">{agent.specialty}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Current agent info */}
      {currentAgent && (
        <div className="bg-gradient-to-r from-omega-accent/10 to-omega-purple/10 border border-omega-accent/30 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-omega-accent to-omega-purple rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{currentAgent.name}</h3>
              <p className="text-xs text-gray-300">{currentAgent.specialty}</p>
            </div>
            <div className="ml-auto">
              <span className={`px-2 py-1 rounded-full text-xs ${
                currentAgent.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              }`}>
                {currentAgent.status || 'unknown'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 bg-gray-800/30 border border-gray-700 rounded-lg p-4 overflow-y-auto scrollbar-hide mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bot className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === 'user'
                      ? 'bg-blue-500'
                      : 'bg-gradient-to-br from-omega-accent to-omega-purple'
                  }`}>
                    {message.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className={`px-4 py-2 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2 bg-gray-700 px-4 py-2 rounded-lg">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-300">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center space-x-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Message ${currentAgent?.name || 'agent'}...`}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:border-omega-accent resize-none"
          rows="2"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="px-6 py-3 bg-gradient-to-r from-omega-accent to-omega-purple rounded-lg font-semibold hover:shadow-lg hover:shadow-omega-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 h-full"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </div>
    </div>
  )
}

export default AgentChat
