# Bet Placement & MyBets Flow - Debug Guide

## Complete Flow: From Bet Placement to MyBets Display

### 1. **User Places a Bet (SharedTimeframesBetting.tsx)**

When a user clicks "Place Bet":
- Bet data is sent to `saveBetToSupabase(bet, userId)`
- Console logs: `💾 Bet to be saved (raw):` [bet object]
- Bet is transformed to database format:
  ```
  {
    user_id: string
    betType: string (e.g., "1X2", "BTTS", etc.)
    homeTeam: string (team short name)
    awayTeam: string (team short name)
    kickoffTime: ISO timestamp
    selection: string (e.g., "Home Win", "Over 1.5")
    odds: number
    stake: number
    potentialWinnings: number
    match: JSON string (full match object)
    status: 'pending'
  }
  ```

### 2. **Bet Saved to Database**

- Console logs: `📤 Saving bet to Supabase with data:` [betData]
- Insert query returns data: `✓ Bet saved successfully:` [returned data]
- If error: `❌ Error saving bet:` [error details]
- Notification created: `🔔 Creating notification for bet placement`

### 3. **User Views MyBets (MyBets.tsx)**

When MyBets page loads:
- Console logs: `📋 Fetching bets for user:` [userId]
- Calls `getBetsFromSupabase(userId)`

### 4. **getBetsFromSupabase Retrieves Bets**

- Console logs: `=== FETCHING BETS FOR USER:` [userId]
- Database query with `.order('created_at', { ascending: false })`
- Console logs: `✓ Raw bets from database:` [array of records]
- For each bet record:
  - Console logs: `Processing bet:` [record]
  - Parses match JSON field
  - Transforms to BetData format
  - Console logs: `Transformed bet:` [transformed object]
- Console logs: `✓ All transformed bets:` [final array]

### 5. **Bets Displayed in MyBets**

- If successful: `✓ Bets fetched successfully, count:` [number]
- Bets state updated and displayed
- Polling continues every 3 seconds: `🔄 Polling for bets...`

## Troubleshooting Checklist

### If bets don't appear:

1. **Check Browser Console** - Look for error logs starting with ❌
   
2. **Verify Database Query**
   - Look for `✓ Raw bets from database:` - if empty, bets weren't saved
   - Check if `user_id` matches the logged-in user's ID
   
3. **Check JSON Parsing**
   - Look for `Processing bet:` logs
   - If match field is corrupted, it will show in parsing warnings
   
4. **Verify MyBets Polling**
   - Look for `🔄 Polling for bets...` every 3 seconds
   - Confirms polling is active and refetching data
   
5. **Check Supabase RLS Policies**
   - Ensure user can read their own bets (user_id match)
   - Ensure user can insert bets with their user_id

## Key Console Logs to Monitor

**When placing a bet:**
```
💾 Bet to be saved (raw): {...}
📤 Saving bet to Supabase with data: {...}
✓ Bet saved successfully: [...]
🔔 Creating notification for bet placement
```

**When viewing MyBets:**
```
📋 Fetching bets for user: [userId]
=== FETCHING BETS FOR USER: [userId]
✓ Raw bets from database: [...]
Processing bet: {...}
Transformed bet: {...}
✓ All transformed bets: [...]
✓ Bets fetched successfully, count: [number]
🔄 Polling for bets...
```

**If something fails:**
```
❌ Error saving bet: [error]
❌ Database error fetching bets: [error]
❌ Error in fetchBets: [error]
```

## Common Issues

### Issue: "No bets found in database"
- Check if bet actually saved by looking for `✓ Bet saved successfully`
- Verify user_id is correct in the saved bet
- Check Supabase RLS policies

### Issue: "Could not parse match data"
- Match field might be corrupted or not properly stringified
- Check if match object exists in bet before saving
- Verify JSON serialization in saveBetToSupabase

### Issue: Bets appear then disappear
- Check polling logs - ensure `🔄 Polling for bets...` appears
- Verify bet status is 'pending' (not deleted or changed)
- Check if filter is hiding them

## Database Schema Expected

```sql
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  betType VARCHAR,
  type VARCHAR,
  homeTeam VARCHAR,
  awayTeam VARCHAR,
  kickoffTime TIMESTAMP,
  selection VARCHAR,
  odds FLOAT,
  stake FLOAT,
  potentialWinnings FLOAT,
  match TEXT, -- JSON stringified
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
)
```

## Testing Steps

1. Open DevTools (F12) and go to Console tab
2. Place a bet and watch for the log sequence
3. Check "✓ Bet saved successfully" appears
4. Navigate to MyBets
5. Watch for "🔄 Polling for bets..." appearing every 3 seconds
6. Verify "✓ Bets fetched successfully, count:" shows correct number
7. Check that bets are displayed on page within 3 seconds
