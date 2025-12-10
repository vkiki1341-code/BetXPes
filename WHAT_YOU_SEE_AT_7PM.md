# What You'll See When Opening at 7 PM - Practical Example

## Scenario: User Opens BetXPesa Site at 7:00 PM

### Step-by-Step Flow

#### 1. **Page Loads**
```
Time: 2024-12-10 19:00:00 (7:00 PM)

System Calculation:
- Reference Epoch: 2024-12-10 12:00:00 (set when system was initialized)
- Current Time: 2024-12-10 19:00:00
- Time Difference: 7 hours = 25,200 seconds
- Match Interval: 30 minutes = 1,800 seconds
- Schedule Index: 25,200 ÷ 1,800 = 14

Meaning: This is the 14th match in the rotation
```

#### 2. **Component Initialization**
```typescript
// When SharedTimeframesBetting mounts:
const currentMatch = getCurrentMatch();
// Returns: Match #14 with home/away teams

const currentIdx = getCurrentTimeframeIdx();
// Returns: 14

setCurrentTimeframeIdx(14);
setLiveTimeframeIdx(14);
setSelectedTimeSlot(7:00 PM);
```

#### 3. **What Gets Displayed**
```
┌─────────────────────────────────────────────┐
│  🏟️ Match Week 15    (shows 14 + 1 for UX) │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Country Selection: Kenya | Uganda | Tanzania│
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Time Slots:                                 │
│ [6:30 PM] [7:00 PM] ✓ [7:30 PM] [8:00 PM]  │
│           ↑ LIVE                            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            🎮 MATCH DISPLAY                 │
│                                             │
│  AFC Leopards          vs    Gor Mahia     │
│      (Home Team)                (Away Team) │
│                                             │
│  🔴 LIVE - 23 minutes played               │
│                                             │
│  Odds:                                     │
│    1X2: 2.10 | 3.20 | 2.80                │
│    BTTS: Yes 1.90 | No 1.90               │
│                                             │
│  [Place Bet Button]                       │
└─────────────────────────────────────────────┘
```

#### 4. **At 7:30 PM (30 minutes later)**

The system automatically detects time has moved forward:

```typescript
// liveTimeframeIdx updates via polling effect:
const updateLiveIdx = () => {
  const currentIdx = getCurrentTimeframeIdx();
  // Returns: 15 (one index forward)
  setLiveTimeframeIdx(15);
};
```

**Display Updates:**
```
┌─────────────────────────────────────────────┐
│  🏟️ Match Week 16    (15 + 1 for UX)        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Time Slots:                                 │
│ [7:00 PM] [7:30 PM] ✓ [8:00 PM] [8:30 PM]  │
│           ↑ LIVE                            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            🎮 MATCH DISPLAY                 │
│                                             │
│  Kaizer Chiefs        vs    Pirates        │
│      (Home Team)               (Away Team)  │
│                                             │
│  🔴 LIVE - 0 minutes (just started)        │
│                                             │
│  Odds:  [Calculated new odds for this]    │
│    1X2: 2.10 | 3.20 | 2.80                │
│    BTTS: Yes 1.90 | No 1.90               │
│                                             │
│  [Place Bet Button]                       │
└─────────────────────────────────────────────┘
```

#### 5. **User Clicks 7:00 PM (Past Match)**

```typescript
onClick={() => {
  setSelectedTimeSlot(pastTimeSlot); // 7:00 PM
  setCurrentTimeframeIdx(14);
}}
```

**Display Shows:**
```
┌─────────────────────────────────────────────┐
│  🏟️ Match Week 15                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Time Slots:                                 │
│ [6:30 PM] [7:00 PM] ✓ [7:30 PM] [8:00 PM]  │
│           ↑ SELECTED                        │
│              (but not LIVE)                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            🎮 MATCH DISPLAY                 │
│                                             │
│  AFC Leopards          vs    Gor Mahia     │
│      (Home Team)                (Away Team) │
│                                             │
│  ✅ FINISHED - Final Score: 2-1            │
│                                             │
│  Odds Locked - Betting Closed              │
│  Show Results instead                      │
│                                             │
│  [View Results Button]                     │
└─────────────────────────────────────────────┘
```

#### 6. **User Clicks 8:00 PM (Future Match)**

```typescript
onClick={() => {
  setSelectedTimeSlot(futureTimeSlot); // 8:00 PM
  setCurrentTimeframeIdx(16);
}}
```

**Display Shows:**
```
┌─────────────────────────────────────────────┐
│  🏟️ Match Week 17                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Time Slots:                                 │
│ [7:00 PM] [7:30 PM] [8:00 PM] ✓ [8:30 PM]  │
│                       ↑ SELECTED            │
│                       (Future)              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            🎮 MATCH DISPLAY                 │
│                                             │
│  Kaizer Chiefs        vs    Pirates        │
│      (Home Team)               (Away Team)  │
│                                             │
│  ⏱️ UPCOMING - Starts in 30 minutes        │
│  Countdown: 29:45                          │
│                                             │
│  Early Odds:                               │
│    1X2: 2.10 | 3.20 | 2.80                │
│    BTTS: Yes 1.90 | No 1.90               │
│                                             │
│  [Place Bet Button]                       │
└─────────────────────────────────────────────┘
```

## Mathematical Breakdown

### Example Timeline (30-minute intervals, starting at noon):

```
Reference Epoch: 12:00 PM (0 minutes)

Time           Schedule Index    Match Number    Teams
─────────────────────────────────────────────────────
12:00 PM       0                 Match 0         Team A vs Team B
12:30 PM       1                 Match 1         Team C vs Team D
1:00 PM        2                 Match 2         Team E vs Team F
1:30 PM        3                 Match 3         Team G vs Team H
...
7:00 PM        14                Match 14        Team Y vs Team Z  ← USER OPENS HERE
7:30 PM        15                Match 15        Team AA vs Team BB
8:00 PM        16                Match 16        Team CC vs Team DD
```

## Key Points

### ✅ No Duplicates
- Each match happens at a specific time
- Same match never appears twice
- Different users at same time see same match

### ✅ Automatic Updates
- No page reload needed
- Polling updates live indicator every 5 seconds
- Smooth transition between matches

### ✅ Consistent Across All Users
- User in Nairobi at 7:00 PM sees same match as user in Dar es Salaam at 7:00 PM
- Global synchronization via shared reference epoch

### ✅ Design Preserved
- UI looks exactly the same
- All buttons work the same way
- Country selection, fixtures, history all work

## Troubleshooting

If you still see Week 1:
1. Clear browser cache: `localStorage.clear()`
2. Hard refresh: `Ctrl+Shift+Delete`
3. Close all tabs and reopen
4. Check if `global_match_schedule_initialized` is in localStorage

If matches repeat:
1. This shouldn't happen with global time system
2. Check reference epoch is set correctly
3. Verify match interval is 30 minutes (or configured value)
