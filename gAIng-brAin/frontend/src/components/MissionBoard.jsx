import { useState } from 'react'
import { Send, Filter, RefreshCw, Clock, CheckCircle, AlertCircle, Target, Zap } from 'lucide-react'

const statusIcons = {
  pending: Clock,
  in_progress: Zap,
  completed: CheckCircle,
  failed: AlertCircle
}

const statusColors = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  in_progress: 'text-blue-400 bg-blue-400/10',
  completed: 'text-green-400 bg-green-400/10',
  failed: 'text-red-400 bg-red-400/10'
}

const priorityColors = {
  low: 'border-gray-600',
  medium: 'border-yellow-500',
  high: 'border-red-500'
}

function MissionBoard({ missions, onCreateMission, newMission, setNewMission, selectedAgent, setSelectedAgent, agents, onRefresh }) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  const filteredMissions = missions.filter(mission => {
    if (filterStatus !== 'all' && mission.status !== filterStatus) return false
    if (filterPriority !== 'all' && mission.priority !== filterPriority) return false
    return true
  })

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onCreateMission()
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: missions.length, color: 'from-blue-500 to-cyan-500' },
          { label: 'Pending', value: missions.filter(m => m.status === 'pending').length, color: 'from-yellow-500 to-orange-500' },
          { label: 'In Progress', value: missions.filter(m => m.status === 'in_progress').length, color: 'from-purple-500 to-pink-500' },
          { label: 'Completed', value: missions.filter(m => m.status === 'completed').length, color: 'from-green-500 to-emerald-500' }
        ].map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} p-4 rounded-lg`}>
            <p className="text-sm text-white/80">{stat.label}</p>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Create mission */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2 text-omega-accent" />
          Create New Mission
        </h2>

        <div className="space-y-3">
          <textarea
            value={newMission}
            onChange={(e) => setNewMission(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe the mission objective..."
            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:border-omega-accent resize-none"
            rows="3"
          />

          <div className="flex items-center space-x-3">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="flex-1 bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-omega-accent"
            >
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} - {agent.specialty}
                </option>
              ))}
            </select>

            <button
              onClick={onCreateMission}
              disabled={!newMission.trim()}
              className="px-6 py-3 bg-gradient-to-r from-omega-accent to-omega-purple rounded-lg font-semibold hover:shadow-lg hover:shadow-omega-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Deploy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-omega-accent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-omega-accent"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Mission list */}
      <div className="space-y-3">
        {filteredMissions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>No missions found. Create one to get started!</p>
          </div>
        ) : (
          filteredMissions.map((mission) => {
            const StatusIcon = statusIcons[mission.status] || Clock
            return (
              <div
                key={mission.id}
                className={`bg-gray-800/50 border-l-4 ${priorityColors[mission.priority]} rounded-lg p-4 hover:bg-gray-800 transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`px-3 py-1 rounded-full ${statusColors[mission.status]} flex items-center space-x-2`}>
                        <StatusIcon className="w-3 h-3" />
                        <span className="text-xs font-medium capitalize">{mission.status.replace('_', ' ')}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {mission.agent || 'Unassigned'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(mission.created).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-1">{mission.title}</h3>
                    {mission.deadline && (
                      <p className="text-xs text-gray-400 flex items-center mt-2">
                        <Clock className="w-3 h-3 mr-1" />
                        Deadline: {new Date(mission.deadline).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      mission.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      mission.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {mission.priority}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default MissionBoard
