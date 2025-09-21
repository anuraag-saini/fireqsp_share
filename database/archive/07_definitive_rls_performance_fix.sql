-- DEFINITIVE RLS Performance Fix - Based on Supabase Recommendations
-- Run this in Supabase SQL Editor to eliminate all performance warnings

-- Fix extraction_jobs policy
ALTER POLICY "Users can view own jobs" ON public.extraction_jobs
USING (user_id = (select auth.uid())::text)
WITH CHECK (user_id = (select auth.uid())::text);

-- Fix extractions policy  
ALTER POLICY "Users can access their own extractions" ON public.extractions
USING (user_id = (select auth.uid())::text)
WITH CHECK (user_id = (select auth.uid())::text);

-- Fix interactions policy (most complex)
ALTER POLICY "Users can view own interactions" ON public.interactions
USING (
  extraction_id IN (
    SELECT e.id
    FROM public.extractions AS e
    WHERE e.user_id = (select auth.uid())::text
  )
);

-- Fix system_settings policy (admin-only)
ALTER POLICY "Admin only access" ON public.system_settings
USING (
  ((select auth.jwt()) ->> 'email') = ANY (ARRAY[
    'asaini.anuraags@gmail.com',
    'admin@fireqsp.com'
  ])
);

-- Fix user_subscriptions policy
ALTER POLICY "Users can access their own user_subscriptions" ON public.user_subscriptions
USING (user_id = (select auth.uid())::text)
WITH CHECK (user_id = (select auth.uid())::text);

-- Fix user_usage policy
ALTER POLICY "Users can access their own user_usage" ON public.user_usage
USING (user_id = (select auth.uid())::text)
WITH CHECK (user_id = (select auth.uid())::text);

-- Verify the changes
SELECT 
    tablename, 
    policyname,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies 
WHERE tablename IN ('system_settings', 'extractions', 'user_subscriptions', 'user_usage', 'extraction_jobs', 'interactions')
ORDER BY tablename;