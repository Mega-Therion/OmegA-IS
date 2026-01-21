-- gAIng Files & Documentation Storage
-- Tracks all files in the gAIng-brAin system with metadata and searchable content

-- Create files table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- File identification
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    extension TEXT,

    -- Storage location
    storage_bucket TEXT DEFAULT 'gaing-files',
    storage_path TEXT,

    -- File metadata
    file_type TEXT, -- 'config', 'script', 'docs', 'agent', 'protocol', etc.
    size_bytes BIGINT,
    mime_type TEXT,

    -- Content (for searchable text files)
    content TEXT,
    content_hash TEXT, -- SHA-256 hash for change detection

    -- Classification
    category TEXT, -- 'agent-config', 'protocol', 'documentation', 'script', 'data'
    tags TEXT[], -- Array of tags for flexible categorization

    -- Agent association
    agent_name TEXT, -- 'claude', 'gemini', 'grok', 'codex', etc.
    is_shared BOOLEAN DEFAULT false, -- Whether accessible by all agents

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    file_modified_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    description TEXT,
    keywords TEXT[],

    -- Search
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'C')
    ) STORED
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_path ON public.files(path);
CREATE INDEX IF NOT EXISTS idx_files_category ON public.files(category);
CREATE INDEX IF NOT EXISTS idx_files_agent ON public.files(agent_name);
CREATE INDEX IF NOT EXISTS idx_files_type ON public.files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_tags ON public.files USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_files_search ON public.files USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_files_updated ON public.files(updated_at DESC);

-- Enable full-text search
CREATE INDEX IF NOT EXISTS idx_files_content_search ON public.files USING GIN(to_tsvector('english', content));

-- Updated_at trigger (reuse from existing pattern)
CREATE TRIGGER set_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (adjust based on your auth setup)
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Enable read access for all users" ON public.files
    FOR SELECT
    USING (true);

-- Allow insert for service role
CREATE POLICY "Enable insert for service role" ON public.files
    FOR INSERT
    WITH CHECK (true);

-- Allow update for service role
CREATE POLICY "Enable update for service role" ON public.files
    FOR UPDATE
    USING (true);

-- Helper function to search files
CREATE OR REPLACE FUNCTION search_files(search_query TEXT)
RETURNS TABLE (
    id UUID,
    path TEXT,
    name TEXT,
    category TEXT,
    agent_name TEXT,
    description TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id,
        f.path,
        f.name,
        f.category,
        f.agent_name,
        f.description,
        ts_rank(f.search_vector, plainto_tsquery('english', search_query)) as rank
    FROM public.files f
    WHERE f.search_vector @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get files by category
CREATE OR REPLACE FUNCTION get_files_by_category(cat TEXT)
RETURNS SETOF public.files AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.files
    WHERE category = cat
    ORDER BY updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get agent files
CREATE OR REPLACE FUNCTION get_agent_files(agent TEXT)
RETURNS SETOF public.files AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.files
    WHERE agent_name = agent OR is_shared = true
    ORDER BY file_type, name;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.files IS 'Stores metadata and content for all gAIng system files';
COMMENT ON COLUMN public.files.content_hash IS 'SHA-256 hash for detecting file changes';
COMMENT ON COLUMN public.files.search_vector IS 'Generated full-text search vector';
COMMENT ON COLUMN public.files.is_shared IS 'Files accessible by all agents (like log.md)';
