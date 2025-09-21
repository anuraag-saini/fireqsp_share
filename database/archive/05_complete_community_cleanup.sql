-- Complete community cleanup - removes tables, triggers, and functions
-- Run this in Supabase SQL Editor

-- First drop all triggers that depend on the function
DROP TRIGGER IF EXISTS update_community_posts_updated_at ON public.community_posts;
DROP TRIGGER IF EXISTS update_community_replies_updated_at ON public.community_replies;
DROP TRIGGER IF EXISTS update_community_models_updated_at ON public.community_models;
DROP TRIGGER IF EXISTS update_community_user_stats_updated_at ON public.community_user_stats;
DROP TRIGGER IF EXISTS update_community_votes_updated_at ON public.community_votes;
DROP TRIGGER IF EXISTS update_community_model_ratings_updated_at ON public.community_model_ratings;
DROP TRIGGER IF EXISTS update_community_likes_updated_at ON public.community_likes;

-- Now drop the community tables (this will cascade delete any remaining policies)
DROP TABLE IF EXISTS public.community_likes CASCADE;
DROP TABLE IF EXISTS public.community_model_ratings CASCADE;
DROP TABLE IF EXISTS public.community_votes CASCADE;
DROP TABLE IF EXISTS public.community_user_stats CASCADE;
DROP TABLE IF EXISTS public.community_models CASCADE;
DROP TABLE IF EXISTS public.community_replies CASCADE;
DROP TABLE IF EXISTS public.community_posts CASCADE;

-- Now we can safely drop the functions
DROP FUNCTION IF EXISTS public.update_vote_count();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Verify cleanup
-- SELECT tablename FROM pg_tables WHERE tablename LIKE 'community_%';
-- SELECT proname FROM pg_proc WHERE proname IN ('update_vote_count', 'update_updated_at_column');

-- Re-run the secure function fix for remove_duplicate_interactions
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