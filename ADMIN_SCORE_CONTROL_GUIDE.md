# 📚 Admin Score Control - Complete Step-by-Step Guide

**Purpose:** Help admin understand exactly how to set, correct, and manage match scores  
**Audience:** Admin users  
**Status:** Ready to Use

---

## 🎯 Quick Overview

The admin has **THREE ways** to control match scores:

1. **Set Outcomes** - Before/After match (Fixtures Tab)
2. **Update Live Scores** - During match (Live Controls Tab)  
3. **Manage System State** - Control timing and match state (System State Tab)

---

## 📍 Method 1: Set Match Outcomes (Fixtures Tab)

### When to Use:
- Setting up predetermined match outcomes
- Correcting outcomes after match is final
- Setting scores in bulk before matches start

### Step-by-Step Instructions:

**Step 1: Go to Admin Panel**
```
1. Click Admin icon in navigation
2. You're now in the Admin Dashboard
```

**Step 2: Click Fixtures Tab**
```
1. In the tabs at the top, click "Fixtures"
2. You see all matches in a list format
3. Matches grouped by week
```

**Step 3: Select League (Optional)**
```
1. At the top of Fixtures tab, see country flags
2. Click the league you want to edit (Kenya 🇰🇪, Tanzania 🇹🇿, etc.)
3. Only matches from that league shown
```

**Step 4: Find Your Match**
```
1. Scroll through the list
2. Find the match you want to edit
3. Example: "Kenya vs Uganda" or "Tanzania vs Rwanda"
```

**Step 5: Click Edit Button**
```
1. Click "Edit" button next to the match
2. A large dialog opens with match details
3. Title shows "Edit Match Fixture"
```

**Step 6: Set the Final Score**
```
Edit Fixture Dialog opens with sections:

┌─────────────────────────────────┐
│ MATCH DETAILS (Read-Only)       │
│ Home: Kenya    vs    Away: Uganda│
│ Week: 1        League: KEN      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ MATCH OUTCOME (Admin Override)  │  ← YOU EDIT HERE
│                                 │
│ Final Score:                    │
│ ┌─────┐  ┌─────┐  ┌─────┐     │
│ │ KEN │  │ - │  │ UGA │     │
│ │  2  │  │   │  │  1  │     │
│ └─────┘  └─────┘  └─────┘     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ MATCH RESULT                    │
│ [Home Win] [Draw] [Away Win]    │
│ ← Click one to select           │
└─────────────────────────────────┘
```

**Step 7: Enter Home Team Goals**
```
1. Click the home team score box (shows Kenya)
2. Current value: 0
3. Clear and type: 2
4. Valid range: 0-15
5. Only whole numbers allowed
```

**Step 8: Enter Away Team Goals**
```
1. Click the away team score box (shows Uganda)
2. Current value: 0
3. Clear and type: 1
4. Valid range: 0-15
5. Only whole numbers allowed
```

**Step 9: Select Match Result (Winner)**
```
1. Click one of three buttons:
   - [Home Win] → Kenya wins (1X2 = "1")
   - [Draw] → Match tied (1X2 = "X")
   - [Away Win] → Uganda wins (1X2 = "2")

2. Example: Kenya 2-1 Uganda → Click [Home Win]
3. Button highlights when selected
```

**Step 10: View Auto-Calculated Over/Under**
```
Over/Under 2.5 Goals: AUTOMATICALLY CALCULATED

Kenya 2, Uganda 1 = Total 3 goals
Result: ✅ OVER 2.5

(If were Kenya 1, Uganda 1 = Total 2 goals)
Result: ✅ UNDER 2.5
```

**Step 11: Review 1X2 Outcome**
```
System shows what bettors will see:
- 1X2 Outcome: Home Win (1)
- Over/Under: Over 2.5
- Score: Kenya 2 - 1 Uganda
```

**Step 12: Click Save**
```
1. Scroll down to bottom of dialog
2. Click button: "Save Fixture Changes"
3. System validates the scores
```

**Step 13: Validation Check**
```
Two outcomes possible:

VALID (✅):
✅ Scores are in range (0-15)
✅ No negative numbers
✅ Whole numbers only
→ Toast shows: "Fixture Updated - Kenya 2-1 Uganda"
→ Dialog closes
→ Scores saved

INVALID (❌):
❌ Score is negative: -1, -5
❌ Score too high: 16, 100
❌ Not a whole number: 1.5, 2.25
→ Toast shows: "Invalid Score - [error message]"
→ Dialog stays open
→ Fix and try again
```

**Step 14: Verify Changes**
```
1. Look at fixtures list
2. Your match now shows: "Kenya 2 - 1 Uganda"
3. Color coding shows the outcome
4. Change is automatically broadcast to all users
```

---

## 🎮 Method 2: Update Live Scores (Live Controls Tab)

### When to Use:
- During a live match
- Want to show real-time score updates
- Need to override automatic scoring
- Make any match "live" regardless of time

### Step-by-Step Instructions:

**Step 1: Go to Admin Panel → Live Controls**
```
1. Click Admin icon
2. At top, see tabs: [Settings] [Fixtures] [Live Controls]...
3. Click "Live Controls" tab
4. Page shows all matches with live status
```

**Step 2: Select League (Optional)**
```
1. At top see country flags: 🇰🇪 🇹🇿 🇷🇼 🇺🇬
2. Click the league you want to update
3. Only that league's matches shown
```

**Step 3: Find Your Match**
```
Each match shows:
┌──────────────────────────────────┐
│ Kenya vs Uganda     2 - 1   [LIVE]│
│                                  │
│ [Make Live]  [Set Live / Edit]   │
└──────────────────────────────────┘

Matches list with:
- Team names
- Current score display
- Status: [LIVE] or [Not Live]
- Action buttons
```

**Step 4: Decide Action**

```
Case A: Match NOT live yet
→ Click "Make Live" button
→ Match becomes live (overrides time)

Case B: Edit existing live scores
→ Click "Edit Live" button
→ Inline form appears with current scores

Case C: Set initial live scores
→ Click "Set Live" button
→ Inline form appears (starts with 0-0)
```

**Step 5: Click Edit/Set Live Button**
```
After clicking, inline form appears:

┌──────────────────────────────────┐
│ Kenya vs Uganda                  │
│                                  │
│ Score Update Form:               │
│ ┌──────┐ ┌──────┐               │
│ │  2   │ │  1   │              │
│ └──────┘ └──────┘               │
│                                  │
│ Status: [First Half ▼]           │
│         - First Half             │
│         - Half Time              │
│         - Second Half            │
│         - Finished               │
│                                  │
│ [Save] [Cancel]                  │
└──────────────────────────────────┘
```

**Step 6: Update Home Team Score**
```
1. Click the first number box (home team)
2. Current shows: 2 (or 0 if new)
3. You can:
   - Clear and type new number: 3
   - Use arrow keys: up/down
   - Delete and retype
4. Valid: 0-15
```

**Step 7: Update Away Team Score**
```
1. Click the second number box (away team)
2. Current shows: 1 (or 0 if new)
3. You can:
   - Clear and type new number: 2
   - Use arrow keys: up/down
   - Delete and retype
4. Valid: 0-15
```

**Step 8: Update Match Status**
```
1. Click the dropdown showing status
2. Current: "First Half"
3. Options:
   - First Half (0-45 minutes)
   - Half Time (45 minutes)
   - Second Half (45-90 minutes)
   - Finished (90 minutes, final)
4. Click your choice
5. Shows selected in dropdown
```

**Step 9: Examples**

```
EXAMPLE 1: Match starts
Score: 0 - 0
Status: First Half
Result: Match begun, no goals yet

EXAMPLE 2: Goal in first half
Old: Kenya 0-0 Uganda (First Half)
New: Kenya 1-0 Uganda (First Half)
Result: Kenya scores, same half

EXAMPLE 3: Half time
Old: Kenya 1-0 Uganda (First Half)
New: Kenya 1-0 Uganda (Half Time)
Result: First half ends, teams rest

EXAMPLE 4: Second half goal
Old: Kenya 1-0 Uganda (Half Time)
New: Kenya 2-0 Uganda (Second Half)
Result: Kenya scores again after restart

EXAMPLE 5: Uganda scores back
Old: Kenya 2-0 Uganda (Second Half)
New: Kenya 2-1 Uganda (Second Half)
Result: Uganda gets one back

EXAMPLE 6: Match finished
Old: Kenya 2-1 Uganda (Second Half)
New: Kenya 2-1 Uganda (Finished)
Result: Match complete, final score set
```

**Step 10: Click Save**
```
1. After updating scores and status
2. Click [Save] button
3. Form validates scores
```

**Step 11: Validation Check**
```
VALID (✅):
✅ Score: Kenya 2, Uganda 1
✅ Both are whole numbers (no decimals)
✅ Both are positive (no negatives)
✅ Both within range (0-15)
→ Toast: "✅ Live Score Updated"
→ Form closes
→ Scores broadcast to ALL USERS

INVALID (❌):
❌ Score: Kenya -1 (negative)
❌ Score: Kenya 1.5 (decimal)
❌ Score: Kenya 20 (too high)
→ Toast: "❌ Invalid Score - [reason]"
→ Form stays open
→ Fix and retry
```

**Step 12: See Real-Time Updates**
```
After saving:
1. Your form closes
2. Match shows new scores: Kenya 2 - 1 Uganda
3. Status shows: Finished (if you set it)
4. Color highlights live status: [GREEN]
5. All users see same score instantly
6. Bets automatically recalculated
7. User notifications sent (optional)
```

**Step 13: Correct a Wrong Score**
```
Scenario: Set wrong score by mistake
Old: Kenya 2 - 1 Uganda (CORRECT)
Mistake: You input Kenya 5 - 1 Uganda (WRONG)

To Fix:
1. Match shows: Kenya 5 - 1 Uganda [LIVE]
2. Click "Edit Live" button
3. Form appears with current scores: 5 - 1
4. Click first box, clear, type: 2
5. Click Save
6. Toast: "✅ Live Score Updated"
7. Now shows: Kenya 2 - 1 Uganda (CORRECT)
8. All users see corrected score
9. Bets automatically re-evaluate
```

---

## ⏰ Method 3: System State Control (System State Tab)

### When to Use:
- Control match countdown timers
- Advance match state
- Manage global system state
- Control betting windows

### Available Controls:

```
System State Management:

1. Match State Display
   Shows current state seen by all users
   Example: "active" or "playing" or "countdown"

2. Countdown Timer
   Current value: 300 seconds
   Your control: [⏱️ Advance Countdown] button
   Effect: Reduces countdown by 1 second
   Use case: Speed up countdown if needed

3. Match Timer
   Displays: 0/90 (elapsed / total minutes)
   Tracks: Current match progress
   Info only: Read what users see

4. Betting Timer
   Displays: 45 seconds remaining
   Control: Various state buttons
   Use case: Manage betting window

5. Control Buttons
   [▶️ Start Match] → Changes state to "playing"
   [🎲 Betting Window] → Opens betting for new bets
   [⏱️ Advance Countdown] → Reduces countdown timer
```

---

## 🔍 Validation Rules Reference

### ✅ VALID Scores
```
✅ 0-0  (scoreless draw)
✅ 1-0  (one team leading)
✅ 1-1  (equal)
✅ 3-2  (high-scoring)
✅ 15-15 (maximum allowed)
✅ 0-15  (maximum spread)
✅ 10-7  (any combination)
```

### ❌ INVALID Scores (REJECTED)
```
❌ -1-0  (negative home score)
❌ 0--1  (negative away score)
❌ 1.5-0  (decimal home score)
❌ 0-2.5  (decimal away score)
❌ 16-0  (exceeds maximum)
❌ 0-20  (exceeds maximum)
❌ abc-def  (not numbers)
```

### ⚠️ WARNING Scores (ALLOWED but Flagged)
```
⚠️ 12-10  (unusual high score)
⚠️ 15-13  (extreme score)
→ System shows warning but allows it
→ You can proceed or adjust
```

---

## 📋 Common Tasks

### Task 1: Set Pre-Match Outcomes
```
GOAL: Decide match will be Kenya 2-1 Uganda before it starts

1. Admin Panel → Fixtures Tab
2. Find match: Kenya vs Uganda
3. Click Edit
4. Set: Home 2, Away 1
5. Select: Home Win
6. Click Save
7. Match now shows: Kenya 2-1 Uganda

Result: ✅ Outcome predetermined
Status: Ready for match to play
```

### Task 2: Fix Wrong Score During Match
```
GOAL: Correct score entered wrong during live match

1. Score shows: Kenya 5-3 Uganda (WRONG)
2. Should be: Kenya 2-1 Uganda (CORRECT)
3. Admin Panel → Live Controls Tab
4. Find match: Kenya vs Uganda
5. Click Edit Live
6. Change: 5 → 2 (home)
7. Change: 3 → 1 (away)
8. Click Save
9. Match shows: Kenya 2-1 Uganda

Result: ✅ Score corrected
Status: All users see correct score
```

### Task 3: Update Score During Live Match
```
GOAL: Show goal being scored in real-time

Scenario: Match Kenya 1-0 Uganda, Uganda scores

1. Admin Panel → Live Controls Tab
2. Find: Kenya 1-0 Uganda [LIVE]
3. Click Edit Live
4. Change away score: 0 → 1
5. Status: Keep as "Second Half"
6. Click Save
7. Now shows: Kenya 1-1 Uganda [LIVE]

Result: ✅ Live update broadcast
Status: All users notified of goal
```

### Task 4: Mark Match as Finished
```
GOAL: Mark final result and close betting

Final scores are: Kenya 2 - 1 Uganda

1. Admin Panel → Live Controls Tab
2. Find match: Kenya 2 - 1 Uganda [LIVE]
3. Click Edit Live
4. Status: Change to "Finished"
5. Scores: Keep as Kenya 2 - 1 Uganda
6. Click Save
7. Match shows: Kenya 2-1 Uganda [FINISHED]

Result: ✅ Match closed
Status: Bets resolved based on this score
```

### Task 5: Correct Score After Match Completed
```
GOAL: Fix final score if it was wrong

Problem: Final shows Kenya 2-1 Uganda but should be 2-0

1. Admin Panel → Fixtures Tab
2. Find: Kenya (showing 2-1 Uganda)
3. Click Edit
4. Change away score: 1 → 0
5. Update winner if needed: Home Win (stays same)
6. Click Save
7. Now shows: Kenya 2-0 Uganda

Result: ✅ Final score corrected
Status: Bets automatically re-evaluated
```

---

## 🎓 Key Concepts

### Match Score vs Match Result

```
SCORE:
- Actual goals: 2-1
- Shows what users see: Kenya 2 - 1 Uganda
- Used for: Over/Under, goal-based bets

RESULT:
- Winner: Home Win (1), Draw (X), Away Win (2)
- Shows what 1X2 bettors see
- Used for: 1X2 outcome resolution
- Can be set independently

Example:
Score: Kenya 2 - 1 Uganda
Result: Home Win (obvious)
→ Admin can also force result even if score different
```

### Real-Time Broadcasting

```
HOW UPDATES REACH USERS:

1. Admin updates score in Live Controls
2. Admin clicks Save
3. Score validated ✅
4. Saved to system
5. Broadcast to Supabase Realtime
6. All connected users receive update (< 100ms)
7. Users see new score instantly
8. Bets automatically recalculate
9. Notifications sent (if configured)
10. Audit log recorded
```

### Audit Trail

```
EVERY CHANGE IS LOGGED:

Who: Admin User ID
What: Score update or outcome set
When: Exact timestamp
Match: Which match ID
Details: Old & new scores
Status: Success or failed

Example log entry:
{
  admin_id: "user-123",
  action: "live_score_update",
  match_id: "match-456",
  old_scores: { home: 1, away: 0 },
  new_scores: { home: 2, away: 0 },
  timestamp: "2025-12-08 14:30:15"
}

View logs: Admin → System Logs Tab
```

---

## 🚨 Error Messages Explained

### "Home team goals cannot be negative"
```
You entered: -1
Should be: 0 or higher
Fix: Delete and enter valid number (0-15)
```

### "Away team goals cannot exceed 15"
```
You entered: 16 or higher
Should be: 15 or lower
Fix: Change to valid range (0-15)
```

### "Scores must be whole numbers"
```
You entered: 1.5, 2.25, etc.
Should be: 1, 2, 3, etc.
Fix: No decimals - only whole numbers
```

### "Scores must be numeric values"
```
You entered: "abc", "xyz", etc.
Should be: Numbers only
Fix: Clear and enter digits (0-15)
```

### "Invalid Score - [error message]"
```
General validation failed
Check: Message for specific issue
Fix: Correct according to message
```

---

## ✨ Pro Tips

### Tip 1: Bulk Set Outcomes
```
To set multiple match outcomes:
1. Go to Fixtures Tab
2. Edit first match → Set scores → Save
3. Edit second match → Set scores → Save
4. Continue for all matches
5. All changes logged with timestamps
```

### Tip 2: Undo Mistake Quickly
```
If you set wrong score:
1. Go back to Live Controls Tab
2. Find the match
3. Click Edit Live
4. Correct the scores
5. Click Save
6. Users see corrected score immediately
→ Automatic recalculation of bets
```

### Tip 3: Monitor Real-Time Updates
```
To see live matches:
1. Go to Live Controls Tab
2. Matches with [LIVE] status are active
3. Update scores as goals happen
4. Mark "Finished" when complete
5. Check audit trail to verify all actions
```

### Tip 4: Check Audit Trail
```
To verify all actions:
1. Admin Panel → System Logs Tab
2. Search for "match_outcome_set" or "live_score_update"
3. See all changes with timestamps
4. Verify who made what change when
5. Useful for dispute resolution
```

---

## ✅ Verification Checklist

Before confirming match outcome, verify:

- [ ] Score is 0-15 for each team
- [ ] Scores are whole numbers (no decimals)
- [ ] No negative scores
- [ ] Result/winner is set (Home/Draw/Away)
- [ ] Over/Under is calculated correctly
- [ ] Audit log shows your action
- [ ] All users see same score
- [ ] Bets are recalculated
- [ ] No error messages displayed

---

## 🎯 Summary

You now have **COMPLETE CONTROL** over:

✅ Setting match outcomes before matches start  
✅ Updating scores during live matches  
✅ Correcting scores if mistakes happen  
✅ Controlling match status/timing  
✅ Managing system state  
✅ Viewing full audit trail  
✅ Verifying all changes  

**Everything is validated, logged, and broadcast to all users in real-time.**

---

**Version:** 1.0  
**Last Updated:** December 8, 2025  
**Status:** Ready for Admin Use
