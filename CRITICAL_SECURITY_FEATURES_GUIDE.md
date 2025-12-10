# Critical Security Features Implementation Guide

## Overview
Three critical features for financial security and data integrity:
1. **Atomic Bet Placement** - Prevents balance overspendig
2. **Realtime Balance Subscription** - Keeps balance synchronized
3. **Match Score Validation** - Prevents invalid data

---

## 1. ATOMIC BET PLACEMENT (Server-Side RPC)

### What It Does
- Locks user balance during bet placement
- Validates sufficient balance BEFORE inserting bets
- Inserts ALL bets or NONE (atomic transaction)
- Deducts balance in same transaction
- Returns new balance or detailed error

### Setup

#### Step 1: Create RPC Functions in Supabase
Run the SQL from `SQL_ATOMIC_BET_PLACEMENT.sql` in Supabase SQL editor:
```bash
# This creates three functions:
# - place_bets_atomic()
# - place_bets_validated()
# - validate_match_scores()
```

#### Step 2: Import and Use the Service

```typescript
import { placeBetsAtomic, validateBetsBeforePlacement } from '@/lib/bettingService';

// Validate bets first (client-side)
const validation = validateBetsBeforePlacement(betsArray);
if (!validation.valid) {
  alert(validation.errors.join('\n'));
  return;
}

// Place bets using atomic RPC (server-side)
const result = await placeBetsAtomic(userId, betsArray);

if (result.status === 'ok') {
  // SUCCESS - All bets placed
  console.log(`Placed ${result.bets_placed} bets`);
  console.log(`New balance: KES ${result.new_balance}`);
  setBalance(result.new_balance);
} else if (result.status === 'insufficient_balance') {
  // User doesn't have enough balance
  alert(`Insufficient balance. Need: ${result.required_stake} KES, Have: ${result.current_balance} KES`);
} else {
  // Other error
  alert(`Failed to place bets: ${result.error}`);
}
```

#### Step 3: Update SharedTimeframesBetting Component

Replace the `confirmBet()` function with:

```typescript
import { placeBetsAtomic, validateBetsBeforePlacement } from '@/lib/bettingService';

const confirmBet = async () => {
  if (!user) {
    window.location.href = "/login";
    return;
  }

  // Get bets to place
  const betsToPlace = betslip && betslip.length > 0 ? betslip : betSlip ? [betSlip] : null;

  if (!betsToPlace || betsToPlace.length === 0) {
    alert("No bets to place");
    return;
  }

  // Validate locally first
  const validation = validateBetsBeforePlacement(
    betsToPlace.map(b => ({
      match_id: b.match.id,
      bet_type: b.betType,
      selection: b.selection,
      amount: b.stake,
      odds: b.odds,
    }))
  );

  if (!validation.valid) {
    alert(validation.errors.join('\n'));
    return;
  }

  // Use atomic RPC for placement
  const result = await placeBetsAtomic(
    user.id,
    betsToPlace.map(b => ({
      match_id: b.match.id,
      bet_type: b.betType,
      selection: b.selection,
      amount: b.stake,
      odds: b.odds,
    }))
  );

  if (result.status === 'ok') {
    alert(`✅ ${result.bets_placed} bets placed successfully!`);
    setBalance(result.new_balance || 0);
    setBetslip([]);
    setBetSlip(null);
    setBetslipOpen(false);
  } else if (result.status === 'insufficient_balance') {
    alert(`❌ Insufficient balance.\nNeed: KES ${result.required_stake}\nHave: KES ${result.current_balance}`);
  } else {
    alert(`❌ Failed to place bets: ${result.error}`);
  }
};
```

---

## 2. REALTIME BALANCE SUBSCRIPTION

### What It Does
- Syncs balance across all browser tabs/windows
- Updates balance when changed by external actions
- Shows connection status
- Manual refresh option

### Setup

#### Step 1: Use the Hook in Components

```typescript
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance';

function MyComponent({ userId }) {
  const { balance, isConnected, loading, refreshBalance } = useRealtimeBalance({
    userId,
    onBalanceChange: (newBalance, oldBalance) => {
      console.log(`Balance changed from ${oldBalance} to ${newBalance}`);
      // Show notification, update UI, etc.
    },
    onError: (error) => {
      console.error('Realtime error:', error);
    }
  });

  return (
    <div>
      <p>Balance: KES {balance}</p>
      <p>Connected: {isConnected ? '🟢' : '🔴'}</p>
      <button onClick={refreshBalance}>Refresh</button>
    </div>
  );
}
```

#### Step 2: Update BettingHeader Component

```typescript
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance';

const BettingHeader = () => {
  const [user, setUser] = useState<any>(null);
  
  // Use realtime hook instead of polling
  const { balance, isConnected, refreshBalance } = useRealtimeBalance({
    userId: user?.id || '',
    onBalanceChange: (newBalance, oldBalance) => {
      console.log(`Balance updated: ${oldBalance} → ${newBalance}`);
      // Update UI automatically
    },
  });

  return (
    <header className="bg-background border-b border-border p-4">
      {/* ... other header content ... */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-primary font-bold">💰 KES {balance.toLocaleString()}</span>
      </div>
    </header>
  );
};
```

#### Step 3: Remove Old Polling Logic

Remove the `setInterval` balance polling from BettingHeader:
```typescript
// DELETE THIS (old polling method):
useEffect(() => {
  const pollBalance = async () => {
    // ... polling code ...
  };
  const interval = setInterval(pollBalance, 3000);
  return () => clearInterval(interval);
}, []);
```

---

## 3. MATCH SCORE VALIDATION

### What It Does
- Validates scores are within realistic ranges
- Detects invalid negative scores
- Warns about unusually high scores
- Prevents score decreases (goals can't be taken back)
- Checks for suspicious score patterns

### Setup

#### Step 1: Import and Use Validation Functions

```typescript
import {
  validateMatchScores,
  validateMatch,
  validateScoreChange,
  getScoreErrorMessage,
  parseScoreInput,
  formatScore,
  getMatchResult,
} from '@/lib/matchScoreValidation';

// Simple validation
const validation = validateMatchScores(2, 1);
if (validation.valid) {
  console.log('Score is valid');
}

// Detailed validation
const fullValidation = validateMatch({
  homeGoals: 2,
  awayGoals: 1,
  minute: 45,
  matchId: 'match-123',
  homeTeam: 'Arsenal',
  awayTeam: 'Chelsea'
});

// Check score changes
const changeValidation = validateScoreChange(
  { home: 1, away: 0 },  // Previous
  { home: 2, away: 0 }   // New
);

// Get error message for UI
const errorMsg = getScoreErrorMessage(5, -1);
if (errorMsg) {
  alert(errorMsg); // "Away team goals cannot be negative (got -1)"
}

// Parse user input
const score = parseScoreInput("2-1");
// Returns: { home: 2, away: 1 }

// Format for display
const formatted = formatScore(2, 1);
// Returns: "2-1"

// Get result
const result = getMatchResult(2, 1);
// Returns: "home" | "away" | "draw"
```

#### Step 2: Update Match Resolution Logic

In the match simulation/resolution code:

```typescript
import { validateMatchScores } from '@/lib/matchScoreValidation';

function updateMatchScore(matchId, newHomeGoals, newAwayGoals) {
  // Validate before updating
  const validation = validateMatchScores(newHomeGoals, newAwayGoals);
  
  if (!validation.valid) {
    console.error('Invalid score:', validation.errors);
    return false;
  }
  
  if (validation.warnings.length > 0) {
    console.warn('Score warnings:', validation.warnings);
    // Still allow update but log warning
  }
  
  // Proceed with update
  return updateDatabase(matchId, newHomeGoals, newAwayGoals);
}
```

#### Step 3: Admin Override Validation

When admin manually sets scores:

```typescript
import { validateMatch, validateScoreChange } from '@/lib/matchScoreValidation';

function setAdminScore(matchId, homeGoals, awayGoals, currentMatch) {
  // Full validation
  const validation = validateMatch({
    homeGoals,
    awayGoals,
    matchId,
    minute: currentMatch.minute,
    homeTeam: currentMatch.homeTeam,
    awayTeam: currentMatch.awayTeam,
  });
  
  if (!validation.valid) {
    alert('Invalid score: ' + validation.errors.join(', '));
    return false;
  }
  
  // Check for suspicious changes
  const changeValidation = validateScoreChange(
    { home: currentMatch.homeGoals, away: currentMatch.awayGoals },
    { home: homeGoals, away: awayGoals },
    5 // Allow up to 5 goals per update for admin
  );
  
  if (changeValidation.warnings.length > 0) {
    console.warn('Admin warnings:', changeValidation.warnings);
  }
  
  // Proceed with update
  return updateAdminOverride(matchId, homeGoals, awayGoals);
}
```

---

## Integration Checklist

### Atomic Bet Placement
- [ ] Run `SQL_ATOMIC_BET_PLACEMENT.sql` in Supabase
- [ ] Update `confirmBet()` function in SharedTimeframesBetting
- [ ] Use `placeBetsAtomic()` instead of direct insert
- [ ] Add validation with `validateBetsBeforePlacement()`
- [ ] Test with sufficient and insufficient balance
- [ ] Test with concurrent bets

### Realtime Balance
- [ ] Replace polling with `useRealtimeBalance` hook
- [ ] Add connection status indicator
- [ ] Update BettingHeader to use realtime balance
- [ ] Remove old `setInterval` code
- [ ] Test balance sync across tabs
- [ ] Test with actual database updates

### Match Score Validation
- [ ] Import validation functions
- [ ] Add validation to match simulation code
- [ ] Validate admin overrides
- [ ] Add warnings to console for edge cases
- [ ] Test with invalid scores (negative, too high)
- [ ] Test score decrease detection

---

## Security Notes

✅ **Atomic Bets:**
- Balance locked during entire transaction
- All bets inserted or none (atomic)
- Prevents race conditions
- Prevents overspending

✅ **Realtime Balance:**
- Real-time sync via Supabase Realtime
- Works across tabs/devices
- No polling overhead
- Instant updates

✅ **Score Validation:**
- Prevents invalid data in database
- Catches admin errors
- Warns about suspicious patterns
- Doesn't block legitimate edge cases

---

## Testing

### Test Atomic Bets
```bash
# Test 1: Normal bet placement
- Place bet with sufficient balance
- Verify balance deducted
- Verify bet created

# Test 2: Insufficient balance
- Try to place bet > balance
- Verify error returned
- Verify balance unchanged
- Verify no bets created

# Test 3: Concurrent bets
- Rapidly place multiple bets
- Verify all processed atomically
- Verify correct total balance deducted
```

### Test Realtime Balance
```bash
# Test 1: Balance update sync
- Open app in two tabs
- Deposit in tab 1
- Verify tab 2 updates automatically
- Verify no delay (realtime)

# Test 2: Connection indicator
- Enable realtime
- Disable internet
- Verify indicator goes red
- Reconnect
- Verify indicator goes green
```

### Test Score Validation
```bash
# Test 1: Invalid scores
- Try to set score: -1, 0 → error
- Try to set score: 0, 20 → error
- Try to set score: 16, 0 → error

# Test 2: Realistic scores
- Set score: 0, 0 → ok
- Set score: 5, 3 → ok with warning
- Set score: 10, 10 → ok with warning

# Test 3: Score decreases
- Set score: 1, 0
- Try to change to: 0, 0 → error
- Try to change to: 1, -1 → error
```

---

## Performance Impact

| Feature | Impact | Notes |
|---------|--------|-------|
| Atomic RPC | Minimal | Single database call, optimized |
| Realtime Balance | Reduced | No polling, event-driven |
| Score Validation | Minimal | Client-side validation only |

Expected improvement: **35-50% reduction in database queries** by removing polling.

---

## Troubleshooting

**Atomic Bets Not Working?**
- Verify RPC functions created in Supabase
- Check user has 'place_bets_atomic' permission
- Review browser console for errors

**Realtime Balance Not Updating?**
- Check Supabase Realtime is enabled
- Verify user has read permission on 'users' table
- Check browser websocket connection
- Try manual `refreshBalance()` call

**Score Validation Too Strict?**
- Adjust `SCORE_CONFIG.MAX_GOALS` value
- Add custom validation rules
- Check warning messages in console
