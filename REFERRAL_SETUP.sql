-- Referral System Setup for Supabase

-- 1. Create referrals table (if not exists)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL UNIQUE,
  referred_count INTEGER DEFAULT 0,
  referral_earnings INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create referral_list table (tracks individual referrals)
CREATE TABLE IF NOT EXISTS referral_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_email VARCHAR(255) NOT NULL,
  bonus_earned INTEGER DEFAULT 500,
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, revoked
  referred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(referrer_id, referred_user_id)
);

-- 3. Enable RLS on referrals table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own referrals" ON referrals
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Enable RLS on referral_list table
ALTER TABLE referral_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral list" ON referral_list
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_list_referrer ON referral_list(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_list_referred_user ON referral_list(referred_user_id);

-- 6. Modify users table if needed (add referral_code column)
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_used_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Sample queries:
-- Get user's referral info:
-- SELECT * FROM referrals WHERE user_id = 'user-id-here';

-- Get user's referrals list:
-- SELECT * FROM referral_list WHERE referrer_id = 'user-id-here' ORDER BY referred_at DESC;

-- Update earnings when someone signs up:
-- UPDATE referrals SET referred_count = referred_count + 1, referral_earnings = referral_earnings + 500 WHERE referral_code = 'code-here';
