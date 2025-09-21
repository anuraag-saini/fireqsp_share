-- Fix system_settings RLS policy - CRITICAL
-- Run this in Supabase SQL Editor immediately

-- Create admin-only RLS policy for system_settings
CREATE POLICY "Admin only access" ON public.system_settings
FOR ALL USING (
  (select auth.jwt() ->> 'email') = ANY(ARRAY['asaini.anuraags@gmail.com'::text, 'admin@fireqsp.com'::text])
);

-- Grant permissions for admin access
GRANT ALL ON public.system_settings TO service_role;
GRANT SELECT, UPDATE ON public.system_settings TO authenticated;

-- Verify the policy was created
-- You can run this to check:
-- SELECT * FROM pg_policies WHERE tablename = 'system_settings';