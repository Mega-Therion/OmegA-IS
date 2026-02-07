const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const supabase = require('../services/supabase');

/**
 * Analytics endpoints for Project Omega frontend
 * Provides mission stats, agent performance, and system metrics
 */

// GET /analytics/overview
// Returns high-level system analytics
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    // Get mission stats
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (tasksError) {
      return res.status(500).json({ ok: false, error: tasksError.message });
    }

    // Get agent stats
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError) {
      return res.status(500).json({ ok: false, error: agentsError.message });
    }

    // Calculate metrics
    const totalMissions = tasks?.length || 0;
    const completedMissions = tasks?.filter(t => t.status === 'completed').length || 0;
    const inProgressMissions = tasks?.filter(t => t.status === 'in_progress').length || 0;
    const pendingMissions = tasks?.filter(t => t.status === 'pending').length || 0;
    const failedMissions = tasks?.filter(t => t.status === 'failed').length || 0;

    const activeAgents = agents?.filter(a => {
      if (!a.last_heartbeat) return false;
      const lastSeen = new Date(a.last_heartbeat);
      const now = new Date();
      // Consider active if heartbeat within last 5 minutes
      return (now - lastSeen) < 5 * 60 * 1000;
    }).length || 0;

    // Calculate average response time from completed tasks
    const completedTasks = tasks?.filter(t => t.status === 'completed' && t.completed_at) || [];
    const avgResponseTime = completedTasks.length > 0
      ? completedTasks.reduce((acc, task) => {
          const created = new Date(task.created_at);
          const completed = new Date(task.completed_at);
          return acc + (completed - created);
        }, 0) / completedTasks.length
      : 0;

    // Completion rate
    const completionRate = totalMissions > 0
      ? Math.round((completedMissions / totalMissions) * 100)
      : 0;

    res.json({
      ok: true,
      analytics: {
        totalMissions,
        completedMissions,
        inProgressMissions,
        pendingMissions,
        failedMissions,
        completionRate,
        activeAgents,
        totalAgents: agents?.length || 0,
        avgResponseTime: Math.round(avgResponseTime / 1000), // Convert to seconds
      }
    });

  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// GET /analytics/missions/trend?days=7
// Returns mission creation/completion trend
router.get('/missions/trend', requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    // Group by day
    const trend = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayTasks = tasks?.filter(t => {
        const taskDate = new Date(t.created_at);
        return taskDate >= date && taskDate < nextDate;
      }) || [];

      trend.push({
        date: date.toISOString().split('T')[0],
        created: dayTasks.length,
        completed: dayTasks.filter(t => t.status === 'completed').length,
        failed: dayTasks.filter(t => t.status === 'failed').length
      });
    }

    res.json({ ok: true, trend });

  } catch (err) {
    console.error('Analytics trend error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// GET /analytics/agents/performance
// Returns per-agent performance metrics
router.get('/agents/performance', requireAuth, async (req, res) => {
  try {
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError) {
      return res.status(500).json({ ok: false, error: agentsError.message });
    }

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*');

    if (tasksError) {
      return res.status(500).json({ ok: false, error: tasksError.message });
    }

    // Calculate per-agent metrics
    const performance = agents?.map(agent => {
      const agentTasks = tasks?.filter(t => t.assigned_agent === agent.name) || [];
      const completed = agentTasks.filter(t => t.status === 'completed');
      const failed = agentTasks.filter(t => t.status === 'failed');
      const inProgress = agentTasks.filter(t => t.status === 'in_progress');
      const pending = agentTasks.filter(t => t.status === 'pending');

      // Calculate average completion time
      const avgTime = completed.length > 0
        ? completed.reduce((acc, task) => {
            if (!task.completed_at) return acc;
            const created = new Date(task.created_at);
            const completedAt = new Date(task.completed_at);
            return acc + (completedAt - created);
          }, 0) / completed.length
        : 0;

      // Success rate
      const totalFinished = completed.length + failed.length;
      const successRate = totalFinished > 0
        ? Math.round((completed.length / totalFinished) * 100)
        : 0;

      return {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        totalTasks: agentTasks.length,
        completed: completed.length,
        failed: failed.length,
        inProgress: inProgress.length,
        pending: pending.length,
        avgCompletionTime: Math.round(avgTime / 1000), // seconds
        successRate,
        lastHeartbeat: agent.last_heartbeat
      };
    }) || [];

    res.json({ ok: true, performance });

  } catch (err) {
    console.error('Analytics agents error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// GET /analytics/missions/by-status
// Returns mission distribution by status
router.get('/missions/by-status', requireAuth, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('status');

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    // Count by status
    const distribution = tasks?.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {}) || {};

    res.json({ ok: true, distribution });

  } catch (err) {
    console.error('Analytics status error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// GET /analytics/missions/by-priority
// Returns mission distribution by priority
router.get('/missions/by-priority', requireAuth, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('priority');

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    // Count by priority
    const distribution = tasks?.reduce((acc, task) => {
      const priority = task.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {}) || {};

    res.json({ ok: true, distribution });

  } catch (err) {
    console.error('Analytics priority error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

module.exports = router;
