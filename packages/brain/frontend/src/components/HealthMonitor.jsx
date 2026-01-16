import { useState, useEffect } from 'react'
import { Activity, RefreshCw, Zap, Clock, CheckCircle, AlertTriangle, Server } from 'lucide-react'

function HealthMonitor({ agents, onRefresh }) {
  const [systemHealth, setSystemHealth] = useState({
    database: 'unknown',
    websocket: 'unknown',
    llm: 'unknown',
    memory: 'unknown'
  })

  useEffect(() => {
    checkSystemHealth()
    const interval = setInterval(checkSystemHealth, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const checkSystemHealth = async () => {
    try {
      // Check main health endpoint
      const response = await fetch('/api/health')
      const data = await response.json()

      setSystemHealth(prev => ({
        ...prev,
        database: data.ok ? 'healthy' : 'degraded'
      }))

      // Check LLM status
      try {
        const llmResponse = await fetch('/api/llm/status')
        const llmData = await llmResponse.json()
        setSystemHealth(prev => ({
          ...prev,
          llm: llmData.ok && llmData.ready ? 'healthy' : 'degraded'
        }))
      } catch {
        setSystemHealth(prev => ({ ...prev, llm: 'offline' }))
      }

      // Check memory system
      try {
        const memResponse = await fetch('/api/memories?limit=1')
        const memData = await memResponse.json()
        setSystemHealth(prev => ({
          ...prev,
          memory: memData.ok ? 'healthy' : 'degraded'
        }))
      } catch {
        setSystemHealth(prev => ({ ...prev, memory: 'offline' }))
      }

      // WebSocket is checked separately
      setSystemHealth(prev => ({
        ...prev,
        websocket: 'healthy' // Set by WebSocket connection in App.jsx
      }))

    } catch (error) {
      console.error('Health check failed:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-400/10'
      case 'degraded': return 'text-yellow-400 bg-yellow-400/10'
      case 'offline': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return CheckCircle
      case 'degraded': return AlertTriangle
      case 'offline': return AlertTriangle
      default: return Clock
    }
  }

  const onlineAgents = agents.filter(a => a.status === 'online').length
  const healthPercentage = (onlineAgents / agents.length) * 100

  return (
    <div className="space-y-6">
      {/* Overall health */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <Activity className="w-6 h-6 mr-3 text-omega-accent" />
            System Health
          </h2>
          <button
            onClick={() => {
              onRefresh()
              checkSystemHealth()
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-700"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - healthPercentage / 100)}`}
                    className="text-omega-accent transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{Math.round(healthPercentage)}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-400">Agent Availability</p>
              <p className="text-lg font-semibold text-white">
                {onlineAgents} / {agents.length} Online
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(systemHealth).map(([system, status]) => {
              const StatusIcon = getStatusIcon(status)
              return (
                <div
                  key={system}
                  className={`flex items-center justify-between p-3 rounded-lg ${getStatusColor(status)}`}
                >
                  <div className="flex items-center space-x-3">
                    <StatusIcon className="w-5 h-5" />
                    <span className="font-medium capitalize">{system}</span>
                  </div>
                  <span className="text-sm capitalize">{status}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Agent details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const isOnline = agent.status === 'online'
          const lastSeen = agent.last_heartbeat ? new Date(agent.last_heartbeat) : null

          return (
            <div
              key={agent.id}
              className={`bg-gray-800/50 border-2 rounded-lg p-4 transition-all ${
                isOnline
                  ? 'border-green-500/30 hover:border-green-500/50'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isOnline
                      ? 'bg-gradient-to-br from-omega-accent to-omega-purple animate-pulse-slow'
                      : 'bg-gray-700'
                  }`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{agent.name}</h3>
                    <p className="text-xs text-gray-400">{agent.specialty}</p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                }`} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={`font-medium ${isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                    {agent.status || 'Unknown'}
                  </span>
                </div>

                {lastSeen && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Last Seen</span>
                    <span className="text-gray-300 text-xs">
                      {lastSeen.toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {agent.tasks_completed !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Tasks</span>
                    <span className="text-omega-accent font-medium">
                      {agent.tasks_completed || 0}
                    </span>
                  </div>
                )}

                {agent.avg_response_time && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Avg Response</span>
                    <span className="text-gray-300">
                      {agent.avg_response_time}ms
                    </span>
                  </div>
                )}
              </div>

              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Capabilities</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map((cap, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-omega-accent/10 text-omega-accent text-xs rounded"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* System info */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center">
          <Server className="w-4 h-4 mr-2 text-gray-400" />
          System Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Platform</p>
            <p className="font-medium">Node.js + Express</p>
          </div>
          <div>
            <p className="text-gray-400">Database</p>
            <p className="font-medium">Supabase PostgreSQL</p>
          </div>
          <div>
            <p className="text-gray-400">Memory</p>
            <p className="font-medium">Mem0 + Vector Store</p>
          </div>
          <div>
            <p className="text-gray-400">Architecture</p>
            <p className="font-medium">Project Omega</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HealthMonitor
