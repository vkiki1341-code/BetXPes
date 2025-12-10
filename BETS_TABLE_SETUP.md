# Bets Table Setup - REQUIRED

## Problem
The application was trying to save bets with columns that don't exist in the bets table. The table needs to be created with the correct schema.

## Solution
You need to run the SQL migration in your Supabase dashboard.

## Steps to Set Up

1. **Go to Supabase Dashboard**
   - Open https://supabase.com
   - Log in to your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "+ New Query"

3. **Copy & Paste the SQL**
   - Open the file: `CREATE_BETS_TABLE.sql` in this project
   - Copy ALL the SQL code
   - Paste it into the Supabase SQL Editor
   - Click "Run" button

4. **Verify the Table**
   - Go to "Database" → "Tables" in left sidebar
   - You should see the `bets` table listed
   - Click on it to verify these columns exist:
     - `id` (UUID)
     - `user_id` (UUID) - references auth.users
     - `betType` (VARCHAR)
     - `selection` (VARCHAR)
     - `odds` (FLOAT)
     - `stake` (FLOAT)
     - `potentialWinnings` (FLOAT)
     - `match` (TEXT) - stores JSON
     - `status` (VARCHAR) - default 'pending'
     - `created_at` (TIMESTAMP)
     - `updated_at` (TIMESTAMP)

## What Changed

### In `src/lib/supabaseBets.ts`

The `saveBetToSupabase()` function now only saves these columns:
```javascript
{
  user_id,      // User's ID
  betType,      // Type of bet (1X2, BTTS, OV/UN, etc.)
  selection,    // What was selected
  odds,         // The odds
  stake,        // Amount staked
  potentialWinnings,  // Potential return
  match         // Full match data as JSON string
}
```

### Removed Columns (no longer saved)
- `type` - redundant with betType
- `homeTeam` - extracted from match JSON
- `awayTeam` - extracted from match JSON
- `kickoffTime` - inside match JSON

These are now extracted from the `match` JSON field when displaying bets.

## Testing

After setting up the table:

1. Go to the betting page
2. Select a match and odds
3. Click "Place Bet"
4. You should see:
   - `✓ Bet saved successfully:` in the console
   - A success toast notification
   - Balance deducted

5. Go to "My Bets"
6. You should see the bet displayed with:
   - Match teams
   - Bet type
   - Selection
   - Odds
   - Stake
   - Status (pending)

## Console Logs to Watch

When placing a bet:
```
💾 Bet to be saved (raw): {...}
📤 Saving bet to Supabase with data: {...}
✓ Bet saved successfully: [...]
🔔 Creating notification for bet placement
```

If you see `❌ Error saving bet:` with `Could not find the 'X' column`, it means the table schema is still wrong. Verify you ran the SQL correctly.

## RLS Policies

The SQL automatically creates Row Level Security (RLS) policies:
- ✓ Users can only view their own bets
- ✓ Users can only insert their own bets
- ✓ Users can only update their own bets

No one can see or modify other users' bets.
