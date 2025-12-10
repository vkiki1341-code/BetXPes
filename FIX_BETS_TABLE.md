# Fix Bets Table - Step by Step Guide

## The Problem
The bets table exists but either:
1. Has the wrong column names, OR
2. Doesn't exist at all

## How to Fix

### Option 1: Drop and Recreate (If you have no data to keep)

Go to Supabase Dashboard → SQL Editor and run this:

```sql
-- DROP the existing bets table if it exists
DROP TABLE IF NOT EXISTS public.bets CASCADE;

-- CREATE new bets table with correct schema
CREATE TABLE public.bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  betType VARCHAR NOT NULL,
  selection VARCHAR NOT NULL,
  odds FLOAT NOT NULL,
  stake FLOAT NOT NULL,
  potentialWinnings FLOAT NOT NULL,
  match TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_bets_user_id ON public.bets(user_id);
CREATE INDEX idx_bets_created_at ON public.bets(created_at DESC);
CREATE INDEX idx_bets_status ON public.bets(status);

-- Enable RLS
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bets" ON public.bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bets" ON public.bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bets" ON public.bets
  FOR UPDATE USING (auth.uid() = user_id);
```

### Option 2: Check Current Schema (If you want to keep data)

1. Go to Supabase Dashboard
2. Click "Database" → "Tables" → "bets"
3. Look at the "Columns" section
4. Tell me what columns exist

Then I can adjust the code to match your current schema.

### Option 3: Verify the Table Exists

Run this query in SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bets' AND table_schema = 'public';
```

This will show you exactly what columns exist.

## After Running the SQL

Once the table is created or fixed:

1. Refresh your browser
2. Try placing a bet again
3. You should see in console:
   - `📤 Saving bet to Supabase with data:`
   - `✓ Bet saved successfully:`

## Quick Test

After table is ready:

1. Open DevTools (F12)
2. Go to Console tab
3. Select a match and odds in the betting page
4. Click "Place Bet"
5. Watch for success message:
   - Green toast notification should appear
   - Console should show `✓ Bet saved successfully:`
   - Balance should decrease by stake amount

## Still Having Issues?

If you still get a 400 error:

1. Check the exact error in console
2. Go to Supabase Dashboard → Logs
3. Look for the last failed query
4. Share the error message and I'll adjust the code

## Current Code Expects These Columns

The app is trying to save to these columns:
- `user_id` (from auth)
- `betType` (e.g., "1X2")
- `selection` (e.g., "1" or "Over 1.5")
- `odds` (number)
- `stake` (number)
- `potentialWinnings` (number)
- `match` (JSON as text)

Everything else is extracted from the match JSON when retrieving bets.
