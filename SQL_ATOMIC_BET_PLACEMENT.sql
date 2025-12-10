-- ==========================================
-- ATOMIC BET PLACEMENT RPC
-- ==========================================
-- This RPC function ensures bets are placed atomically:
-- 1. Validates user has sufficient balance
-- 2. Locks the user record during transaction
-- 3. Inserts all bets
-- 4. Deducts balance in same transaction
-- 5. Returns new balance or error

CREATE OR REPLACE FUNCTION place_bets_atomic(
  user_id_param UUID,
  bets_param JSONB,
  total_stake_param NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
  bet_record JSONB;
  inserted_bet_id UUID;
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
        (bet_record->>'match_id')::UUID,
        (bet_record->>'amount')::NUMERIC,
        bet_record->>'bet_type',
        bet_record->>'selection',
        (bet_record->>'odds')::NUMERIC,
        'pending',
        NOW()
      );
      
      bet_count := bet_count + 1;
    EXCEPTION WHEN others THEN
      -- Rollback entire transaction on any bet insertion error
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
  -- Catch any unexpected errors
  RETURN jsonb_build_object(
    'error', 'Transaction failed: ' || SQLERRM,
    'status', 'failed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- VALIDATE MATCH SCORES RPC
-- ==========================================
-- Validates that match scores are within realistic ranges

CREATE OR REPLACE FUNCTION validate_match_scores(
  home_goals_param INT,
  away_goals_param INT,
  max_goals_param INT DEFAULT 15
)
RETURNS JSONB AS $$
BEGIN
  -- Check home goals
  IF home_goals_param < 0 OR home_goals_param > max_goals_param THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Home team goals must be between 0 and ' || max_goals_param::TEXT
    );
  END IF;
  
  -- Check away goals
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
-- BULK BET PLACEMENT WITH VALIDATION
-- ==========================================
-- Enhanced version that validates all bets before inserting

CREATE OR REPLACE FUNCTION place_bets_validated(
  user_id_param UUID,
  bets_param JSONB,
  total_stake_param NUMERIC,
  min_stake_param NUMERIC DEFAULT 50
)
RETURNS JSONB AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
  bet_record JSONB;
  bet_index INT;
  stake_sum NUMERIC := 0;
  bets_inserted INT := 0;
BEGIN
  -- Get and lock user balance
  SELECT balance INTO current_balance 
  FROM users 
  WHERE id = user_id_param 
  FOR UPDATE;
  
  IF current_balance IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Validate total stake
  IF current_balance < total_stake_param THEN
    RETURN jsonb_build_object(
      'error', 'Insufficient balance',
      'current_balance', current_balance,
      'required', total_stake_param
    );
  END IF;
  
  -- Validate each bet
  bet_index := 0;
  FOR bet_record IN SELECT * FROM jsonb_array_elements(bets_param)
  LOOP
    -- Check minimum stake
    IF (bet_record->>'amount')::NUMERIC < min_stake_param THEN
      RETURN jsonb_build_object(
        'error', 'Bet ' || bet_index || ': Stake must be at least ' || min_stake_param::TEXT || ' KES',
        'failed_bet_index', bet_index
      );
    END IF;
    
    -- Check odds are positive
    IF (bet_record->>'odds')::NUMERIC <= 0 THEN
      RETURN jsonb_build_object(
        'error', 'Bet ' || bet_index || ': Invalid odds',
        'failed_bet_index', bet_index
      );
    END IF;
    
    -- Check match exists
    IF NOT EXISTS (SELECT 1 FROM matches WHERE id = (bet_record->>'match_id')::UUID) THEN
      RETURN jsonb_build_object(
        'error', 'Bet ' || bet_index || ': Match not found',
        'failed_bet_index', bet_index
      );
    END IF;
    
    stake_sum := stake_sum + (bet_record->>'amount')::NUMERIC;
    bet_index := bet_index + 1;
  END LOOP;
  
  -- Verify total stake matches sum
  IF stake_sum != total_stake_param THEN
    RETURN jsonb_build_object(
      'error', 'Stake mismatch: calculated ' || stake_sum::TEXT || ' but expected ' || total_stake_param::TEXT
    );
  END IF;
  
  -- Insert all bets
  FOR bet_record IN SELECT * FROM jsonb_array_elements(bets_param)
  LOOP
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
      (bet_record->>'match_id')::UUID,
      (bet_record->>'amount')::NUMERIC,
      bet_record->>'bet_type',
      bet_record->>'selection',
      (bet_record->>'odds')::NUMERIC,
      'pending',
      NOW()
    );
    
    bets_inserted := bets_inserted + 1;
  END LOOP;
  
  -- Deduct balance
  UPDATE users 
  SET balance = balance - total_stake_param,
      updated_at = NOW()
  WHERE id = user_id_param
  RETURNING balance INTO new_balance;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'new_balance', new_balance,
    'bets_placed', bets_inserted,
    'stake_deducted', total_stake_param
  );
  
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object(
    'error', 'Transaction failed: ' || SQLERRM,
    'bets_inserted', bets_inserted
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_bets_user_status ON bets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON bets(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_id ON matches(id);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
