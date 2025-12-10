# ✅ Match End Flow - When Bets Get Resolved & Cleared

## Timeline: When Match Ends, Bets Show Results IMMEDIATELY

```
T=0:00 - Match Simulation Ends
├─ matchState: 'playing' → 'betting'
├─ Match scores calculated: Home 2-1 Away
├─ useEffect triggers with matchState === 'betting'
└─ ✅ CRITICAL: Scores saved to Supabase matches.raw
   ├─ home_score: 2
   ├─ away_score: 1
   ├─ status: 'ft'
   └─ finished: true

T=0:01 - Realtime Event Fires
├─ Supabase Realtime sends 'postgres_changes' event
├─ MyBets.tsx receives event via subscribeToMatchUpdates()
└─ ✅ fetchBets() triggered automatically

T=0:02 - Client-Side Auto-Resolution (IMMEDIATE)
├─ getBetsFromSupabase() fetches pending bets
├─ Joins with matches.raw (has scores now! ✓)
├─ tryResolveStatusFromMatch() for each bet:
│  ├─ Checks: status='pending'? ✓
│  ├─ Checks: has scores? ✓ (2-1 in DB)
│  ├─ Checks: is finished? ✓ (ft flag in DB)
│  ├─ User selection? '1' (Home)
│  └─ Result? Home (2) > Away (1) = 'WON' ✓
│
├─ Bet status immediately set to 'won'
└─ ✅ UI UPDATES INSTANTLY:
   ├─ Badge: "WON" (green)
   ├─ Shows: "KES 2,000 Winnings"
   └─ No "Pending" badge anymore ✓

T=0:03 - User Sees Results Immediately
├─ Refreshes or page auto-updated via Realtime
├─ Opens "My Bets" page
└─ ✅ Sees:
   ├─ Match: "Arsenal vs Chelsea"
   ├─ Status: WON (green badge)
   ├─ Winnings: KES 2,000
   └─ NOT pending anymore! ✓

T=0:30 - Reconciliation Worker Runs (Separate Process)
├─ Every 30 seconds via cron/worker script
├─ Finds bets with status='pending' (or just won)
├─ For each bet:
│  ├─ Calls RPC apply_bet_result()
│  ├─ ✅ ATOMICALLY:
│  │  ├─ Updates bet status (already 'won', no change)
│  │  ├─ Updates user balance: +KES 2,000
│  │  ├─ Inserts audit log entry
│  │  └─ Inserts notification
│  │
│  └─ Notification: "Bet Won! KES 2,000 credited to account"
│
└─ User balance updated in DB

T=1:00 - User Checks Account Balance
├─ Refreshes Account page
├─ Balance updated: +KES 2,000 ✓
└─ Gets notification: "Bet Won!" ✓

---

KEY POINTS:

✅ Match ends → Bets show WON/LOST IMMEDIATELY (no waiting)
   └─ This happens instantly via client-side resolution

✅ Worker updates balance 30s later (automatic background process)
   └─ User doesn't need to wait for this

✅ Bets never stay "pending" after match ends
   └─ They show won/lost right away via Realtime + client resolution

✅ Notifications sent when worker runs (30s delay)
   └─ But user can see balance updated in real-time via Realtime subscription

---

WHAT USER SEES:

Timeline for User Betting on Home Win:
├─ T=0:00  Place bet: KES 1,000 @ odds 2.0
├─ T=0:00  Match starts (Countdown → Playing state)
├─ T=5:00  Match ends (Score: Home 2-1 Away)
├─ T=5:01  Open "My Bets" → ✅ Shows "WON" badge + "KES 2,000"
├─ T=5:30  Get notification: "Bet Won! KES 2,000 credited"
├─ T=6:00  Check Account → Balance increased
└─ Done! Bets cleared and results shown.

NO MORE PENDING BETS LINGERING! ✓
```

---

## Flow Diagram

```
WHEN MATCH ENDS:

Match Simulation Finishes
         ↓
    Scores → DB
         ↓
   Realtime Event
         ↓
  Client Refreshes
         ↓
tryResolveStatusFromMatch() ← Reads scores from DB
         ↓
   Status = 'won' or 'lost'
         ↓
   UI Updates (GREEN/RED badge)
         ↓
   User sees result IMMEDIATELY ✅
         ↓
  (30 seconds later)
         ↓
  Worker updates balance atomically
         ↓
  User gets notification
         ↓
  Account shows new balance ✅
```

---

## Confirmation: System is Correct ✅

The system is designed exactly as you want:

1. **When match ends** → Bets show results immediately (no "pending" anymore)
2. **Not when timeframe ends** → Only when the individual match ends
3. **User gets notified** → Both via UI update and via notification
4. **All is clear** → Status changes from 'pending' to 'won'/'lost' instantly

The order:
- Match ends
- Client sees results (instant)
- Worker updates balance (30s delay)
- User gets notification (30s delay)

User never sees "pending" after match ends. ✓
