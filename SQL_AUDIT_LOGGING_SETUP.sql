-- Audit Logging Tables
-- Tracks all user actions for compliance and debugging

CREATE TABLE IF NOT EXISTS user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success', -- success, failed, pending
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX idx_user_actions_action ON user_actions(action);
CREATE INDEX idx_user_actions_created_at ON user_actions(created_at);
CREATE INDEX idx_user_actions_user_created ON user_actions(user_id, created_at DESC);

-- RLS Policy: Users can only see their own actions
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own actions" ON user_actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert actions" ON user_actions
  FOR INSERT WITH CHECK (true);

-- Action Categories:
-- Authentication: login, logout, signup, password_reset, email_verified
-- Betting: bet_placed, bet_cancelled, bet_won, bet_lost, bet_pushed
-- Financial: deposit_requested, deposit_confirmed, withdraw_requested, withdraw_confirmed, balance_updated
-- Account: profile_updated, settings_changed, referral_link_used
-- Admin: admin_override, fixture_edit, score_edit
