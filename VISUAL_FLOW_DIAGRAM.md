# Visual Flow Diagram: How It Works Now

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         APP.TSX                             │
│                                                             │
│  setupGlobalTimeSystem()                                   │
│  switchToGlobalTimeSystem()                                │
│  ↓                                                         │
│  Sets: localStorage['global_match_schedule_initialized']   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│           SHAREDBETTINGFRAMESBETTING.TSX                    │
│                                                             │
│  Detects: isGlobalTimeActive = true                       │
│  ↓                                                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ On Mount:                                            │ │
│  │ ├─ currentIdx = getCurrentTimeframeIdx()            │ │
│  │ ├─ timeSlots = getTimeSlots()                       │ │
│  │ ├─ selectedTimeSlot = currentMatch.kickoffTime     │ │
│  │ └─ loadGlobalTimeMatches()                          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Every 5 Seconds:                                     │ │
│  │ ├─ currentIdx = getCurrentTimeframeIdx()            │ │
│  │ └─ setLiveTimeframeIdx(currentIdx)                  │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────────────────┐
│              GLOBAL TIME MATCH SYSTEM                       │
│                                                             │
│  getGlobalSchedule()  ← ReferenceEpoch = 2024-12-10 12:00 │
│                         MatchInterval = 30 minutes         │
│                         Timezone = UTC                     │
│                                                             │
│  getCurrentTimeframeIdx()                                  │
│  ├─ now = Date.now()                                      │
│  ├─ index = (now - refEpoch) / (30 * 60000)             │
│  └─ return Math.floor(index)                              │
│                                                             │
│  getMatchAtTime(time)                                      │
│  ├─ Calculate schedule index for this time                │
│  ├─ Get match from getAllAvailableMatches()              │
│  ├─ Match = list[index % list.length]                    │
│  └─ Return match with scheduled time                      │
│                                                             │
│  calculateScheduledTime(index)                             │
│  └─ return refEpoch + (index * 30 * 60000)              │
└──────────────┬───────────────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────────────────┐
│                    RENDERING                               │
│                                                             │
│  matchupsByTimeframe = {                                   │
│    "2024-12-10T19:00:00Z": [{                              │
│      id: "ke-global-...",                                 │
│      homeTeam: { name: "AFC Leopards", ... },            │
│      awayTeam: { name: "Gor Mahia", ... },               │
│      kickoffTime: <Date object>,                          │
│      overOdds: "1.50",                                   │
│      underOdds: "2.50"                                   │
│    }],                                                    │
│    "2024-12-10T19:30:00Z": [...],                        │
│    ...                                                    │
│  }                                                        │
│                                                             │
│  selectedTimeSlot = current match time                    │
│  ↓                                                         │
│  Render Match Card with correct teams ✅                  │
└─────────────────────────────────────────────────────────────┘
```

## Time-Based Calculation

```
┌─────────────────────────────────────────────────────────────┐
│                  REFERENCE EPOCH SYSTEM                    │
│                                                             │
│  Timeline:                                                 │
│  ──────────────────────────────────────────────────────────│
│  12:00 PM  12:30 PM  1:00 PM  1:30 PM  ...  7:00 PM  ... │
│    ↑                                         ↑             │
│    │                                         │             │
│  Index 0                                   Index 14       │
│  (RefEpoch)                               (User Opens)    │
│                                                             │
│  Formula:                                                  │
│  ───────────────────────────────────────────────────────── │
│  Current Index = (Now - RefEpoch) / MatchInterval        │
│  Current Index = (7:00 PM - 12:00 PM) / 30 min          │
│  Current Index = 300 min / 30 min                        │
│  Current Index = 10... wait let me recalculate            │
│                                                             │
│  Actual: (7 hours = 25200 sec) / (30 min = 1800 sec)    │
│  = 14 matches since noon                                  │
│                                                             │
│  So at 7:00 PM, user sees: Match #14 ✅                  │
└─────────────────────────────────────────────────────────────┘
```

## Component State Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│              COMPONENT MOUNTING                             │
│                                                             │
│  useState                          State Value             │
│  ────────────────────────────────────────────────          │
│  [currentTimeframeIdx, ...]    →   14 (not 0!)           │
│  [liveTimeframeIdx, ...]       →   14                     │
│  [selectedTimeSlot, ...]       →   7:00 PM Date object   │
│  [timeSlots, ...]              →   [6:00, 6:30, 7:00, ...] │
│  [matchupsByTimeframe, ...]    →   { "7:00PM": [...] }   │
│                                                             │
│  ↓                                                         │
│                                                             │
│  RENDER: Display Match #14 teams for 7:00 PM ✅          │
│                                                             │
│  ↓                                                         │
│                                                             │
│  Polling Effect (every 5 seconds):                        │
│  ──────────────────────────────────────────────────────── │
│  Is it still 7:00 PM?                                     │
│  └─ No, it's 7:01 PM now?                                 │
│     └─ Still index 14, stay same                          │
│  Is it still 7:00 PM?                                     │
│  └─ No, it's 7:30 PM now!                                 │
│     └─ Index changes to 15                                │
│     └─ Re-render: NEW Match #15 teams ✅                 │
│     └─ Move 🔴 LIVE badge to 7:30 PM                     │
└─────────────────────────────────────────────────────────────┘
```

## User Interactions

```
User Opens Page at 7:00 PM
    ↓
System Calculates Index = 14
    ↓
Displays: Match #14 Teams
    ├─ timeSlot: 7:00 PM
    ├─ homeTeam: AFC Leopards
    ├─ awayTeam: Gor Mahia
    ├─ matchState: LIVE (counting down)
    └─ oddsPanel: 1X2, BTTS, etc.
    ↓
User clicks "Place Bet"
    ├─ Match: AFC vs Mahia
    ├─ Bet Type: 1X2
    ├─ Selection: Home
    └─ Amount: 500 KES
    ↓
Bet Submitted ✅
    │
    ├─ Supabase updates bets table
    ├─ User balance updates
    └─ Notification shown
    ↓
User waits 20 minutes (time = 7:20 PM)
    ├─ Still Match #14 (35 min remaining)
    ├─ Match timer shows: 20 minutes played
    └─ Betting open ✅
    ↓
User waits 30 more minutes (time = 7:50 PM)
    ├─ Match #14 ENDED
    ├─ Show results
    ├─ Calculate payouts
    └─ Update balance
    ↓
NEW Match #15 for 8:30 PM starts
    ├─ Pre-countdown state
    ├─ Countdown: 10 seconds
    ├─ Different teams
    └─ New betting opportunities
```

## Data Flow at Each Moment

```
7:00 PM
  └─ Index: 14
  └─ Match: AFC vs Mahia
  └─ Display: LIVE - 0 minutes

7:15 PM
  └─ Index: 14 (same 30-min slot)
  └─ Match: AFC vs Mahia (same)
  └─ Display: LIVE - 15 minutes

7:30 PM
  └─ Index: 15 (NEW 30-min slot)
  └─ Match: Different teams
  └─ Display: LIVE - 0 minutes (new match)
  └─ Previous match showed results

8:00 PM
  └─ Index: 16 (NEW 30-min slot)
  └─ Match: Different teams again
  └─ Display: LIVE - 0 minutes (another new match)
```

## Global Synchronization

```
User in Nairobi       User in Dar es Salaam      User in Mogadishu
├─ 7:00 PM            ├─ 7:00 PM                 ├─ 7:00 PM
├─ Index: 14          ├─ Index: 14               ├─ Index: 14
├─ Same RefEpoch ✓    ├─ Same RefEpoch ✓        ├─ Same RefEpoch ✓
└─ AFC vs Mahia       └─ AFC vs Mahia            └─ AFC vs Mahia
   ALL SEE SAME MATCH AT SAME TIME ✅
```

## No Duplicate Matches

```
7:00 PM - First Load
  └─ Index: 14
  └─ Match: AFC vs Mahia
  └─ Bet: 500 KES on Home

User Reloads Page (still 7:00 PM)
  └─ Index: 14 (recalculated, same!)
  └─ Match: AFC vs Mahia (same!)
  └─ No new match shown ✅

User Reloads Page (NOW 7:30 PM)
  └─ Index: 15 (recalculated, advanced!)
  └─ Match: Different teams (new!)
  └─ Previous match closed ✅
```

## Design Preservation

```
┌─────────────────────────────────────────┐
│  BEFORE              AFTER              │
├─────────────────────────────────────────┤
│  Week 1              Match #14          │
│  └─ Wrong                                │
│                                          │
│  Static teams       Current teams       │
│  └─ Always same     └─ Change every 30min│
│                                          │
│  No updates        Auto-updates         │
│  └─ Manual          └─ Every 5 sec polling│
│                                          │
│  UI: Identical     UI: Identical       │
│  └─ Same design    └─ Same design      │
│  └─ Same buttons   └─ Same buttons     │
│  └─ Same colors    └─ Same colors      │
│  └─ Same layout    └─ Same layout      │
│                                          │
│  FUNCTION: Broken  FUNCTION: Perfect   │
│  └─ Broken UX      └─ Smooth UX        │
└─────────────────────────────────────────┘
```

---

This is how your system now works! The component elegantly integrates with the global time system while preserving every aspect of its beautiful design.
