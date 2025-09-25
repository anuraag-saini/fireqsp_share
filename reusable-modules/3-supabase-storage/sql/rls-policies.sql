-- rls-policies.sql
-- Row Level Security (RLS) Policies

-- ==================== ENABLE RLS ====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- ==================== USERS TABLE POLICIES ====================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.jwt() ->> 'sub' = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.jwt() ->> 'sub' = id);

-- Service role can do everything (for webhooks and admin operations)
CREATE POLICY "Service role has full access to users"
  ON users FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ==================== USER SUBSCRIPTIONS POLICIES ====================

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.jwt() ->> 'sub' = user_id);

-- Service role has full access (for Stripe webhooks)
CREATE POLICY "Service role has full access to subscriptions"
  ON user_subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ==================== USER USAGE POLICIES ====================

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON user_usage FOR SELECT
  USING (auth.jwt() ->> 'sub' = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to usage"
  ON user_usage FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ==================== USER CONTENT POLICIES ====================

-- Users can view their own content
CREATE POLICY "Users can view own content"
  ON user_content FOR SELECT
  USING (auth.jwt() ->> 'sub' = user_id);

-- Users can create their own content
CREATE POLICY "Users can create own content"
  ON user_content FOR INSERT
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Users can update their own content
CREATE POLICY "Users can update own content"
  ON user_content FOR UPDATE
  USING (auth.jwt() ->> 'sub' = user_id);

-- Users can delete their own content
CREATE POLICY "Users can delete own content"
  ON user_content FOR DELETE
  USING (auth.jwt() ->> 'sub' = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to content"
  ON user_content FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ==================== PAYMENT HISTORY POLICIES ====================

-- Users can view their own payment history
CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  USING (auth.jwt() ->> 'sub' = user_id);

-- Service role has full access (for Stripe webhooks)
CREATE POLICY "Service role has full access to payments"
  ON payment_history FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ==================== STORAGE POLICIES ====================

-- Create storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload files to their own folder
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-uploads' 
    AND auth.jwt() ->> 'sub' = (storage.foldername(name))[1]
  );

-- Users can view their own files
CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-uploads'
    AND auth.jwt() ->> 'sub' = (storage.foldername(name))[1]
  );

-- Users can update their own files
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-uploads'
    AND auth.jwt() ->> 'sub' = (storage.foldername(name))[1]
  );

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-uploads'
    AND auth.jwt() ->> 'sub' = (storage.foldername(name))[1]
  );

-- ==================== ADMIN POLICIES (Optional) ====================

-- Create admin role check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (is_admin());

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON user_subscriptions FOR SELECT
  USING (is_admin());

-- Admins can view all content
CREATE POLICY "Admins can view all content"
  ON user_content FOR SELECT
  USING (is_admin());

-- ==================== HELPFUL FUNCTIONS ====================

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT plan_type
    FROM user_subscriptions
    WHERE user_id = p_user_id
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment user usage
CREATE OR REPLACE FUNCTION increment_usage(p_user_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_current_month TEXT;
BEGIN
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  INSERT INTO user_usage (user_id, extraction_count, current_month)
  VALUES (p_user_id, 1, v_current_month)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    extraction_count = CASE 
      WHEN user_usage.current_month = v_current_month 
      THEN user_usage.extraction_count + 1
      ELSE 1
    END,
    current_month = v_current_month,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== COMMENTS ====================
COMMENT ON POLICY "Users can view own profile" ON users IS 'Allow users to view their own profile data';
COMMENT ON POLICY "Service role has full access to users" ON users IS 'Allow service role for webhooks and admin operations';
COMMENT ON FUNCTION has_active_subscription IS 'Check if a user has an active subscription';
COMMENT ON FUNCTION get_user_plan IS 'Get the current plan type for a user';
COMMENT ON FUNCTION increment_usage IS 'Increment user usage count for the current month';
