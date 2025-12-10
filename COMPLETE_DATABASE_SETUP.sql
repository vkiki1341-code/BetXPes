-- ==========================================
-- COMPLETE BETXPESA DATABASE SETUP
-- ==========================================
-- This script sets up ALL required tables, functions, and indexes
-- Run this in Supabase SQL Editor to get a fully functional betting system

-- ==========================================
-- 1. USERS TABLE (if not exists)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  balance NUMERIC DEFAULT 0,
  total_deposited NUMERIC DEFAULT 0,
  total_withdrawn NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 2. MATCHES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY,
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 3. BETS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT REFERENCES public.matches(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  bet_type VARCHAR NOT NULL,
  selection VARCHAR NOT NULL,
  odds NUMERIC NOT NULL,
  potential_win NUMERIC,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 4. REFERRALS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL UNIQUE,
  referred_count INTEGER DEFAULT 0,
  referral_earnings NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 5. REFERRAL_LIST TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.referral_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_email VARCHAR(255) NOT NULL,
  bonus_earned NUMERIC DEFAULT 500,
  status VARCHAR(20) DEFAULT 'active',
  referred_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(referrer_id, referred_user_id)
);

-- ==========================================
-- 6. NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 7. BETTING_SYSTEM_STATE TABLE (for realtime sync)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.betting_system_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_sync TIMESTAMP WITH TIME ZONE,
  total_bets_placed INTEGER DEFAULT 0,
  total_volume NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 8. MATCH_RESULTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_goals INTEGER,
  away_goals INTEGER,
  result VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 9. USER_SETTINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'dark',
  language VARCHAR(10) DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 10. INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON public.bets(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON public.bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_referral_list_referrer ON public.referral_list(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_list_referred ON public.referral_list(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_id ON public.matches(id);
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);

-- ==========================================
-- 11. PLACE_BETS_ATOMIC FUNCTION (CRITICAL)
-- ==========================================
CREATE OR REPLACE FUNCTION public.place_bets_atomic(
  user_id_param UUID,
  bets_param JSONB,
  total_stake_param NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
  bet_record JSONB;
  bet_count INT;
BEGIN
  -- Lock the user record to prevent concurrent updates
  SELECT balance INTO current_balance 
  FROM users 
  WHERE id = user_id_param 
  FOR UPDATE;
  
  -- Check if user exists
  IF current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'User not found',
      'status', 'failed',
      'new_balance', 0
    );
  END IF;
  
  -- Validate sufficient balance
  IF current_balance < total_stake_param THEN
    RETURN jsonb_build_object(
      'error', 'Insufficient balance. Required: ' || total_stake_param::TEXT || ' KES, Available: ' || current_balance::TEXT || ' KES',
      'status', 'insufficient_balance',
      'current_balance', current_balance,
      'required_stake', total_stake_param
    );
  END IF;
  
  -- Validate bet array is not empty
  IF jsonb_array_length(bets_param) = 0 THEN
    RETURN jsonb_build_object(
      'error', 'No bets to place',
      'status', 'invalid_bets'
    );
  END IF;
  
  -- Insert each bet atomically
  bet_count := 0;
  FOR bet_record IN SELECT * FROM jsonb_array_elements(bets_param)
  LOOP
    BEGIN
      INSERT INTO bets (
        user_id,
        match_id,
        amount,
        bet_type,
        selection,
        odds,
        status,
        created_at
      )
      VALUES (
        user_id_param,
        bet_record->>'match_id',
        (bet_record->>'amount')::NUMERIC,
        bet_record->>'bet_type',
        bet_record->>'selection',
        (bet_record->>'odds')::NUMERIC,
        'pending',
        NOW()
      );
      
      bet_count := bet_count + 1;
    EXCEPTION WHEN others THEN
      RETURN jsonb_build_object(
        'error', 'Failed to insert bet: ' || SQLERRM,
        'status', 'insertion_failed',
        'bets_inserted', bet_count
      );
    END;
  END LOOP;
  
  -- Deduct balance in same transaction
  UPDATE users 
  SET balance = balance - total_stake_param,
      updated_at = NOW()
  WHERE id = user_id_param
  RETURNING balance INTO new_balance;
  
  -- Return success with new balance
  RETURN jsonb_build_object(
    'status', 'ok',
    'new_balance', new_balance,
    'bets_placed', bet_count,
    'stake_deducted', total_stake_param
  );
  
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object(
    'error', 'Transaction failed: ' || SQLERRM,
    'status', 'failed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 12. VALIDATE_MATCH_SCORES FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.validate_match_scores(
  home_goals_param INT,
  away_goals_param INT,
  max_goals_param INT DEFAULT 15
)
RETURNS JSONB AS $$
BEGIN
  IF home_goals_param < 0 OR home_goals_param > max_goals_param THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Home team goals must be between 0 and ' || max_goals_param::TEXT
    );
  END IF;
  
  IF away_goals_param < 0 OR away_goals_param > max_goals_param THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Away team goals must be between 0 and ' || max_goals_param::TEXT
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'home_goals', home_goals_param,
    'away_goals', away_goals_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 13. ENABLE RLS (Row Level Security)
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 14. RLS POLICIES FOR USERS
-- ==========================================
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- 15. RLS POLICIES FOR BETS
-- ==========================================
CREATE POLICY "Users can view own bets" ON public.bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bets" ON public.bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 16. RLS POLICIES FOR NOTIFICATIONS
-- ==========================================
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 17. RLS POLICIES FOR REFERRALS
-- ==========================================
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own referrals" ON public.referrals
  FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 18. RLS POLICIES FOR REFERRAL_LIST
-- ==========================================
CREATE POLICY "Users can view referral history" ON public.referral_list
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- ==========================================
-- 19. RLS POLICIES FOR USER_SETTINGS
-- ==========================================
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- SETUP COMPLETE
-- ==========================================
-- All tables, functions, and policies created!
-- Your BetXPesa betting system is ready to use.
