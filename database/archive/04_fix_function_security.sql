-- Fix remove_duplicate_interactions function security
-- Run this in Supabase SQL Editor

-- Drop and recreate the function with secure search_path
DROP FUNCTION IF EXISTS public.remove_duplicate_interactions(uuid);

CREATE OR REPLACE FUNCTION public.remove_duplicate_interactions(p_extraction_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  removed_count integer;
BEGIN
  -- Use a CTE to be extra explicit about the scope
  WITH duplicates_to_remove AS (
    SELECT i1.id
    FROM interactions i1
    INNER JOIN interactions i2 ON (
      i1.extraction_id = i2.extraction_id
      AND i1.id < i2.id
      AND TRIM(LOWER(i1.source_name)) = TRIM(LOWER(i2.source_name))
      AND TRIM(LOWER(i1.target_name)) = TRIM(LOWER(i2.target_name))
    )
    WHERE i1.extraction_id = p_extraction_id  -- 🔒 DOUBLE SAFETY CHECK
  )
  DELETE FROM interactions 
  WHERE id IN (SELECT id FROM duplicates_to_remove);
  
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  RAISE NOTICE 'Removed % duplicate interactions for extraction %', removed_count, p_extraction_id;
  
  RETURN removed_count;  -- Return count instead of void
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.remove_duplicate_interactions(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_duplicate_interactions(uuid) TO authenticated;

-- Drop unused community-related functions (if they exist)
DROP FUNCTION IF EXISTS public.update_vote_count();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Note: Only the remove_duplicate_interactions function is preserved as it's needed for the app