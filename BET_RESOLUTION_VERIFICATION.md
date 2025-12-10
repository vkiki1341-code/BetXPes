# Bet Resolution System - Complete Verification

**Status**: ✅ **System Complete & Ready for Testing**

This document confirms that the entire betting resolution system is in place. When matches end, user bets are automatically resolved and results are displayed.

---

## 🎯 How It Works (End-to-End)

### 1. **User Places a Bet**
```
User selects match + team + stake → confirmBet() → saveBetToSupabase()
  └─ Bet inserted with status='pending'
  └─ Match data stored in matches.raw JSONB
```

### 2. **Match Completes**
```
Match status changes to 'ft' (full-time) or finished flag set
  └─ Match payload updated with final scores (home_score, away_score)
  └─ DB trigger fires (when live) to notify via pg_notify
```

### 3. **Bets Get Resolved** (Two Mechanisms)

#### **Mechanism A: Client-Side (Immediate)**
- When `MyBets.tsx` loads or Realtime updates trigger
- `getBetsFromSupabase()` calls `tryResolveStatusFromMatch()`
- Compares bet selection ('1', '2', 'X') vs match scores
- Sets bet status to `'won'` or `'lost'` or keeps `'pending'` if scores not ready
- **No balance update** (this is just status display)

```typescript
// File: src/lib/supabaseBets.ts, lines 342-385
const tryResolveStatusFromMatch = (currentStatus, rawMatch, betType, selection) => {
  if (currentStatus !== 'pending') return currentStatus;
  
  const homeScore = rawMatch.home_score ?? rawMatch.homeScore ?? ...
  const awayScore = rawMatch.away_score ?? rawMatch.awayScore ?? ...
  const finishedFlag = rawMatch.status?.includes('ft') || rawMatch.finished === true
  
  if (finishedFlag && scores are present) {
    return compareSelection(selection, homeScore, awayScore) // 'won' or 'lost'
  }
  return currentStatus // still 'pending'
}
```

#### **Mechanism B: Server-Side (Atomic Balance Update)**
- `scripts/reconcile.js` runs every 30 seconds
- Polls for all bets with status='pending'
- For each pending bet, calls RPC `apply_bet_result(bet_id, result, payout)`
- **Atomically updates**:
  - Bet status (pending → won/lost/void)
  - User balance (adds winnings or does nothing for losses)
  - Audit log entry (for tracking)
- Creates notification for user

```typescript
// File: scripts/reconcile.js, lines ~100-140
for each pending bet:
  1. Extract match scores from bet.matches.raw
  2. Call resolveBetOutcome() → returns {result: 'won'|'lost', payout}
  3. Call supabase.rpc('apply_bet_result', {
       bet_id: bet.id,
       result: 'won',
       payout: potential_win
     })
  4. Insert notification to user
```

---

## 🔍 Verification Checklist

### ✅ Client-Side (Already Live)

| Component | Status | File | Details |
|-----------|--------|------|---------|
| **Bet Placement** | ✅ Done | `src/pages/SharedTimeframesBetting.tsx` | Places bets, stores in DB |
| **Bet Fetching** | ✅ Done | `src/lib/supabaseBets.ts` | `getBetsFromSupabase()` fetches + transforms |
| **Status Resolution** | ✅ Done | `src/lib/supabaseBets.ts:342-385` | `tryResolveStatusFromMatch()` calculates won/lost |
| **Results Display** | ✅ Done | `src/pages/MyBets.tsx:320-375` | Shows status badge, winnings/loss amount |
| **Realtime Sync** | ✅ Done | `src/pages/MyBets.tsx:40-50` | `subscribeToMatchUpdates()` auto-refreshes |
| **Match Scores to DB** | ✅ **FIXED** | `src/pages/SharedTimeframesBetting.tsx:450-490` | Now saves match scores back to Supabase when match ends |
| **Team Logos** | ✅ Done | `src/data/leagues.ts` | 13 teams now load from `/public/missing/` |
| **Bet Cancellation** | ✅ Done | `src/lib/supabaseBets.ts:420-480` | `cancelBet()` refunds + marks cancelled |

### ⚠️ Server-Side (Setup Required)

| Component | Status | File | Action Needed |
|-----------|--------|------|---|
| **Audit Table** | ⚠️ Pending | `scripts/db_apply_bet_result.sql` | Run SQL in Supabase editor |
| **Atomic RPC** | ⚠️ Pending | `scripts/db_apply_bet_result.sql` | Creates `apply_bet_result()` function |
| **Reconciliation Worker** | ⚠️ Pending | `scripts/reconcile.js` | Run: `npm run reconcile` |
| **Match Triggers** | ⚠️ Pending | `scripts/db_match_triggers.sql` | Run SQL in Supabase editor (optional) |

---

## 📊 What Happens When a Match Ends (Timeline)

### **T=0:00** - Match Finishes (Score = 2-1)
```
Match simulation completes in SharedTimeframesBetting.tsx
matchState transitions from 'playing' → 'betting'
Match scores calculated: home_score=2, away_score=1
✅ NEW: Scores saved back to Supabase in matches.raw:
   - home_score: 2
   - away_score: 1
   - status: 'ft'
   - finished: true
Trigger fires: pg_notify('match_finished', {...})
```

### **T=0:05** - User Opens "My Bets"
```
Client calls getBetsFromSupabase()
  ├─ Fetches user's pending bets
  ├─ Joins with matches.raw to get scores ✓ NOW HAS SCORES
  ├─ For each bet:
  │  └─ tryResolveStatusFromMatch() checks:
  │     ├─ Is status='pending'? ✓
  │     ├─ Has scores? ✓ (2-1) ← FIXED
  │     ├─ Is finished? ✓ (ft flag) ← FIXED
  │     └─ What did user pick? (e.g., '1'='Home')
  │
  ├─ If user picked '1' (Home) and Home won (2>1):
  │  └─ Status = 'won' ✓
  │  └─ Display: "WON" badge + green + "KES 10,000 Winnings"
  │
  └─ If user picked '2' (Away) and Away lost (1<2):
     └─ Status = 'lost'
     └─ Display: "LOST" badge + red + "-KES 5,000"
```

### **T=0:35** - Reconciliation Worker Runs (30s poll)
```
Cron/SystemD triggers: npm run reconcile

Worker queries: SELECT * FROM bets WHERE status='pending'

For each pending bet:
  1. Get match scores from matches.raw ✓ NOW AVAILABLE
  2. Determine outcome (won/lost/void)
  3. Calculate payout (if won: stake × odds)
  4. Call RPC apply_bet_result():
     - Lock bet row
     - Lock user balance row
     - UPDATE bets SET status='won', updated_at=NOW()
     - UPDATE users SET balance = balance + payout
     - INSERT INTO bet_audit (...)
     - Commit atomically
  5. Insert notification row

Result:
  ✓ Bet marked as resolved in DB
  ✓ User balance updated with winnings
  ✓ Audit trail created
  ✓ User gets notification
```

### **T=1:00** - User Checks Balance
```
Account page shows updated balance
  └─ If won bets: balance increased ✓
  └─ Shows notification: "Your bet won! +KES 10,000" ✓
```

---

## 🚀 How to Complete Setup

### **Step 1: Run Database SQL** (2 minutes)

Go to **Supabase Dashboard → SQL Editor** and run these two scripts:

#### Script A: Atomic RPC + Audit Table
```sql
-- Copy-paste entire contents of:
-- scripts/db_apply_bet_result.sql
```

**What it does:**
- Creates `bet_audit` table (tracks all balance changes)
- Creates `apply_bet_result()` RPC function (atomically resolves bets + updates balance)

#### Script B: Match Finish Triggers (Optional, for event-driven)
```sql
-- Copy-paste entire contents of:
-- scripts/db_match_triggers.sql
```

**What it does:**
- Creates `notify_match_finished()` trigger
- Sends `pg_notify` when a match finishes
- (Worker currently polls instead; this is for future enhancement)

**Expected Output:**
```
Query executed successfully: 0 rows
```

### **Step 2: Start the Reconciliation Worker** (1 minute)

In your terminal (Windows PowerShell), run:

```powershell
# Set environment variables
$env:SUPABASE_URL = "YOUR_SUPABASE_URL"
$env:SUPABASE_SERVICE_ROLE_KEY = "YOUR_SERVICE_ROLE_KEY"

# Run reconciliation worker
npm run reconcile

# Output should show:
# ✓ Starting reconciliation pass
# ✓ Connected to Supabase
# ✓ Fetching pending bets...
# ✓ No pending bets found (or resolves bets)
# ✓ Reconciliation finished
```

**To Keep Running Continuously (Recommended):**

Use **PM2** (process manager):
```powershell
npm install -g pm2
pm2 start "npm run reconcile" --name betting-worker --restart-delay 5000
pm2 save
pm2 startup
```

Or **Docker** (if available):
```powershell
docker run -d `
  -e SUPABASE_URL="..." `
  -e SUPABASE_SERVICE_ROLE_KEY="..." `
  node:20 `
  npm run reconcile
```

---

## ✅ Test the Complete Flow

### **Test Case 1: Bet Wins**
1. Place a bet on Home win for KES 1,000 at odds 2.0
2. Manually update match scores to Home=2, Away=1 in Supabase
3. Set match status to 'ft'
4. Refresh "My Bets"
   - ✓ Should show "WON" badge
   - ✓ Should show "KES 2,000 Winnings"
5. Wait 30s for worker to run
6. Check Account balance
   - ✓ Should show +KES 2,000 (bet stake + winnings)
   - ✓ Notification: "Your bet won!"

### **Test Case 2: Bet Loses**
1. Place a bet on Away win for KES 1,000 at odds 2.0
2. Manually update match scores to Home=2, Away=1 in Supabase
3. Set match status to 'ft'
4. Refresh "My Bets"
   - ✓ Should show "LOST" badge
   - ✓ Should show "-KES 1,000"
5. Check Account balance
   - ✓ Balance unchanged (loss is not refunded)

### **Test Case 3: Bet Cancelled**
1. Place a bet on Home win for KES 1,000
2. Click "Cancel & Refund" button
   - ✓ Should show "CANCELLED" badge
   - ✓ Button confirms refund amount
3. Check Account balance
   - ✓ Should show +KES 1,000 refunded
4. Notification: "Bet cancelled, KES 1,000 refunded"

---

## 🔧 Troubleshooting

### **Bets Show "Pending" After Match Ends**

**Cause**: Match scores not in database yet.

**Fix**:
1. Verify match has `home_score` and `away_score` in `matches.raw`
2. Verify match status includes 'ft' or `finished=true`
3. Manually run reconciliation:
   ```powershell
   npm run reconcile
   ```
   Check console output for errors

### **Worker Crashes Immediately**

**Cause**: Missing environment variables or database connection error.

**Fix**:
```powershell
# Verify env vars are set
echo $env:SUPABASE_URL
echo $env:SUPABASE_SERVICE_ROLE_KEY

# Test connection:
$env:SUPABASE_URL = "..."
$env:SUPABASE_SERVICE_ROLE_KEY = "..."
npm run reconcile
```

### **Balance Not Updated After Winning Bet**

**Cause**: Worker hasn't run yet (30s delay).

**Fix**:
1. Wait 30 seconds
2. Manually trigger: `npm run reconcile`
3. Refresh page to see updated balance

---

## 📋 Implementation Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Place bets | ✅ Live | Instantly saved to DB |
| Display pending bets | ✅ Live | Shows status based on match data |
| Auto-resolve on client | ✅ Live | `tryResolveStatusFromMatch()` |
| Realtime updates | ✅ Live | Supabase Realtime subscriptions |
| Cancel bets with refund | ✅ Live | `cancelBet()` function |
| Server-side resolution | ⚠️ **Ready** | Requires SQL + worker start |
| Atomic balance updates | ⚠️ **Ready** | Via `apply_bet_result()` RPC |
| Audit logging | ⚠️ **Ready** | Via `bet_audit` table |
| Team logos from missing folder | ✅ Live | 13 teams now loading |

---

## 🎓 Understanding the Two-Layer System

**Why two mechanisms?**

1. **Client-side resolution** (instant, UI only)
   - Shows user if they won/lost ASAP
   - No balance change (just status display)
   - Fast, no network delay

2. **Server-side resolution** (delayed, atomic)
   - Actually updates balance in database
   - Creates audit trail for compliance
   - Prevents double-resolution (atomic locks)
   - Essential for financial operations

**Result**: User sees instant feedback (Client), but money updates safely through server (Worker).

---

## 📞 Next Steps

1. **✅ Client-side is live** – No action needed
2. **⚠️ Run SQL scripts** – Copy-paste in Supabase SQL Editor
3. **⚠️ Start worker** – Run `npm run reconcile` or PM2
4. **✅ Test the flow** – Follow Test Cases above

Once Step 2-3 are complete, the system is **100% functional**.

