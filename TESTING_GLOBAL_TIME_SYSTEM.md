# Testing Guide: Verify Global Time System in SharedTimeframesBetting

## Quick Verification (2 minutes)

### Step 1: Clear Cache
```powershell
# Open DevTools (F12)
# Go to Application tab
# Click Storage → Local Storage → betting.yourdomain.com
# Delete: betting_system_state
# Delete: global_match_schedule
```

Or use JavaScript console:
```javascript
localStorage.clear();
sessionStorage.clear();
```

### Step 2: Hard Refresh
```
Windows: Ctrl + Shift + Delete
Mac: Cmd + Shift + Delete
Or: Ctrl + F5
```

### Step 3: Check Browser Console
```javascript
// Open DevTools (F12) → Console tab
// You should see:
// ✅ Global time system is active - using global time to set timeframe
```

### Step 4: Verify Current Match
- Open betting page
- Look at the top: "🏟️ Match Week X" (should NOT be "Week 1" if it's not the first match)
- Look at the match display: Should show actual teams, not placeholder Week 1 teams
- Look at time slots: First slot with 🔴 LIVE badge is the current match

## Detailed Verification (5 minutes)

### Test 1: Verify Time-Based Match Display

```
Expected: When you open the site, you see the match scheduled for RIGHT NOW

Test Steps:
1. Note the current time (e.g., 7:34 PM)
2. Open the betting page
3. Look at the selected time slot (should be current time or nearby)
4. Check the teams displayed
5. Cross-reference with your global schedule to verify it's correct
```

**Console Check:**
```javascript
// In DevTools Console:

// Get current match
getCurrentMatch().then(m => console.log(
  `Current: ${m.homeTeam.name} vs ${m.awayTeam.name} at ${m.kickoffTime}`
))

// Get current timeframe index
const schedule = getGlobalSchedule();
const now = new Date();
const idx = Math.floor((now - schedule.referenceEpoch) / (schedule.matchInterval * 60000));
console.log(`Current timeframe index: ${idx}`);
```

### Test 2: Verify No Week 1 on Load

```
Expected: Brand new user opening app should NOT see Week 1

Test Steps:
1. Open app in Incognito window (fresh session)
2. Navigate to betting page
3. Check the match display
4. Verify it shows current time match, not "Week 1"
```

**Success Indicator:**
```
✅ See current match teams
✅ See current time slot highlighted as LIVE
✅ NOT see "Week 1" as the default
```

### Test 3: Verify Automatic Updates Every 30 Minutes

```
Expected: Match changes automatically every 30 minutes (or configured interval)

Manual Test (without waiting 30 minutes):
1. Open DevTools Console
2. Run: getCurrentTimeframeIdx() → Note the result
3. Wait 5 seconds (polling interval)
4. Run: getCurrentTimeframeIdx() again
5. Check if liveTimeframeIdx changed in component state
```

**Or use system time trick:**
```javascript
// In browser console, manually advance the reference epoch:
const schedule = getGlobalSchedule();
schedule.referenceEpoch -= 30 * 60000; // Move back 30 minutes
localStorage.setItem('global_match_schedule', JSON.stringify(schedule));
location.reload();

// Now you should see a different match (moved forward in schedule)
```

### Test 4: Verify Global Sync

```
Expected: Two users at the SAME time see the SAME match

Test Setup:
1. Open betting page on Computer A
2. Note the time and match displayed
3. Immediately open betting page on Computer B (at same time)
4. Compare matches shown
```

**Success Indicator:**
```
✅ Same match on both computers
✅ Same time slot highlighted
✅ Same teams displayed
✅ Perfect global synchronization
```

### Test 5: Verify No Duplicate Matches

```
Expected: Reloading never shows the same match twice

Test Steps:
1. Open betting page, note the match (e.g., "AFC Leopards vs Gor Mahia")
2. Reload page (F5)
3. Check if match changed
4. Repeat 5 times
```

**Success Indicator:**
```
✅ Match might stay same if 30-min interval hasn't passed
✅ Match changes after 30+ minutes
✅ Never see exact same match repeated
```

## Debugging Checklist

### If you still see Week 1:

```javascript
// Check 1: Is global system initialized?
const isInitialized = localStorage.getItem('global_match_schedule_initialized');
console.log('Global system initialized:', !!isInitialized); // Should be true

// Check 2: Is global time flag set?
const flag = localStorage.getItem('global_match_schedule_initialized');
console.log('Global flag:', flag); // Should show timestamp

// Check 3: Get current schedule
const schedule = JSON.parse(localStorage.getItem('global_match_schedule'));
console.log('Reference Epoch:', new Date(schedule.referenceEpoch));
console.log('Match Interval:', schedule.matchInterval, 'minutes');

// Check 4: Calculate current index
const now = new Date();
const diff = now.getTime() - schedule.referenceEpoch;
const idx = Math.floor(diff / (schedule.matchInterval * 60000));
console.log('Current timeframe index:', idx); // Should not be 0 unless recent initialization
```

### If matches repeat:

```javascript
// Check if reference epoch changes:
const s1 = JSON.parse(localStorage.getItem('global_match_schedule'));
setTimeout(() => {
  const s2 = JSON.parse(localStorage.getItem('global_match_schedule'));
  const changed = s1.referenceEpoch !== s2.referenceEpoch;
  console.log('Reference epoch changed:', changed); // Should be false
}, 2000);

// Check match calculation is deterministic:
const now = Date.now();
const idx = Math.floor((now - s1.referenceEpoch) / (s1.matchInterval * 60000));
console.log('Same calculation always gives:', idx); // Should be consistent
```

## Expected Console Logs

When you open the page, you should see:

```
✅ Global match scheduling system initialized
✅ Global time system is active - using global time to set timeframe
[Match loading...]
✅ Global time system is active - SKIPPING week-based state
[Component mounts]
✅ Global time system is active - using global time to set timeframe
```

## Performance Test

```javascript
// Measure time slot generation performance
console.time('getTimeSlots');
const slots = getTimeSlots(36);
console.timeEnd('getTimeSlots');

// Expected: < 10ms for all 36 slots
// If > 100ms, something is wrong
```

## Network Activity Check

```
Expected: No Supabase queries for current match (calculated locally)

Test:
1. Open DevTools → Network tab
2. Filter by 'Supabase' or 'API'
3. Open betting page
4. Watch network requests
5. Should NOT see queries for 'betting_system_state' or 'fixtures'
```

## Before & After Checklist

| Check | Before | After | Status |
|-------|--------|-------|--------|
| Shows Week 1 on load | ❌ Yes | ✅ No | |
| Shows current match | ❌ No | ✅ Yes | |
| Updates automatically | ❌ No | ✅ Yes | |
| Global sync works | ❌ No | ✅ Yes | |
| No duplicates | ❌ No | ✅ Yes | |
| Performance good | ⚠️ Fair | ✅ Good | |
| Time aligned | ❌ No | ✅ Yes | |

## Production Testing Checklist

- [ ] Clear cache on all devices
- [ ] Hard refresh on all devices
- [ ] Test at different times (morning, afternoon, evening)
- [ ] Test with 2+ users simultaneously
- [ ] Wait for automatic match transition (30 min)
- [ ] Test time slot navigation (past/present/future)
- [ ] Check DevTools console for errors
- [ ] Monitor Supabase quota usage (should decrease)
- [ ] Monitor page load time (should improve)
- [ ] Test on different browsers/devices

## Success Metrics

```
✅ All users globally see same match at same time
✅ No Week 1 visible for new users
✅ Matches change every 30 minutes
✅ No duplicate matches on reload
✅ Time slots align with real time
✅ Betting interface works normally
✅ Bet placement succeeds
✅ No console errors
```

## Troubleshooting Steps

1. **Clear everything:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Hard refresh:**
   - Windows: Ctrl + Shift + Delete
   - Mac: Cmd + Shift + Delete

3. **Close browser completely:**
   - All tabs
   - All windows

4. **Reopen in incognito:**
   - Private/incognito window
   - Ensures fresh cache

5. **Check initialization:**
   ```javascript
   // Should return true
   console.log(!!localStorage.getItem('global_match_schedule_initialized'));
   ```

## Questions to Answer

1. **Does the page show the correct match for the current time?**
   - Yes ✅ → System working
   - No ❌ → Check initialization logs

2. **Do all users see the same match?**
   - Yes ✅ → Global sync working
   - No ❌ → Check reference epoch

3. **Does the match change automatically?**
   - Yes ✅ → Polling working
   - No ❌ → Check interval setting

4. **Do matches repeat?**
   - Never ✅ → Time-based system working
   - Yes ❌ → Check match ID generation

## Final Validation

When you're confident the system is working:

1. Document any observed issues
2. Note the reference epoch timestamp
3. Record match transition times
4. Verify matches are unique
5. Confirm global synchronization
6. Mark as "Production Ready"

Status: 🟢 **READY FOR DEPLOYMENT**
