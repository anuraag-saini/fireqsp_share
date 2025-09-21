-- Clean up unused community table policies
-- Run this in Supabase SQL Editor to remove community feature remnants

-- Drop all community table policies (if tables exist)
-- These are causing the duplicate policy warnings from the linter

-- community_posts policies
DROP POLICY IF EXISTS "Users can create posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.community_posts;

-- community_replies policies  
DROP POLICY IF EXISTS "Users can create replies" ON public.community_replies;
DROP POLICY IF EXISTS "Users can update own replies" ON public.community_replies;
DROP POLICY IF EXISTS "Users can insert their own replies" ON public.community_replies;
DROP POLICY IF EXISTS "Anyone can read community replies" ON public.community_replies;
DROP POLICY IF EXISTS "Users can view replies for accessible content" ON public.community_replies;

-- community_models policies
DROP POLICY IF EXISTS "Users can create models" ON public.community_models;
DROP POLICY IF EXISTS "Users can update own models" ON public.community_models;

-- community_user_stats policies
DROP POLICY IF EXISTS "Users can create own stats" ON public.community_user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.community_user_stats;

-- community_votes policies
DROP POLICY IF EXISTS "Users can create votes" ON public.community_votes;
DROP POLICY IF EXISTS "Users can update own votes" ON public.community_votes;

-- community_model_ratings policies
DROP POLICY IF EXISTS "Users can create ratings" ON public.community_model_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.community_model_ratings;

-- community_likes policies
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.community_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.community_likes;

-- Optional: Drop the tables entirely if not needed
-- Uncomment these lines if you want to remove the tables completely:

-- DROP TABLE IF EXISTS public.community_likes CASCADE;
-- DROP TABLE IF EXISTS public.community_model_ratings CASCADE;
-- DROP TABLE IF EXISTS public.community_votes CASCADE;
-- DROP TABLE IF EXISTS public.community_user_stats CASCADE;
-- DROP TABLE IF EXISTS public.community_models CASCADE;
-- DROP TABLE IF EXISTS public.community_replies CASCADE;
-- DROP TABLE IF EXISTS public.community_posts CASCADE;

-- Verify cleanup
-- SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'community_%';