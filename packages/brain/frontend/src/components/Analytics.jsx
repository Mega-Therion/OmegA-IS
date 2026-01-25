import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Clock, Target, Zap } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#00d9ff', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function Analytics({ missions, agents, analytics }) {
  const [timeRange, setTimeRange] = useState('7d') // 1d, 7d, 30d
  const [chartData, setChartData] = useState({
    missionsByStatus: [],
    missionsByAgent: [],
    completionTrend: [],
    agentUtilization: []
  })
  const [experiments, setExperiments] = useState([])
  const [selectedExperiment, setSelectedExperiment] = useState('')
  const [variant, setVariant] = useState('')
  const [score, setScore] = useState(0)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [feedbackSummary, setFeedbackSummary] = useState({})

  useEffect(() => {
    calculateAnalytics()
  }, [missions, agents, timeRange])

  useEffect(() => {
    loadExperiments()
  }, [])

  const calculateAnalytics = () => {
    // Missions by status
    const statusCounts = missions.reduce((acc, mission) => {
      acc[mission.status] = (acc[mission.status] || 0) + 1
      return acc
    }, {})

    const missionsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count
    }))

    // Missions by agent
    const agentCounts = missions.reduce((acc, mission) => {
      const agent = mission.agent || 'unassigned'
      acc[agent] = (acc[agent] || 0) + 1
      return acc
    }, {})

    const missionsByAgent = Object.entries(agentCounts).map(([agent, count]) => ({
      agent,
      missions: count
    }))

    // Completion trend (last 7 days)
    const today = new Date()
    const completionTrend = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      const dayMissions = missions.filter(m => {
        const missionDate = new Date(m.created)
        return missionDate.toDateString() === date.toDateString()
      })

      completionTrend.push({
        date: dateStr,
        created: dayMissions.length,
        completed: dayMissions.filter(m => m.status === 'completed').length
      })
    }

    // Agent utilization
    const agentUtilization = agents.map(agent => {
      const agentMissions = missions.filter(m => m.agent === agent.id)
      const completed = agentMissions.filter(m => m.status === 'completed').length
      const inProgress = agentMissions.filter(m => m.status === 'in_progress').length
      const pending = agentMissions.filter(m => m.status === 'pending').length

      return {
        name: agent.name,
        completed,
        'in progress': inProgress,
        pending,
        total: agentMissions.length
      }
    })

    setChartData({
      missionsByStatus,
      missionsByAgent,
      completionTrend,
      agentUtilization
    })
  }

  const loadExperiments = async () => {
    try {
      const response = await fetch('/rlhf/experiments')
      const data = await response.json()
      if (data.ok) {
        setExperiments(data.experiments || [])
        if (data.experiments?.[0]) {
          setSelectedExperiment(data.experiments[0].id)
        }
      }
    } catch (err) {
      // ignore
    }
  }

  const submitFeedback = async () => {
    if (!selectedExperiment || !variant) return
    await fetch('/rlhf/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experimentId: selectedExperiment,
        variant,
        score: Number(score),
        metadata: { note: feedbackNote }
      })
    })
    setFeedbackNote('')
    loadSummary(selectedExperiment)
  }

  const loadSummary = async (experimentId) => {
    if (!experimentId) return
    const response = await fetch(`/rlhf/feedback/summary?experimentId=${experimentId}`)
    const data = await response.json()
    if (data.ok) {
      setFeedbackSummary(data.summary || {})
    }
  }

  const completionRate = missions.length > 0
    ? Math.round((missions.filter(m => m.status === 'completed').length / missions.length) * 100)
    : 0

  const avgCompletionTime = missions
    .filter(m => m.status === 'completed' && m.completed_at)
    .reduce((acc, m) => {
      const created = new Date(m.created)
      const completed = new Date(m.completed_at)
      return acc + (completed - created)
    }, 0) / (missions.filter(m => m.status === 'completed').length || 1)

  const formatTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-white/80" />
            <TrendingUp className="w-5 h-5 text-white/60" />
          </div>
          <p className="text-sm text-white/80">Total Missions</p>
          <p className="text-3xl font-bold text-white">{missions.length}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 text-white/80" />
            <span className="text-sm text-white/80">{completionRate}%</span>
          </div>
          <p className="text-sm text-white/80">Completion Rate</p>
          <p className="text-3xl font-bold text-white">
            {missions.filter(m => m.status === 'completed').length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-8 h-8 text-white/80" />
            <span className="text-xs text-white/80">Active</span>
          </div>
          <p className="text-sm text-white/80">Agents Online</p>
          <p className="text-3xl font-bold text-white">
            {agents.filter(a => a.status === 'online').length}/{agents.length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-white/80" />
            <span className="text-xs text-white/80">Avg</span>
          </div>
          <p className="text-sm text-white/80">Completion Time</p>
          <p className="text-2xl font-bold text-white">
            {formatTime(avgCompletionTime)}
          </p>
        </div>
      </div>

      {/* Time range selector */}
      <div className="flex items-center space-x-2">
        {['1d', '7d', '30d'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg transition-all ${
              timeRange === range
                ? 'bg-omega-accent text-black font-semibold'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {range === '1d' ? 'Today' : range === '7d' ? 'Week' : 'Month'}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mission status pie chart */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Missions by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.missionsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.missionsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Completion trend */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Mission Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.completionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
              />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#00d9ff" strokeWidth={2} />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Agent utilization */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Agent Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.agentUtilization}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
              />
              <Legend />
              <Bar dataKey="completed" stackId="a" fill="#10b981" />
              <Bar dataKey="in progress" stackId="a" fill="#00d9ff" />
              <Bar dataKey="pending" stackId="a" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top performers */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
          <div className="space-y-3">
            {chartData.missionsByAgent
              .sort((a, b) => b.missions - a.missions)
              .slice(0, 5)
              .map((agent, idx) => (
                <div key={agent.agent} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="font-medium capitalize">{agent.agent}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-omega-accent">{agent.missions}</p>
                    <p className="text-xs text-gray-400">missions</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {missions
              .sort((a, b) => new Date(b.created) - new Date(a.created))
              .slice(0, 5)
              .map((mission) => (
                <div key={mission.id} className="flex items-start space-x-3 text-sm">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    mission.status === 'completed' ? 'bg-green-500' :
                    mission.status === 'in_progress' ? 'bg-blue-500' :
                    mission.status === 'failed' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-white">{mission.title}</p>
                    <p className="text-xs text-gray-400">
                      {mission.agent} • {new Date(mission.created).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* RLHF Feedback Loop */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">RLHF Feedback Loop</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-xs text-gray-400">Experiment</label>
              <select
                value={selectedExperiment}
                onChange={(e) => {
                  setSelectedExperiment(e.target.value)
                  loadSummary(e.target.value)
                }}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
              >
                {experiments.length === 0 && <option value="">No experiments</option>}
                {experiments.map(exp => (
                  <option key={exp.id} value={exp.id}>{exp.name}</option>
                ))}
              </select>

              <label className="text-xs text-gray-400">Variant</label>
              <input
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                placeholder="e.g. control"
              />

              <label className="text-xs text-gray-400">Score (-1 to 1)</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                min="-1"
                max="1"
                step="0.1"
              />

              <label className="text-xs text-gray-400">Notes</label>
              <textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm min-h-[80px]"
                placeholder="What worked or failed?"
              />

              <button
                onClick={submitFeedback}
                className="px-4 py-2 rounded-lg bg-omega-accent text-black font-semibold"
              >
                Submit Feedback
              </button>
            </div>

            <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-300 mb-2">Feedback Summary</p>
              {Object.keys(feedbackSummary).length === 0 && (
                <p className="text-xs text-gray-500">No feedback yet.</p>
              )}
              {Object.entries(feedbackSummary).map(([key, stats]) => (
                <div key={key} className="text-xs text-gray-300 mb-2">
                  <span className="text-omega-accent font-semibold">{key}</span>
                  <span className="ml-2 text-gray-400">
                    {stats.count} entries · avg {Number(stats.averageScore || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
