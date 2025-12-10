# Add Missing Bet Columns - Step by Step

## What's Happening
Your `bets` table exists but is missing the required columns. We need to add them so the application can save bets.

## Missing Columns
- `bet_type` - Type of bet (1X2, BTTS, OV/UN, etc.)
- `potential_winnings` - Potential return amount
- `status` - Bet status (pending, won, lost, void)
- `created_at` - Timestamp when bet was created
- `updated_at` - Timestamp when bet was last updated

## How to Fix (2 Steps)

### Step 1: Run the SQL Migration

1. Go to **Supabase Dashboard**
2. Click **"SQL Editor"** in the left sidebar
3. Click **"+ New Query"**
4. Open the file: `ADD_MISSING_BET_COLUMNS.sql` from this project
5. Copy ALL the SQL code
6. Paste it into the Supabase SQL Editor
7. Click **"Run"** button

### Step 2: Verify Success

After running the SQL, you should see output showing all columns. Look for:
- ✓ bet_type
- ✓ potential_winnings
- ✓ status
- ✓ created_at
- ✓ updated_at

And existing columns:
- ✓ user_id
- ✓ selection
- ✓ odds
- ✓ stake
- ✓ match

## After the Fix

1. **Refresh your browser** (Ctrl+F5)
2. **Try placing a bet again**
3. You should see:
   - `📤 Saving bet to Supabase with data:` in console
   - `✓ Bet saved successfully:` confirmation
   - Green success toast notification
   - Balance decreases by stake amount

## Testing the Flow

1. Open DevTools (F12)
2. Go to **Console** tab
3. Place a bet through the betting interface
4. Watch for these success messages:
   ```
   🎯 Placing bets, count: 1
   💾 Saving individual bet: {...}
   📤 Saving bet to Supabase with data: {...}
   ✓ Bet saved successfully: [...]
   🔔 Creating notification for bet placement
   ```

5. Go to **"My Bets"** page
6. Your placed bet should appear within 3 seconds

## If Still Getting Error

If you still see the same error, the columns might not have been added. Check:

1. Go to Supabase Dashboard → **Database** → **Tables** → **bets**
2. Look at the **Columns** section
3. Verify these columns exist:
   - user_id
   - bet_type
   - selection
   - odds
   - stake
   - potential_winnings
   - match
   - status
   - created_at

If any are missing, you can add them individually:

```sql
ALTER TABLE public.bets ADD COLUMN bet_type VARCHAR;
ALTER TABLE public.bets ADD COLUMN potential_winnings FLOAT;
ALTER TABLE public.bets ADD COLUMN status VARCHAR DEFAULT 'pending';
ALTER TABLE public.bets ADD COLUMN created_at TIMESTAMP DEFAULT now();
ALTER TABLE public.bets ADD COLUMN updated_at TIMESTAMP DEFAULT now();
```

## Code Changes Made

The application code was updated to use snake_case column names:
- `betType` → `bet_type`
- `potentialWinnings` → `potential_winnings`

This matches PostgreSQL naming conventions for the database.
