# Code Changes Location Map

## File: src/pages/SharedTimeframesBetting.tsx

### Change #1: Supabase State Functions
**Location:** Lines 1-115 (before component definition)
**What:** 4 new functions for global state management
- `getSystemStateFromSupabase()` - Fetch global state from DB
- `saveSystemStateToSupabase(state)` - Save global state to DB
- `getDefaultSystemState()` - Fallback values
- Updated `saveSystemState(state)` - Now calls Supabase too

**Lines:** 16-115
```typescript
async function getSystemStateFromSupabase() { ... }
async function saveSystemStateToSupabase(state: any) { ... }
function getDefaultSystemState() { ... }
function getSystemState() { ... }
function saveSystemState(state: any) { ... }
```

---

### Change #2: Sync on Mount + Realtime Subscription
**Location:** Lines 308-352 (after balance subscription useEffect)
**What:** Fetch global state and subscribe to changes
**Lines:** 308-352
```typescript
useEffect(() => {
  // Fetch current global state
  const globalState = await getSystemStateFromSupabase();
  
  // Subscribe to realtime changes
  supabase.channel('betting_system_state_changes')
    .on('postgres_changes', ...)
    .subscribe();
}, [])
```

**Key Features:**
- Runs once on component mount
- Fetches current week from Supabase
- Subscribes to all changes
- Broadcasts events to listeners
- Cleans up subscription on unmount

---

### Change #3: State Change Listener
**Location:** Lines 369-385 (after showFixture state)
**What:** Listen for global state changes and update component
**Lines:** 369-385
```typescript
useEffect(() => {
  const handleSystemStateChange = (event: any) => {
    setCurrentTimeframeIdx(newState.currentTimeframeIdx);
    setLiveTimeframeIdx(newState.currentTimeframeIdx);
    setMatchState(newState.matchState);
    setCountdown(newState.countdown);
  };

  window.addEventListener('systemStateChanged', handleSystemStateChange);
  return () => {
    window.removeEventListener('systemStateChanged', handleSystemStateChange);
  };
}, [])
```

**Key Features:**
- Listens for 'systemStateChanged' events
- Updates all relevant component state variables
- Automatically cleans up listener
- Triggers component re-render with new values

---

### Change #4: Week Progression Saves to Supabase
**Location:** Lines 498-514 (in week advancement logic)
**What:** Save new week to Supabase when week progresses
**Before:**
```typescript
saveSystemState({
  currentWeek: nextIdx + 1,
  currentTimeframeIdx: nextIdx,
  matchState: 'pre-countdown',
  countdown: 10,
});
```

**After:**
```typescript
const newState = {
  currentWeek: nextIdx + 1,
  currentTimeframeIdx: nextIdx,
  matchState: 'pre-countdown',
  countdown: 10,
};
saveSystemState(newState);
saveSystemStateToSupabase(newState).catch(err => console.error(...));
```

**Key Features:**
- Creates state object once
- Saves to both localStorage and Supabase
- Error handling for failed saves
- Triggers broadcast to all users

---

### Change #5: Previous Weeks Outcomes Section
**Location:** Lines 1045-1100 (before "Show current match week" comment)
**What:** Display grid of completed weeks with outcomes
**Lines:** 1045-1100
```typescript
{currentTimeframeIdx > 0 && (
  <div className="mb-8 w-full">
    <h3>📊 Previous Weeks Outcomes</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: currentTimeframeIdx }).map((_, weekIdx) => {
        // Calculate week results
        // Display week card with stats
        // Add "View Details" button
      })}
    </div>
  </div>
)}
```

**Features:**
- Shows only when currentTimeframeIdx > 0
- Responsive grid (1 col mobile, 3 cols desktop)
- Calculates wins/draws/losses per week
- Clickable cards to view week details
- Shows match count and statistics

---

## File Structure Summary

```
src/pages/SharedTimeframesBetting.tsx
│
├─ Lines 1-115: Supabase State Functions
│  ├─ getSystemStateFromSupabase()
│  ├─ saveSystemStateToSupabase()
│  ├─ getDefaultSystemState()
│  ├─ getSystemState() [updated]
│  └─ saveSystemState() [updated]
│
├─ Lines 237-450: Component Definition & State
│  └─ const BetXPesa = () => { ... }
│
├─ Lines 308-352: Sync on Mount + Subscription (NEW)
│  └─ useEffect(() => { getSystemStateFromSupabase() + subscribe })
│
├─ Lines 369-385: State Change Listener (NEW)
│  └─ useEffect(() => { addEventListener('systemStateChanged') })
│
├─ Lines 400-500: Match Simulation Logic
│  └─ useEffect(() => { ... week progression ... })
│
├─ Lines 498-514: Week Progression (UPDATED)
│  └─ saveSystemState() + saveSystemStateToSupabase()
│
├─ Lines 900-1000: Time Slots & Bet Types
│  └─ Timeframe selection UI
│
├─ Lines 1045-1100: Previous Weeks Section (NEW)
│  └─ Grid display of completed weeks
│
├─ Lines 1040-1500: Current Match Display
│  ├─ Current week header
│  ├─ Match list
│  ├─ Betting options
│  └─ Modals
│
└─ Lines 1500-end: Other UI sections
   └─ Correct score, history, footer, etc.
```

---

## Changes at a Glance

| Change | Lines | Type | Status |
|--------|-------|------|--------|
| Supabase functions | 1-115 | Add | ✅ |
| Sync + Subscribe | 308-352 | Add | ✅ |
| State listener | 369-385 | Add | ✅ |
| Week progression | 498-514 | Update | ✅ |
| Previous weeks UI | 1045-1100 | Add | ✅ |

---

## How to Find Them in VS Code

### Method 1: Use Ctrl+G (Go to Line)
- Press Ctrl+G
- Type line number
- Press Enter
- Jump to that line

**Examples:**
- `Ctrl+G` → `16` → See getSystemStateFromSupabase()
- `Ctrl+G` → `308` → See sync hook
- `Ctrl+G` → `369` → See listener hook
- `Ctrl+G` → `498` → See week progression
- `Ctrl+G` → `1045` → See previous weeks UI

### Method 2: Use Ctrl+F (Find)
- Press Ctrl+F
- Search for:
  - `getSystemStateFromSupabase` - Find all usages
  - `systemStateChanged` - Find event dispatch/listen
  - `Previous Weeks Outcomes` - Find UI section
  - `saveSystemStateToSupabase` - Find saves to DB

### Method 3: Use Ctrl+Shift+O (Go to Symbol)
- Press Ctrl+Shift+O
- Type function name
- Jump to function definition

**Examples:**
- `getSystemStateFromSupabase`
- `saveSystemStateToSupabase`
- `BetXPesa`

---

## Import Dependencies Used

All changes use existing imports:
```typescript
import { supabase } from '@/lib/supabaseClient';  // ✅ Already imported
import React, { useEffect, useState } from 'react'; // ✅ Already imported
// No new imports needed!
```

---

## Build Verification

After making changes, the build should show:
```
✅ vite v5.4.21 building for production...
✅ dist/assets/index-XXXXXX.js 1,013.54 kB
✅ built in 10.88s
✅ 0 TypeScript errors
✅ 1,940 modules transformed
```

If you see errors, check:
1. Syntax errors in the pasted code
2. Missing closing braces
3. Incorrect indentation
4. Typos in function names

---

## Line-by-Line Change Details

### Change 1: Lines 16-42
**getSystemStateFromSupabase()**
- Async function
- Queries Supabase betting_system_state table
- Returns object with keys: currentWeek, currentTimeframeIdx, matchState, countdown
- Falls back to getDefaultSystemState() if error

**saveSystemStateToSupabase()**
- Async function
- Takes state object
- Upserts to betting_system_state table with id=1
- Handles errors gracefully

### Change 2: Lines 308-352
**Sync Hook - Part 1**
- Runs async function syncSystemState()
- Calls getSystemStateFromSupabase()
- Saves result to localStorage
- Sets up realtime channel subscription

**Sync Hook - Part 2**
- Listens for postgres_changes events
- Extracts new values from payload
- Dispatches 'systemStateChanged' event
- Unsubscribes on cleanup

### Change 3: Lines 369-385
**Listener Hook**
- Creates event handler function
- Extracts event.detail (the new state)
- Updates all component state variables:
  - setCurrentTimeframeIdx()
  - setLiveTimeframeIdx()
  - setMatchState()
  - setCountdown()
- Adds/removes listener on mount/unmount

### Change 4: Lines 498-514
**Week Progression**
- Creates newState object with updated values
- Calls saveSystemState(newState) - saves locally
- Calls saveSystemStateToSupabase(newState) - broadcasts to all
- Error handling with .catch()

### Change 5: Lines 1045-1100
**Previous Weeks UI**
- Conditional rendering: only shows if currentTimeframeIdx > 0
- Maps array 0 to currentTimeframeIdx-1
- For each week:
  - Gets matchupsByTimeframe for that week
  - Counts home wins, draws, away wins
  - Displays in styled card
  - Includes "View Details" button

---

## Testing Each Change

### Test Change 1 (Functions)
Build should pass without errors:
```bash
npm run build
# Should show: ✅ built in X.Xs
```

### Test Change 2 (Sync Hook)
Open DevTools Console, should see:
```
✓ Synced global system state from Supabase: { ... }
```

### Test Change 3 (Listener Hook)
When week changes (manually or auto), should see:
```
📡 Component updating from global state: { ... }
```

### Test Change 4 (Week Progression)
When week ends, Supabase should update and broadcast

### Test Change 5 (Previous Weeks UI)
After week 2 starts, scroll down to see grid of weeks 1+

---

## Common Mistakes to Avoid

❌ **Don't:** Remove the error handling try/catch
✅ **Do:** Keep error handling for resilience

❌ **Don't:** Change async function signatures
✅ **Do:** Keep getSystemStateFromSupabase() as async

❌ **Don't:** Remove event listeners/subscribers
✅ **Do:** Keep cleanup in useEffect return statement

❌ **Don't:** Forget to import supabase at top
✅ **Do:** Verify supabase import exists

❌ **Don't:** Hardcode week numbers
✅ **Do:** Use currentTimeframeIdx and timeSlots arrays

---

## Rollback Instructions

If you need to undo changes, here's what to remove:

**Undo Step 1:** Delete lines 1-115 (4 functions)
**Undo Step 2:** Delete lines 308-352 (sync hook)
**Undo Step 3:** Delete lines 369-385 (listener hook)
**Undo Step 4:** In lines 498-514, revert to simple saveSystemState()
**Undo Step 5:** Delete lines 1045-1100 (previous weeks UI)

Then rebuild:
```bash
npm run build
```

Should work without the Supabase sync.

---

This map helps you quickly locate and verify each change in the codebase.
