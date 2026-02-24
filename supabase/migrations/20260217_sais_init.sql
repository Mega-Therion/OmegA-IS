-- Create SAIS Events table for Intelligence Briefings
CREATE TABLE IF NOT EXISTS public.sais_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    money_amount NUMERIC DEFAULT 0,
    source_url TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sais_events ENABLE ROW LEVEL SECURITY;

-- Allow Service Role to manage everything
CREATE POLICY "Service Role Full Access" ON public.sais_events 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow Authenticated users to view briefings
CREATE POLICY "Authenticated Read Access" ON public.sais_events 
    FOR SELECT TO authenticated USING (true);
