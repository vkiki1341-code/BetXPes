# Data Flow Transformation: Week-Based → Global Time-Based

## BEFORE: Week-Based System

```
User opens site
        ↓
loadFixturesWithOutcomes()
        ↓
for (let weekIdx = 0; weekIdx < 36; weekIdx++)
        ↓
Generate Week 1, Week 2, ... Week 36
        ↓
Match each week to arbitrary time slot
        ↓
timeSlots = [now+0min, now+2min, now+4min, ...]
        ↓
Display Week 1 by default
        ↓
RESULT: Always shows Week 1 ❌
```

## AFTER: Global Time-Based System

```
User opens site
        ↓
getCurrentTimeframeIdx()
        ↓
Calculate: (Now - ReferenceEpoch) ÷ 30min = Match Index
        ↓
getMatchAtTime(slot) for each time slot
        ↓
Load correct match for REAL current time
        ↓
getTimeSlots() = [prev-30min, now, next+30min, ...]
        ↓
Display match scheduled for RIGHT NOW ✅
```

## Component State Evolution

### Week-Based Flow
```
State Variables:
- currentTimeframeIdx = 0 (always Week 1)
- liveTimeframeIdx = 0
- matchupsByTimeframe[slot] = Week 1 matches
- fixtureSchedule = [Week1, Week2, ... Week36]

Effect: setCurrentTimeframeIdx(0)
        ↓
Display: Always shows Week 1 ❌
```

### Global Time-Based Flow
```
State Variables:
- currentTimeframeIdx = getCurrentTimeframeIdx() (Match N)
- liveTimeframeIdx = Current match index (updates every 5 sec)
- matchupsByTimeframe[slot] = Global time matches
- timeSlots = [Time-30min, Time, Time+30min, ...]

Effect: Updates liveTimeframeIdx every 5 seconds
        ↓
Display: Always shows correct current match ✅
```

## Time Slot Generation

### BEFORE
```
getTimeSlots(count) {
  slots = [];
  for (i = 0; i < count; i++) {
    // Simple time increments
    slot = now + (i * 2 minutes);
    slots.push(slot);
  }
  return slots;
}

Result: [now, now+2min, now+4min, now+6min, ...]
        These don't align with global schedule! ❌
```

### AFTER
```
getTimeSlots(count) {
  schedule = getGlobalSchedule();
  slots = [];
  currentIndex = (now - schedule.referenceEpoch) / (30 * 60000);
  
  for (i = -2; i < count-2; i++) {
    slotIndex = currentIndex + i;
    slotTime = schedule.referenceEpoch + (slotIndex * 30 * 60000);
    slots.push(slotTime);
  }
  return slots;
}

Result: [time-60min, time-30min, TIME NOW, time+30min, time+60min, ...]
        Perfect alignment with global schedule! ✅
```

## Match Loading Flow

### BEFORE
```
for each week (0 to 35):
  ├─ Generate fixed matchups for week
  ├─ Fetch outcomes from Supabase (week-based)
  ├─ Store in matchupsByTimeframe[arbitrarySlot]
  └─ Result: timeSlots[weekIdx] → always shows Week 1 ❌

matchupsByTimeframe = {
  "arbitrary-time-1": [Week1-matches],
  "arbitrary-time-2": [Week2-matches],
  ...
}
```

### AFTER
```
for each timeSlot:
  ├─ Calculate which match plays at this time
  ├─ Call getMatchAtTime(slot)
  ├─ Fetch correct match from global system
  ├─ Store in matchupsByTimeframe[REAL-TIME-SLOT]
  └─ Result: timeSlots[idx] → shows correct match ✅

matchupsByTimeframe = {
  "2024-12-10T19:00:00": [{currentMatch-now}],
  "2024-12-10T19:30:00": [{match-30min-from-now}],
  "2024-12-10T20:00:00": [{match-60min-from-now}],
  ...
}
```

## Initialization Comparison

### BEFORE: App.tsx → SharedTimeframesBetting
```
App.tsx:
  setupGlobalTimeSystem() ← Sets global flag in localStorage
  BUT SharedTimeframesBetting ignores it!
        ↓
  setCurrentTimeframeIdx(0) ← Week 1
  setSelectedTimeSlot(slots[0]) ← Arbitrary first slot
  
RESULT: Global system initialized but not used ❌
```

### AFTER: App.tsx → SharedTimeframesBetting
```
App.tsx:
  setupGlobalTimeSystem() ← Sets global flag in localStorage
        ↓
  switchToGlobalTimeSystem() ← Forces switch
        ↓
SharedTimeframesBetting.tsx:
  Checks: isGlobalTimeActive = localStorage.getItem(...) !== null
  If TRUE:
    currentIdx = getCurrentTimeframeIdx() ← Match N
    selectedTimeSlot = currentMatch.kickoffTime ← Real time
    loadGlobalTimeMatches() ← Use global system
  
RESULT: Global system properly integrated and used ✅
```

## Live Index Update

### BEFORE
```
Manual week advancement:
useEffect(() => {
  if (prevMatchState === 'next-countdown' && matchState === 'pre-countdown') {
    currentTimeframeIdx++; ← Manual increment
  }
});

Issues:
- Manual timing required
- Can desync
- Requires careful state management ❌
```

### AFTER
```
Automatic time-based update:
useEffect(() => {
  const updateLiveIdx = () => {
    currentIdx = getCurrentTimeframeIdx(); ← Calculate from time
    setLiveTimeframeIdx(currentIdx);
  };
  
  interval = setInterval(updateLiveIdx, 5000); ← Check every 5 seconds
}, []);

Benefits:
- Automatically follows real time
- Always in sync
- No manual management needed ✅
```

## Visual Timeline

### BEFORE: Week-Based
```
User opens at 7:00 PM
        ↓
Component shows: Week 1 (arbitrary)
        ↓
Reload at 7:30 PM
        ↓
Component shows: Week 1 (same, not updated!)
        ↓
Manual click Week 2
        ↓
Shows Week 2 (but weeks not time-aligned)

PROBLEM: No connection to actual time! ❌
```

### AFTER: Time-Based
```
User opens at 7:00 PM
        ↓
System calculates: (7:00 PM - RefEpoch) ÷ 30min = Match 14
        ↓
Component shows: Match 14 (scheduled for 7:00 PM)
        ↓
Reload at 7:30 PM
        ↓
System calculates: (7:30 PM - RefEpoch) ÷ 30min = Match 15
        ↓
Component shows: Match 15 (scheduled for 7:30 PM)
        ↓
Automatic update every 5 seconds
        ↓
Always correct, always synced, no manual intervention needed ✅
```

## Global Sync Difference

### BEFORE
```
User A at 7:00 PM:    Shows Week 1
User B at 7:00 PM:    Shows Week 1
User C at 7:00 PM:    Shows Week 1

BUT: Week 1 doesn't correspond to 7:00 PM!
Everyone sees same week, but wrong content ❌
```

### AFTER
```
User A at 7:00 PM:    Shows Match scheduled for 7:00 PM
User B at 7:00 PM:    Shows SAME Match (same time)
User C at 7:00 PM:    Shows SAME Match (same time)

All users globally synchronized by time! ✅
```

## Memory/Performance Impact

### Storage Usage
```
BEFORE: 36 weeks × multiple matches per week → Large arrays in state
AFTER:  6-8 time slots → Smaller, more efficient

Performance: Better ✅
```

### Computation
```
BEFORE: Generate all 36 weeks on mount
AFTER:  Calculate current index once, show 6-8 slots

Performance: Better ✅
```

## Backward Compatibility

```
if (isGlobalTimeActive) {
  // Use new global time system ✅
} else {
  // Fall back to old week system (still there as fallback)
  // Allows gradual migration if needed
}
```

## Summary of Transformation

| Metric | Before | After |
|--------|--------|-------|
| **Time Alignment** | None ❌ | Perfect ✅ |
| **Updates** | Manual ❌ | Automatic ✅ |
| **Duplicates** | Yes ❌ | Never ✅ |
| **Global Sync** | Broken ❌ | Perfect ✅ |
| **Performance** | Heavy ❌ | Efficient ✅ |
| **Code Complexity** | High ❌ | Simple ✅ |
| **User Experience** | Broken ❌ | Smooth ✅ |

## Code Changes Summary

```diff
// getTimeSlots() - Complete rewrite
- for (i = 0; i < count; i++) slots.push(now + i*2min)
+ for (i = -2; i < count-2; i++) slots.push(refEpoch + scheduleIdx*interval)

// Match loading - Complete rewrite  
- loadFixturesWithOutcomes() ← Week-based
+ loadGlobalTimeMatches() ← Time-based

// Initialization - Updated
- setCurrentTimeframeIdx(0)
+ setCurrentTimeframeIdx(getCurrentTimeframeIdx())

// New polling - Added
+ setInterval(() => setLiveTimeframeIdx(getCurrentTimeframeIdx()), 5000)

// Week advancement - Disabled
+ if (!isGlobalTimeActive) return; // Skip old logic
```
