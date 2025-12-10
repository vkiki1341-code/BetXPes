# 🔧 Fix: Match ID Type Error

## ❌ The Problem
When placing a bet, you get this error:
```
Failed to insert bet: invalid input syntax for type uuid: "en-week3-game0"
```

This happens because:
- Your matches use **TEXT IDs** like `"en-week3-game0"` (country-week-game format)
- Your database **bets table** expects **UUID** for match_id
- The mismatch causes the insertion to fail

## ✅ The Solution

Run this SQL in your Supabase SQL Editor:

```sql
-- 1) Drop the old UUID constraint
ALTER TABLE public.bets
DROP CONSTRAINT IF EXISTS bets_match_id_fkey;

-- 2) Change match_id column from UUID to TEXT
ALTER TABLE public.bets
ALTER COLUMN match_id TYPE TEXT;

-- 3) Add back the foreign key (now with TEXT type)
ALTER TABLE public.bets
ADD CONSTRAINT bets_match_id_fkey 
FOREIGN KEY (match_id) REFERENCES public.matches(id) 
ON DELETE CASCADE;

-- 4) Update the place_bets_atomic function
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
  -- Lock the user record
  SELECT balance INTO current_balance 
  FROM users 
  WHERE id = user_id_param 
  FOR UPDATE;
  
  IF current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'User not found',
      'status', 'failed',
      'new_balance', 0
    );
  END IF;
  
  IF current_balance < total_stake_param THEN
    RETURN jsonb_build_object(
      'error', 'Insufficient balance. Required: ' || total_stake_param::TEXT || ' KES, Available: ' || current_balance::TEXT || ' KES',
      'status', 'insufficient_balance',
      'current_balance', current_balance,
      'required_stake', total_stake_param
    );
  END IF;
  
  IF jsonb_array_length(bets_param) = 0 THEN
    RETURN jsonb_build_object(
      'error', 'No bets to place',
      'status', 'invalid_bets'
    );
  END IF;
  
  -- Insert each bet
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
  
  -- Deduct balance
  UPDATE users 
  SET balance = balance - total_stake_param,
      updated_at = NOW()
  WHERE id = user_id_param
  RETURNING balance INTO new_balance;
  
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
```

## 📋 Step-by-Step Instructions

1. **Open Supabase Console**
   - Go to https://supabase.com
   - Select your BetXPesa project
   - Click **SQL Editor** in the left sidebar

2. **Create New Query**
   - Click **New Query**
   - Copy the entire SQL code above into the editor

3. **Run the SQL**
   - Click the **Run** button
   - Wait for success message

4. **Test the Fix**
   - Go back to your BetXPesa app
   - Try placing a bet again
   - It should now work! ✅

## 🎯 What Changed
- `bets.match_id` is now **TEXT** instead of UUID
- Accepts match IDs like: `"en-week3-game0"`, `"de-week10-game2"`, etc.
- The `place_bets_atomic` function correctly handles TEXT match_id
- Bets will now insert successfully without UUID errors

## ✅ Verify It Works
After running the SQL, try placing a bet. You should see:
- No UUID error
- ✓ "Bet placed successfully!"
- Your balance updated correctly
