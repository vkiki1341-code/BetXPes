# Quick Test Guide

## What Was Fixed

1. **Infinite Loading** - Added error handling and try/catch in sync
2. **Week Stuck on Match 1** - Fixed state updates and progression logic
3. **Removed Previous Weeks Section** - Deleted completely

## How to Test

### Step 1: Start the App
```bash
npm run dev
# Open http://localhost:5173
```

### Step 2: Check Console (F12)
Should see:
```
⚡ Initial sync from Supabase: { currentTimeframeIdx: 0, matchState: "pre-countdown", ... }
```

### Step 3: Watch Match Progression
- Match starts playing automatically (90 seconds)
- After match ends, goes to betting phase (30 seconds)
- Then shows next-countdown (10 seconds)
- **Then automatically advances to next week** ✅

### Step 4: Verify Week Advancement
- Watch the "Match Week X" counter
- Should increment automatically when each week ends
- Console should show progression messages

### Step 5: Test Global Sync
1. Open in Browser 1
2. Open same URL in Browser 2
3. Both should show same week number
4. When week ends in Browser 1, Browser 2 should update automatically

## Console Messages to Expect

```
⚡ Initial sync from Supabase: { currentTimeframeIdx: 0, ... }
✓ System state saved to DB: { currentTimeframeIdx: 1, ... }
✨ System state changed globally: { currentTimeframeIdx: 1, ... }
📡 Component updating from global state: { currentTimeframeIdx: 1, ... }
```

## If Still Having Issues

### Infinite Loading
- Check browser console for errors
- Verify Supabase connection
- Try hard refresh (Ctrl+Shift+R)

### Week Not Advancing
- Check if betting_system_state table exists in Supabase
- Verify table has 1 row with id=1
- Wait for full countdown cycle to complete (10+90+30+10 = 140 seconds per week)

### Different Weeks on Different Browsers
- Clear localStorage and refresh
- Both should fetch from same Supabase table
- Check database table is accessible

## Database Check

If week progression still doesn't work:

1. Go to Supabase Dashboard
2. Check if `betting_system_state` table exists
3. Table should have:
   - id: 1 (primary key)
   - current_timeframe_idx: 0-35
   - current_week: 1-36
   - match_state: pre-countdown, playing, betting, or next-countdown
   - countdown: countdown timer value

If table missing, create it:
```sql
CREATE TABLE betting_system_state (
  id BIGINT PRIMARY KEY DEFAULT 1,
  current_week INT DEFAULT 1,
  current_timeframe_idx INT DEFAULT 0,
  match_state TEXT DEFAULT 'pre-countdown',
  countdown INT DEFAULT 10,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(id)
);

INSERT INTO betting_system_state VALUES (1, 1, 0, 'pre-countdown', 10, NOW());

ALTER TABLE betting_system_state REPLICA IDENTITY FULL;
```

## What Should Happen

✅ Site loads without hanging
✅ Shows "Match Week 1"
✅ Match plays, ends, betting phase, next countdown
✅ Auto-advances to "Match Week 2"
✅ Process repeats
✅ All users see same week
✅ No page refresh needed for sync

---

**Build Status:** ✅ Successful (14.19s)
**Next Step:** Test in browser and observe console logs
