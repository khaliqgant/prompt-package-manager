-- Migration 026: Add Playground Credits System
-- Description: Creates tables for playground credits, transactions, and purchases
-- Author: AI Assistant
-- Date: 2025-10-30

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 0. ADD STRIPE CUSTOMER ID TO USERS TABLE
-- =====================================================
-- Add stripe_customer_id column to users table for individual credit purchases
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe Customer ID for individual user credit purchases and PRPM+ subscriptions';

-- Add PRPM+ subscription fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS prpm_plus_subscription_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS prpm_plus_status VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS prpm_plus_cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS prpm_plus_current_period_end TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_prpm_plus_status ON users(prpm_plus_status) WHERE prpm_plus_status IS NOT NULL;
COMMENT ON COLUMN users.prpm_plus_subscription_id IS 'Stripe Subscription ID for PRPM+ membership';
COMMENT ON COLUMN users.prpm_plus_status IS 'PRPM+ subscription status: active, past_due, canceled, incomplete, incomplete_expired, trialing, unpaid';

-- =====================================================
-- 1. PLAYGROUND SESSIONS TABLE
-- =====================================================
-- Stores playground session data with conversation history
CREATE TABLE IF NOT EXISTS playground_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Package info
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE NOT NULL,
  package_version VARCHAR(50),
  package_name VARCHAR(255) NOT NULL,

  -- Session data
  conversation JSONB NOT NULL DEFAULT '[]',
  -- conversation format: [{ role: 'user' | 'assistant', content: string, timestamp: ISO, tokens: number }]

  -- Credits and usage
  credits_spent INTEGER NOT NULL DEFAULT 1,
  estimated_tokens INTEGER DEFAULT 2000,

  -- Metadata
  model VARCHAR(50) NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  total_tokens INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  run_count INTEGER DEFAULT 1,

  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(32) UNIQUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_playground_sessions_user ON playground_sessions(user_id, created_at DESC);
CREATE INDEX idx_playground_sessions_package ON playground_sessions(package_id);
CREATE INDEX idx_playground_sessions_share ON playground_sessions(share_token) WHERE is_public = TRUE;
CREATE INDEX idx_playground_sessions_org ON playground_sessions(org_id) WHERE org_id IS NOT NULL;

COMMENT ON TABLE playground_sessions IS 'Stores playground session data with conversation history';
COMMENT ON COLUMN playground_sessions.conversation IS 'JSONB array of conversation messages with role, content, timestamp, and token count';
COMMENT ON COLUMN playground_sessions.share_token IS 'Unique token for sharing public playground sessions';

-- =====================================================
-- 2. PLAYGROUND USAGE TRACKING TABLE
-- =====================================================
-- Tracks individual playground runs for analytics
CREATE TABLE IF NOT EXISTS playground_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  session_id UUID REFERENCES playground_sessions(id) ON DELETE SET NULL,

  -- Usage metrics
  model VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  credits_spent INTEGER NOT NULL DEFAULT 1,

  -- Request metadata
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  error_occurred BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  -- Analytics fields
  package_version VARCHAR(50),
  input_length INTEGER,
  output_length INTEGER,
  comparison_mode BOOLEAN DEFAULT FALSE,

  -- Quality indicators (can be set later via feedback)
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  was_helpful BOOLEAN,
  user_feedback TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_playground_usage_user_time ON playground_usage(user_id, created_at DESC);
CREATE INDEX idx_playground_usage_org_time ON playground_usage(org_id, created_at DESC) WHERE org_id IS NOT NULL;
CREATE INDEX idx_playground_usage_package ON playground_usage(package_id) WHERE package_id IS NOT NULL;
CREATE INDEX idx_playground_usage_session ON playground_usage(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_playground_usage_model ON playground_usage(model, created_at DESC);
CREATE INDEX idx_playground_usage_package_model ON playground_usage(package_id, model) WHERE package_id IS NOT NULL;
CREATE INDEX idx_playground_usage_package_version ON playground_usage(package_id, package_version) WHERE package_id IS NOT NULL;
CREATE INDEX idx_playground_usage_success ON playground_usage(error_occurred, created_at DESC);
CREATE INDEX idx_playground_usage_rating ON playground_usage(user_rating) WHERE user_rating IS NOT NULL;

COMMENT ON TABLE playground_usage IS 'Tracks individual playground runs for analytics and billing';
COMMENT ON COLUMN playground_usage.user_rating IS 'User rating 1-5 stars for the result quality';
COMMENT ON COLUMN playground_usage.was_helpful IS 'Quick thumbs up/down feedback';

-- =====================================================
-- 3. PLAYGROUND CREDITS TABLE
-- =====================================================
-- Stores user credit balances and monthly allocations
CREATE TABLE IF NOT EXISTS playground_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Balance
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0,     -- Total ever earned
  lifetime_spent INTEGER NOT NULL DEFAULT 0,      -- Total ever spent
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,  -- Total purchased with money

  -- PRPM+ monthly credits
  monthly_credits INTEGER NOT NULL DEFAULT 0,           -- Current month total allocation
  monthly_credits_used INTEGER NOT NULL DEFAULT 0,      -- Used this month
  monthly_reset_at TIMESTAMP WITH TIME ZONE,            -- When monthly credits reset

  -- Rollover credits (max 1 month)
  rollover_credits INTEGER NOT NULL DEFAULT 0,
  rollover_expires_at TIMESTAMP WITH TIME ZONE,

  -- Purchased credits (never expire)
  purchased_credits INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT balance_sum_check CHECK (
    balance = (monthly_credits - monthly_credits_used) + rollover_credits + purchased_credits
  )
);

CREATE INDEX idx_playground_credits_user ON playground_credits(user_id);
CREATE INDEX idx_playground_credits_org ON playground_credits(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_playground_credits_monthly_reset ON playground_credits(monthly_reset_at)
  WHERE monthly_reset_at IS NOT NULL;
CREATE INDEX idx_playground_credits_rollover_expires ON playground_credits(rollover_expires_at)
  WHERE rollover_expires_at IS NOT NULL;

COMMENT ON TABLE playground_credits IS 'Stores user credit balances, monthly allocations, and rollover credits';
COMMENT ON COLUMN playground_credits.monthly_credits IS 'Total monthly allocation (200 for PRPM+, 0 for free)';
COMMENT ON COLUMN playground_credits.rollover_credits IS 'Unused credits from last month (max 200, expires after 1 month)';
COMMENT ON COLUMN playground_credits.purchased_credits IS 'Credits purchased separately (never expire)';

-- =====================================================
-- 4. PLAYGROUND CREDIT TRANSACTIONS TABLE
-- =====================================================
-- Logs all credit transactions for audit trail
CREATE TABLE IF NOT EXISTS playground_credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Transaction details
  amount INTEGER NOT NULL,  -- Positive for credit, negative for debit
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  transaction_type VARCHAR(50) NOT NULL CHECK (
    transaction_type IN ('signup', 'monthly', 'purchase', 'spend', 'rollover', 'expire', 'refund', 'bonus', 'admin')
  ),

  -- Context
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Related entities
  session_id UUID REFERENCES playground_sessions(id) ON DELETE SET NULL,
  purchase_id VARCHAR(255),  -- Stripe payment intent ID

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_playground_credit_tx_user ON playground_credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_playground_credit_tx_type ON playground_credit_transactions(transaction_type);
CREATE INDEX idx_playground_credit_tx_purchase ON playground_credit_transactions(purchase_id)
  WHERE purchase_id IS NOT NULL;
CREATE INDEX idx_playground_credit_tx_session ON playground_credit_transactions(session_id)
  WHERE session_id IS NOT NULL;

COMMENT ON TABLE playground_credit_transactions IS 'Audit log of all credit transactions';
COMMENT ON COLUMN playground_credit_transactions.transaction_type IS 'Type: signup, monthly, purchase, spend, rollover, expire, refund, bonus, admin';

-- =====================================================
-- 5. PLAYGROUND CREDIT PURCHASES TABLE
-- =====================================================
-- Tracks credit purchases via Stripe
CREATE TABLE IF NOT EXISTS playground_credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Purchase details
  credits INTEGER NOT NULL CHECK (credits > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency VARCHAR(3) DEFAULT 'usd' NOT NULL,
  package_type VARCHAR(20) CHECK (package_type IN ('small', 'medium', 'large')),

  -- Stripe data
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_status VARCHAR(50) DEFAULT 'pending' CHECK (
    stripe_status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled')
  ),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,

  -- Error tracking
  failure_reason TEXT
);

CREATE INDEX idx_playground_credit_purchases_user ON playground_credit_purchases(user_id, created_at DESC);
CREATE INDEX idx_playground_credit_purchases_stripe ON playground_credit_purchases(stripe_payment_intent_id);
CREATE INDEX idx_playground_credit_purchases_status ON playground_credit_purchases(stripe_status, created_at DESC);
CREATE INDEX idx_playground_credit_purchases_org ON playground_credit_purchases(org_id) WHERE org_id IS NOT NULL;

COMMENT ON TABLE playground_credit_purchases IS 'Tracks credit purchases via Stripe';
COMMENT ON COLUMN playground_credit_purchases.package_type IS 'small=100 credits, medium=250 credits, large=600 credits';

-- =====================================================
-- 6. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_playground_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for playground_credits updated_at
CREATE TRIGGER trigger_update_playground_credits_updated_at
  BEFORE UPDATE ON playground_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_playground_credits_updated_at();

-- Function to update playground_sessions updated_at
CREATE OR REPLACE FUNCTION update_playground_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for playground_sessions updated_at
CREATE TRIGGER trigger_update_playground_sessions_updated_at
  BEFORE UPDATE ON playground_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_playground_sessions_updated_at();

-- =====================================================
-- 7. SEED FREE CREDITS FOR EXISTING USERS
-- =====================================================

-- Give 5 free trial credits to all existing users who don't have credits yet
INSERT INTO playground_credits (user_id, balance, lifetime_earned, purchased_credits)
SELECT
  id as user_id,
  5 as balance,
  5 as lifetime_earned,
  5 as purchased_credits
FROM users
WHERE id NOT IN (SELECT user_id FROM playground_credits)
ON CONFLICT (user_id) DO NOTHING;

-- Log the free signup credits
INSERT INTO playground_credit_transactions (user_id, amount, balance_after, transaction_type, description)
SELECT
  id as user_id,
  5 as amount,
  5 as balance_after,
  'signup' as transaction_type,
  'Welcome to PRPM! Here are 5 free playground credits to get you started.' as description
FROM users
WHERE id NOT IN (
  SELECT user_id FROM playground_credit_transactions WHERE transaction_type = 'signup'
);

-- =====================================================
-- 8. GRANT MONTHLY CREDITS TO VERIFIED ORGANIZATIONS
-- =====================================================

-- Give 200 monthly credits to all users with verified organizations
UPDATE playground_credits
SET
  monthly_credits = 200,
  monthly_credits_used = 0,
  monthly_reset_at = NOW() + INTERVAL '1 month',
  balance = balance + 200,
  lifetime_earned = lifetime_earned + 200,
  updated_at = NOW()
WHERE user_id IN (
  SELECT DISTINCT om.user_id
  FROM organization_members om
  INNER JOIN organizations o ON om.org_id = o.id
  WHERE o.is_verified = TRUE
)
AND monthly_reset_at IS NULL;

-- Log monthly credit grants for verified org members
INSERT INTO playground_credit_transactions (user_id, amount, balance_after, transaction_type, description, metadata)
SELECT
  pc.user_id,
  200 as amount,
  pc.balance as balance_after,
  'monthly' as transaction_type,
  'PRPM+ monthly credits - Thank you for being a verified member!' as description,
  jsonb_build_object('source', 'migration', 'migration', '026') as metadata
FROM playground_credits pc
WHERE pc.monthly_reset_at IS NOT NULL
  AND pc.user_id NOT IN (
    SELECT user_id
    FROM playground_credit_transactions
    WHERE transaction_type = 'monthly'
      AND metadata->>'migration' = '026'
  );

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT permissions to read-only roles (if they exist)
-- GRANT SELECT ON playground_sessions TO readonly_user;
-- GRANT SELECT ON playground_usage TO readonly_user;
-- GRANT SELECT ON playground_credits TO readonly_user;
-- GRANT SELECT ON playground_credit_transactions TO readonly_user;
-- GRANT SELECT ON playground_credit_purchases TO readonly_user;

-- =====================================================
-- 10. COMPLETION
-- =====================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 026 completed successfully!';
  RAISE NOTICE 'Added stripe_customer_id to users table';
  RAISE NOTICE 'Created tables: playground_sessions, playground_usage, playground_credits, playground_credit_transactions, playground_credit_purchases';
  RAISE NOTICE 'Seeded % users with 5 free credits', (SELECT COUNT(*) FROM playground_credits WHERE balance = 5);
  RAISE NOTICE 'Granted % verified users 200 monthly credits', (SELECT COUNT(*) FROM playground_credits WHERE monthly_reset_at IS NOT NULL);
END $$;
