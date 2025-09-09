-- Create interactions table for better performance
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.interactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    extraction_id uuid NOT NULL REFERENCES public.extraction_record(id) ON DELETE CASCADE,
    mechanism text NOT NULL,
    source_name text NOT NULL,
    source_level text NOT NULL,
    target_name text NOT NULL,
    target_level text NOT NULL,
    interaction_type text NOT NULL,
    details text,
    confidence text DEFAULT 'medium',
    reference_text text,
    page_number text,
    filename text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_interactions_extraction_id ON public.interactions(extraction_id);
CREATE INDEX IF NOT EXISTS idx_interactions_source_name ON public.interactions(source_name);
CREATE INDEX IF NOT EXISTS idx_interactions_target_name ON public.interactions(target_name);
CREATE INDEX IF NOT EXISTS idx_interactions_interaction_type ON public.interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_filename ON public.interactions(filename);

-- Add RLS (Row Level Security)
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only see interactions from their own extractions
CREATE POLICY "Users can view own interactions" ON public.interactions
FOR ALL USING (
    extraction_id IN (
        SELECT id FROM public.extraction_record WHERE user_id = auth.uid()::text
    )
);

-- Grant permissions
GRANT ALL ON public.interactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interactions TO authenticated;
