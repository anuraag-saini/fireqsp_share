-- Fix RLS performance issues - CORRECTED VERSION
-- Run this in Supabase SQL Editor

-- Fix system_settings table RLS performance
DROP POLICY IF EXISTS "Admin only access" ON public.system_settings;
CREATE POLICY "Admin only access" ON public.system_settings
FOR ALL USING (
  (select auth.jwt() ->> 'email') = ANY(ARRAY['asaini.anuraags@gmail.com'::text, 'admin@fireqsp.com'::text])
);

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

-- Fix interactions table RLS performance (more complex due to subquery)
DROP POLICY IF EXISTS "Users can view own interactions" ON public.interactions;
CREATE POLICY "Users can view own interactions" ON public.interactions
FOR ALL USING (
  extraction_id IN (
    select id from public.extractions where user_id = (select auth.uid()::text)
  )
);

-- Verify the changes
SELECT 
    tablename, 
    policyname,
    qual as policy_expression
FROM pg_policies 
WHERE tablename IN ('system_settings', 'extractions', 'user_subscriptions', 'user_usage', 'extraction_jobs', 'interactions')
ORDER BY tablename;