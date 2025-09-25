-- schema.sql
-- Complete database schema for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS TABLE ====================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Clerk user ID
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== USER SUBSCRIPTIONS TABLE ====================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'trial', 'basic', 'pro', 'enterprise')),
  status TEXT DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'canceled', 'past_due')),
  current_period_end TIMESTAMPTZ,
  trial_start_date TIMESTAMPTZ,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== USER USAGE TABLE ====================
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  extraction_count INTEGER DEFAULT 0,
  current_month TEXT NOT NULL,  -- Format: YYYY-MM
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== USER CONTENT TABLE ====================
CREATE TABLE IF NOT EXISTS user_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PAYMENT HISTORY TABLE ====================
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL,  -- Amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== INDEXES FOR PERFORMANCE ====================
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_month ON user_usage(current_month);

CREATE INDEX IF NOT EXISTS idx_user_content_user_id ON user_content(user_id);
CREATE INDEX IF NOT EXISTS idx_user_content_status ON user_content(status);
CREATE INDEX IF NOT EXISTS idx_user_content_created ON user_content(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);

-- ==================== FUNCTIONS ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==================== TRIGGERS ====================

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_subscriptions table
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_content table
DROP TRIGGER IF EXISTS update_user_content_updated_at ON user_content;
CREATE TRIGGER update_user_content_updated_at
  BEFORE UPDATE ON user_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== HELPER VIEWS ====================

-- View for active subscriptions
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
  us.*,
  u.email,
  u.full_name
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
WHERE us.status = 'active'
  AND (us.current_period_end IS NULL OR us.current_period_end > NOW());

-- View for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  u.id,
  u.email,
  us.plan_type,
  us.status as subscription_status,
  uu.extraction_count,
  COUNT(uc.id) as content_count,
  u.created_at as user_since
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
LEFT JOIN user_usage uu ON u.id = uu.user_id
LEFT JOIN user_content uc ON u.id = uc.user_id
GROUP BY u.id, u.email, us.plan_type, us.status, uu.extraction_count, u.created_at;

-- ==================== COMMENTS ====================
COMMENT ON TABLE users IS 'Main users table synced with Clerk authentication';
COMMENT ON TABLE user_subscriptions IS 'User subscription and billing information';
COMMENT ON TABLE user_usage IS 'Track user usage for billing and limits';
COMMENT ON TABLE user_content IS 'User-generated content storage';
COMMENT ON TABLE payment_history IS 'Payment transaction history';
