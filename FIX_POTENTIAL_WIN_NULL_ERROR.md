# Fix: "null value in column 'potential_win' violates not-null constraint"

## Problem
When trying to place a bet, you get this error:
```
Failed to place bet: Failed to insert bet: null value in column "potential_win" of relation "bets" violates not-null constraint
```

## Root Cause
The `potential_win` column in the `bets` table has a NOT NULL constraint, but the `place_bets_atomic()` PostgreSQL function wasn't calculating and inserting a value for it.

The `potential_win` should be: **amount × odds**

## Solution
Update the `place_bets_atomic()` function to calculate `potential_win` when inserting each bet.

### Step 1: Copy Updated SQL
The updated SQL with the fix is now in `FIX_MATCH_ID_TYPE.sql` (already updated).

### Step 2: Run in Supabase SQL Editor
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click **"SQL Editor"** in left sidebar
3. Click **"+ New Query"**
4. Copy the ENTIRE content from `FIX_MATCH_ID_TYPE.sql`
5. Paste into the SQL Editor
6. Click **"Run"** button

### Step 3: Verify Success
You should see:
```
✓ Query executed successfully
```

### Step 4: Test Bet Placement
1. Go back to BetXPesa app
2. Select a match
3. Create a bet (e.g., 100 KES at 2.5 odds)
4. Click "Confirm Bet"
5. Expected result: ✅ "Bet placed successfully!"

## What Changed
The `place_bets_atomic()` function now includes:
```sql
potential_win,
```
in the INSERT columns, and:
```sql
(bet_record->>'amount')::NUMERIC * (bet_record->>'odds')::NUMERIC,
```
in the VALUES to calculate potential_win = amount × odds.

## Example
- User stakes: 100 KES
- Odds: 2.5
- Potential win: 100 × 2.5 = **250 KES**

## Still Getting Error?
If you still see the NOT NULL error after running the SQL:

1. **Verify the function was updated** - Go to Supabase → Database → Functions → `place_bets_atomic`
   - Check that the INSERT statement includes `potential_win` column
   
2. **Verify column exists** - Go to Supabase → Database → Tables → `bets`
   - Check that `potential_win` column exists
   - If not, add it with: `ALTER TABLE public.bets ADD COLUMN potential_win NUMERIC NOT NULL DEFAULT 0;`

3. **Clear browser cache** - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Sometimes old function definitions are cached

## Need More Help?
Check the browser console (F12) for exact error details and share the full error message.
