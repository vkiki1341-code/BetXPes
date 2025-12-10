-- ==========================================
-- FIX: Change match_id from UUID to TEXT
-- ==========================================
-- The matches table uses TEXT IDs like "en-week3-game0"
-- but bets table was expecting UUID
-- This migration fixes the type mismatch

-- 1) Update bets table to use TEXT for match_id instead of UUID
ALTER TABLE public.bets
DROP CONSTRAINT IF EXISTS bets_match_id_fkey;

-- Change column type
ALTER TABLE public.bets
ALTER COLUMN match_id TYPE TEXT;

-- Re-add foreign key with TEXT
ALTER TABLE public.bets
ADD CONSTRAINT bets_match_id_fkey 
FOREIGN KEY (match_id) REFERENCES public.matches(id) 
ON DELETE CASCADE;

-- 2) Update the place_bets_atomic function to accept TEXT match_id
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
        potential_win,
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
        (bet_record->>'amount')::NUMERIC * (bet_record->>'odds')::NUMERIC,
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
-- COMPLETION
-- ==========================================
-- Run this in Supabase SQL Editor
-- After running, bets will accept TEXT match_id like "en-week3-game0"
