-- Remove the interactions JSON column from extraction_record table
-- WARNING: This will remove all existing interaction data!
-- Make sure to run the migration script first if you want to preserve data

-- Step 1: Remove the interactions column (after migration)
-- ALTER TABLE public.extraction_record DROP COLUMN IF EXISTS interactions;

-- Step 2: Add indexes to extraction_record table for better performance
CREATE INDEX IF NOT EXISTS idx_extraction_record_user_id ON public.extraction_record(user_id);
CREATE INDEX IF NOT EXISTS idx_extraction_record_status ON public.extraction_record(status);
CREATE INDEX IF NOT EXISTS idx_extraction_record_disease_type ON public.extraction_record(disease_type);
CREATE INDEX IF NOT EXISTS idx_extraction_record_created_at ON public.extraction_record(created_at);

-- Step 3: Add index to extraction_jobs
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_user_id ON public.extraction_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON public.extraction_jobs(status);
