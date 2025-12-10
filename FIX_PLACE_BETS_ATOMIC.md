# 🔧 Fix: place_bets_atomic Function Missing

## ❌ Problem
You're getting this error when placing a bet:
```
Failed to place bet: could not find the function public.place_bets_atomic(bets_param,total_stake_prm,user_id_param) in the schema cache
```

## ✅ Solution
The PostgreSQL function `place_bets_atomic` is missing from your Supabase database. You need to create it.

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com and login
2. Click on your BetXPesa project
3. In the left sidebar, click **SQL Editor**
4. Click **New Query**

### Step 2: Copy the Function Code
Copy the entire content of `SQL_ATOMIC_BET_PLACEMENT.sql` from your project

### Step 3: Paste and Run
Paste the SQL code into the Supabase query editor and click **Run**

### Step 4: Verify Success
You should see a message like:
```
Query executed successfully (207.2ms)
```

---

## 📋 Quick SQL Command

If you just want to run the minimal function, copy this:

```sql
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
```

---

## 🔍 Verify It's Working
After running the SQL:
1. Go back to your BetXPesa app
2. Try placing a bet again
3. It should now work without errors

---

## 📚 What This Function Does
- ✅ Locks user balance to prevent race conditions
- ✅ Validates sufficient balance
- ✅ Inserts all bets atomically
- ✅ Deducts balance in same transaction
- ✅ Returns success/error with new balance

---

## ⚠️ If You Still Get an Error

**Check these tables exist:**
- `users` table with `balance` column
- `bets` table with proper columns

**Try this in Supabase SQL Editor:**
```sql
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'bets');
```

Both should return results. If not, you need to create these tables first.
