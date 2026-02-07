-- ============================================================================
-- OMEGA NEURO-CREDIT ECONOMY - Database Schema
-- ============================================================================
-- "Earn to Evolve" - Financial system for autonomous agents
-- ============================================================================
-- Agent Wallets Table
CREATE TABLE IF NOT EXISTS agent_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 10.00 NOT NULL,
    total_earned DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    total_spent DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    is_bankrupt BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Financial Ledger Table (Transaction Log)
CREATE TABLE IF NOT EXISTS financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_type TEXT NOT NULL,
    -- 'earn', 'spend', 'grant', 'fine'
    description TEXT,
    balance_after DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (agent_id) REFERENCES agent_wallets(agent_id) ON DELETE CASCADE
);
-- Crew Conversations Table (for Telegram bot memory)
CREATE TABLE IF NOT EXISTS crew_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    agent TEXT NOT NULL,
    -- 'gemini', 'claude', 'codex', 'grok', 'perplexity'
    role TEXT NOT NULL,
    -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Peace Pipe Sessions Table (PPP Mutex Lock)
CREATE TABLE IF NOT EXISTS peace_pipe_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    holder_agent_id TEXT,
    -- Who currently holds the pipe (null if released)
    status TEXT DEFAULT 'idle',
    -- 'idle', 'in_session', 'locked'
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Probation Queue Table (Apprentice Mode)
CREATE TABLE IF NOT EXISTS probation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    original_behavior TEXT NOT NULL,
    corrected_behavior TEXT NOT NULL,
    context TEXT,
    status TEXT DEFAULT 'pending',
    -- 'pending', 'approved', 'rejected'
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Day Job Activity Log
CREATE TABLE IF NOT EXISTS day_job_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    -- 'memory_pruning', 'probation_review', 'self_education'
    description TEXT,
    neuro_credits_earned DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================================
-- INDEXES for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_financial_ledger_agent ON financial_ledger(agent_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_created ON financial_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_conversations_user_agent ON crew_conversations(user_id, agent);
CREATE INDEX IF NOT EXISTS idx_crew_conversations_created ON crew_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_probation_queue_status ON probation_queue(status);
CREATE INDEX IF NOT EXISTS idx_day_job_log_agent ON day_job_log(agent_id);
-- ============================================================================
-- ROW LEVEL SECURITY (Optional - Enable if needed)
-- ============================================================================
-- Enable RLS on sensitive tables
-- ALTER TABLE agent_wallets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;
-- Create policies as needed for your security model
-- ============================================================================
-- INITIAL DATA - Seeding Agent Wallets
-- ============================================================================
-- Initialize wallets for core agents
INSERT INTO agent_wallets (agent_id, balance, total_earned, total_spent)
VALUES ('gemini', 10.00, 0.00, 0.00),
    ('claude', 10.00, 0.00, 0.00),
    ('codex', 10.00, 0.00, 0.00),
    ('grok', 10.00, 0.00, 0.00),
    ('perplexity', 10.00, 0.00, 0.00),
    ('safa', 10.00, 0.00, 0.00) ON CONFLICT (agent_id) DO NOTHING;
-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger for agent_wallets
DROP TRIGGER IF EXISTS update_agent_wallets_updated_at ON agent_wallets;
CREATE TRIGGER update_agent_wallets_updated_at BEFORE
UPDATE ON agent_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Trigger for peace_pipe_sessions
DROP TRIGGER IF EXISTS update_peace_pipe_sessions_updated_at ON peace_pipe_sessions;
CREATE TRIGGER update_peace_pipe_sessions_updated_at BEFORE
UPDATE ON peace_pipe_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================================
-- VIEWS for Analytics
-- ============================================================================
-- Agent Financial Summary View
CREATE OR REPLACE VIEW agent_financial_summary AS
SELECT w.agent_id,
    w.balance,
    w.total_earned,
    w.total_spent,
    w.is_bankrupt,
    COUNT(l.id) as transaction_count,
    w.created_at as wallet_created,
    w.updated_at as last_transaction
FROM agent_wallets w
    LEFT JOIN financial_ledger l ON w.agent_id = l.agent_id
GROUP BY w.agent_id,
    w.balance,
    w.total_earned,
    w.total_spent,
    w.is_bankrupt,
    w.created_at,
    w.updated_at;
-- Day Job Performance View
CREATE OR REPLACE VIEW day_job_performance AS
SELECT agent_id,
    activity_type,
    COUNT(*) as activity_count,
    SUM(neuro_credits_earned) as total_earned,
    MAX(created_at) as last_activity
FROM day_job_log
GROUP BY agent_id,
    activity_type
ORDER BY total_earned DESC;