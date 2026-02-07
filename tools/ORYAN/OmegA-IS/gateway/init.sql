-- OMEGA Gateway Database Initialization
-- This script is automatically run when the PostgreSQL container starts for the first time.

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the OMEGA memory table
CREATE TABLE IF NOT EXISTS omega_memory (
    id TEXT PRIMARY KEY,
    namespace TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content TEXT NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_omega_memory_ns_ts ON omega_memory(namespace, ts DESC);

-- IVFFlat index for vector similarity search
-- Note: This index works best after you have some data. For small datasets, a flat scan may be faster.
-- The 'lists' parameter should be adjusted based on your data size (sqrt of row count is a good starting point)
CREATE INDEX IF NOT EXISTS idx_omega_memory_embedding ON omega_memory 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- ============================================================================
-- Optional: Tables for gAIng governance workflows (used by n8n workflows)
-- ============================================================================

-- Members table: Track active agents in the collective
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    role TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memories table: Store agent memories for Peace Pipe ceremony
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL,
    content TEXT NOT NULL,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_name);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);

-- Financial ledger: Track API costs and other expenses
CREATE TABLE IF NOT EXISTS financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount_usd NUMERIC(12, 6) NOT NULL,
    category TEXT DEFAULT 'api_cost',
    agent_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_created ON financial_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_category ON financial_ledger(category);

-- Agent jobs: Track income-generating assignments from the Income Engine
CREATE TABLE IF NOT EXISTS agent_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    job_description TEXT,
    assigned_by TEXT,
    status TEXT DEFAULT 'pending',
    revenue_target_usd NUMERIC(10, 2),
    actual_revenue_usd NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_agent ON agent_jobs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_created ON agent_jobs(created_at DESC);

-- ============================================================================
-- Seed data: Add a sample agent to get started
-- ============================================================================

INSERT INTO members (name, role, status) VALUES
    ('OMEGA', 'System Orchestrator', 'active'),
    ('RY', 'Director', 'active')
ON CONFLICT (name) DO NOTHING;

-- Log initialization
INSERT INTO financial_ledger (description, amount_usd, category, agent_name)
VALUES ('Database initialization', 0, 'system', 'OMEGA');

-- Print success message
DO $$
BEGIN
    RAISE NOTICE 'OMEGA database initialized successfully!';
END $$;
