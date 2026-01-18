-- ===========================================
-- gAIng Task Queue Schema
-- The Block's dispatch system
-- ===========================================

-- Agent Registry: Who's in the crew and what they do
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'offline', 'error')),
    strengths TEXT[], -- Array of capabilities
    current_task_id TEXT,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Queue: The work orders
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Waiting for assignment
        'planning',     -- Being broken down by orchestrator
        'assigned',     -- Given to an agent
        'in_progress',  -- Agent is working on it
        'blocked',      -- Waiting on dependency
        'completed',    -- Done
        'failed',       -- Something went wrong
        'cancelled'     -- Aborted
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),

    -- Assignment
    assigned_to TEXT REFERENCES agents(id),
    assigned_at TIMESTAMPTZ,

    -- Relationships
    parent_task_id UUID REFERENCES tasks(id), -- For subtasks
    dependencies UUID[], -- Task IDs that must complete first

    -- Source tracking
    created_by TEXT NOT NULL, -- 'safa', 'gemini', 'user', etc.
    source_message TEXT, -- Original natural language input

    -- Execution details
    instructions TEXT, -- Compiled instructions for the agent
    result TEXT, -- Output/summary when completed
    error_message TEXT, -- If failed

    -- File locking (prevent conflicts)
    locked_files TEXT[], -- Files this task is working on

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Estimated complexity (for load balancing)
    complexity TEXT DEFAULT 'medium' CHECK (complexity IN ('trivial', 'simple', 'medium', 'complex', 'epic'))
);

-- Task Comments/Updates: Running log of task progress
CREATE TABLE IF NOT EXISTS task_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES agents(id),
    update_type TEXT CHECK (update_type IN ('progress', 'question', 'blocker', 'handoff', 'completion')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Locks: Prevent agents from stepping on each other
CREATE TABLE IF NOT EXISTS file_locks (
    file_path TEXT PRIMARY KEY,
    locked_by TEXT REFERENCES agents(id),
    task_id UUID REFERENCES tasks(id),
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes')
);

-- ===========================================
-- Indexes for performance
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_file_locks_expires ON file_locks(expires_at);

-- ===========================================
-- Auto-update timestamps
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- Seed the agent registry
-- ===========================================
INSERT INTO agents (id, name, strengths, status) VALUES
    ('claude', 'Claude (Opus 4.5)', ARRAY['deep_reasoning', 'refactoring', 'debugging', 'architecture', 'extended_thinking', 'code_review'], 'offline'),
    ('gemini', 'Gemini', ARRAY['planning', 'coordination', 'rapid_iteration', 'multimodal', 'orchestration', 'research'], 'offline'),
    ('codex', 'Codex', ARRAY['quick_edits', 'shell_commands', 'file_operations', 'exploration', 'scripting'], 'offline'),
    ('safa', 'Safa', ARRAY['user_interface', 'natural_language', 'memory', 'intake', 'summarization'], 'offline'),
    ('grok', 'Grok', ARRAY['real_time_data', 'web_search', 'current_events', 'analysis'], 'offline'),
    ('copilot', 'GitHub Copilot', ARRAY['autocomplete', 'inline_suggestions', 'boilerplate', 'quick_fixes'], 'offline')
ON CONFLICT (id) DO UPDATE SET
    strengths = EXCLUDED.strengths,
    updated_at = NOW();

-- ===========================================
-- Helper Views
-- ===========================================

-- Pending tasks ready for assignment
CREATE OR REPLACE VIEW available_tasks AS
SELECT t.*
FROM tasks t
WHERE t.status = 'pending'
  AND t.assigned_to IS NULL
  AND (
      t.dependencies IS NULL
      OR NOT EXISTS (
          SELECT 1 FROM tasks dep
          WHERE dep.id = ANY(t.dependencies)
          AND dep.status NOT IN ('completed')
      )
  )
ORDER BY
    CASE t.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    t.created_at;

-- Agent workload summary
CREATE OR REPLACE VIEW agent_workload AS
SELECT
    a.id,
    a.name,
    a.status,
    a.strengths,
    COUNT(t.id) FILTER (WHERE t.status IN ('assigned', 'in_progress')) as active_tasks,
    a.last_heartbeat,
    (NOW() - a.last_heartbeat) < INTERVAL '5 minutes' as is_responsive
FROM agents a
LEFT JOIN tasks t ON t.assigned_to = a.id
GROUP BY a.id, a.name, a.status, a.strengths, a.last_heartbeat;

-- ===========================================
-- RLS Policies (if needed)
-- ===========================================
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- Add policies as needed for your auth setup
