-- Optimize RLS performance across all user tables
-- Run this in Supabase SQL Editor after testing system_settings fix

-- Fix extractions table RLS performance
DROP POLICY IF EXISTS "Users can access their own extractions" ON public.extractions;
CREATE POLICY "Users can access their own extractions" ON public.extractions
FOR ALL USING (
  user_id = (select auth.uid()::text)
);

-- Fix user_subscriptions table RLS performance
DROP POLICY IF EXISTS "Users can access their own user_subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can access their own user_subscriptions" ON public.user_subscriptions
FOR ALL USING (
  user_id = (select auth.uid()::text)
);

-- Fix user_usage table RLS performance
DROP POLICY IF EXISTS "Users can access their own user_usage" ON public.user_usage;
CREATE POLICY "Users can access their own user_usage" ON public.user_usage
FOR ALL USING (
  user_id = (select auth.uid()::text)
);

-- Fix extraction_jobs table RLS performance
DROP POLICY IF EXISTS "Users can view own jobs" ON public.extraction_jobs;
CREATE POLICY "Users can view own jobs" ON public.extraction_jobs
FOR ALL USING (
  user_id = (select auth.uid()::text)
);

-- Fix interactions table RLS performance (more complex)
DROP POLICY IF EXISTS "Users can view own interactions" ON public.interactions;
CREATE POLICY "Users can view own interactions" ON public.interactions
FOR ALL USING (
  extraction_id IN (
    select id from public.extractions where user_id = (select auth.uid()::text)
  )
);

-- Verify policies were updated
-- You can run this to check:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('extractions', 'user_subscriptions', 'user_usage', 'extraction_jobs', 'interactions');