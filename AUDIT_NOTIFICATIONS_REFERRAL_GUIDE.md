# Comprehensive Audit Logging, Push Notifications & Referral Tracking Setup

## Overview
This guide explains how to integrate the three major features into your betting application.

---

## 1. AUDIT LOGGING (Compliance Tracking)

### What was Created
- **SQL Table**: `user_actions` - Logs all user activities
- **Audit Library**: `src/lib/auditLog.ts` - Functions to log and retrieve actions
- **Action History Component**: `src/components/ActionHistory.tsx` - Display audit logs in UI

### Setup Steps

#### Step 1: Create the Database Table
Run this SQL in your Supabase SQL editor:
```bash
-- Copy contents from: SQL_AUDIT_LOGGING_SETUP.sql
```

#### Step 2: Integrate Audit Logging into Key Features

**In Login Page** (`src/pages/Login.tsx`):
```typescript
import { logAuditAction } from '@/lib/auditLog';

// After successful login
await logAuditAction(user.id, {
  action: 'login',
  details: { email: user.email },
  status: 'success'
});
```

**In Bet Placement** (`src/pages/SharedTimeframesBetting.tsx`):
```typescript
import { logAuditAction } from '@/lib/auditLog';

// After confirmBet()
await logAuditAction(user.id, {
  action: 'bet_placed',
  details: {
    betCount: betslip.length,
    totalStake: totalStake,
    matches: betslip.map(b => b.match.id)
  },
  status: 'success'
});
```

**In Deposit** (`src/pages/Deposit.tsx`):
```typescript
await logAuditAction(user.id, {
  action: 'deposit_confirmed',
  details: { amount: depositAmount, method: 'mpesa' },
  status: 'success'
});
```

**In Withdrawal** (`src/pages/Withdraw.tsx`):
```typescript
await logAuditAction(user.id, {
  action: 'withdraw_confirmed',
  details: { amount: withdrawAmount, method: 'mpesa' },
  status: 'success'
});
```

#### Step 3: Add Action History to Account Page
```typescript
import { ActionHistory } from '@/components/ActionHistory';

// In your Account or Profile page
export default function Account() {
  const user = getCurrentUser();
  
  return (
    <div>
      {/* Other components */}
      <ActionHistory userId={user.id} />
    </div>
  );
}
```

### Usage
```typescript
import { 
  logAuditAction, 
  getUserActions, 
  getAuditStats,
  getActionsByType 
} from '@/lib/auditLog';

// Log an action
await logAuditAction(userId, {
  action: 'bet_placed',
  details: { amount: 500, odds: 2.5 },
  status: 'success'
});

// Get user's action history (last 50)
const actions = await getUserActions(userId);

// Get specific action type
const bets = await getActionsByType(userId, 'bet_placed');

// Get statistics
const stats = await getAuditStats(userId);
// Returns: { totalActions: 150, byAction: {...}, byStatus: {...} }
```

---

## 2. PUSH NOTIFICATIONS

### What was Created
- **Push Notification Service**: `src/lib/pushNotificationService.ts`
- **Push Notification Hook**: `src/hooks/usePushNotifications.ts`
- **Permission Prompt**: `src/components/NotificationPermissionPrompt.tsx`

### Setup Steps

#### Step 1: Add Permission Prompt to App
In `src/App.tsx`:
```typescript
import { NotificationPermissionPrompt } from '@/components/NotificationPermissionPrompt';

export default function App() {
  return (
    <ThemeProvider>
      {/* Existing providers */}
      <NotificationPermissionPrompt />
      {/* Rest of app */}
    </ThemeProvider>
  );
}
```

#### Step 2: Request Permission (Optional - Auto-Prompt)
The `NotificationPermissionPrompt` will automatically ask after 3 seconds if the user hasn't granted permission.

Or manually trigger:
```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const { requestPermission } = usePushNotifications();
  
  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      console.log('Notifications enabled!');
    }
  };
  
  return <button onClick={handleEnable}>Enable Notifications</button>;
}
```

#### Step 3: Send Notifications on Key Events

**When bet is won**:
```typescript
import { pushNotificationService } from '@/lib/pushNotificationService';

// After bet resolution
await pushNotificationService.notifyBetWon(winAmount, odds);
```

**When deposit confirmed**:
```typescript
await pushNotificationService.notifyDepositConfirmed(amount);
```

**When withdrawal processed**:
```typescript
await pushNotificationService.notifyWithdrawalProcessed(amount);
```

**Referral earning**:
```typescript
await pushNotificationService.notifyReferralEarning(amount, referreeName);
```

### Notification Types Available
```typescript
// Bet outcomes
notifyBetWon(amount, odds)
notifyBetLost(stake)

// Financial
notifyDepositConfirmed(amount)
notifyWithdrawalProcessed(amount)

// Referrals
notifyReferralEarning(amount, referreeName)

// Match updates
notifyMatchUpdate(homeTeam, awayTeam, score)

// Custom
sendNotification(options)
```

---

## 3. REFERRAL COMMISSION TRACKING UI

### What was Created
- **SQL Table**: `referral_payouts` - Tracks payout requests
- **Referral Tracker Component**: `src/components/ReferralCommissionTracker.tsx`
- **SQL Trigger**: Auto-updates commission totals

### Setup Steps

#### Step 1: Create Payout Tracking Table
Run this SQL in your Supabase SQL editor:
```bash
-- Copy contents from: SQL_REFERRAL_PAYOUT_SETUP.sql
```

#### Step 2: Ensure Users Table Has These Columns
Verify these exist in the `users` table:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_commission_total NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_commission_pending NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE;
```

#### Step 3: Add Tracker Component to Account Page
```typescript
import { ReferralCommissionTracker } from '@/components/ReferralCommissionTracker';

export default function Account() {
  const user = getCurrentUser();
  
  return (
    <div>
      {/* Tab navigation */}
      <ReferralCommissionTracker userId={user.id} />
    </div>
  );
}
```

#### Step 4: Update Commission on Bet Wins
When a referred user's bet wins, add to their referrer's commission:
```typescript
// In bet resolution logic
if (bet.user.referred_by) {
  await supabase
    .from('users')
    .update({ 
      referral_commission_pending: pg.raw('referral_commission_pending + ' + commissionAmount)
    })
    .eq('referral_code', bet.user.referred_by);
}
```

### Features

**Referral Tracker displays:**
- Total referrals
- Active referrals (joined in last 30 days)
- Total commission earned
- Pending commission (ready to withdraw)
- Referral link (copy-to-clipboard)

**Referred Users Table:**
- Email
- Join date
- Status (active/inactive)
- Bets placed
- Commission earned

**Payout History:**
- Request amount
- Status (pending/completed/failed)
- Requested date
- Processed date
- Request payout button

### Usage
```typescript
import { ReferralCommissionTracker } from '@/components/ReferralCommissionTracker';

<ReferralCommissionTracker userId={currentUser.id} />
```

---

## Integration Summary

### Database Changes Required
1. Run `SQL_AUDIT_LOGGING_SETUP.sql` - Creates `user_actions` table
2. Run `SQL_REFERRAL_PAYOUT_SETUP.sql` - Creates `referral_payouts` table
3. Ensure `users` table has referral columns

### Component Integration Checklist

- [ ] Add `NotificationPermissionPrompt` to `App.tsx`
- [ ] Add `ActionHistory` to Account page
- [ ] Add `ReferralCommissionTracker` to Account page (referrals tab)
- [ ] Add audit logging to: Login, Signup, Bet Placement, Deposits, Withdrawals
- [ ] Add notifications to: Bet Win, Bet Loss, Deposits, Withdrawals, Referral Earnings
- [ ] Update referral commission when referred users make earnings

### Testing Checklist

**Audit Logging:**
- [ ] Log in - verify `login` action appears
- [ ] Place bet - verify `bet_placed` logged
- [ ] View action history - verify filters work

**Push Notifications:**
- [ ] Enable notifications from permission prompt
- [ ] Simulate bet win - verify notification appears
- [ ] Simulate deposit - verify notification appears

**Referral Tracking:**
- [ ] Share referral link with another user
- [ ] Verify referred user shows in tracker
- [ ] Place bet as referred user - commission updates
- [ ] Request payout - verify in payout history

---

## Advanced: Custom Audit Actions

You can log any custom action:
```typescript
await logAuditAction(userId, {
  action: 'custom_action_name',
  details: {
    any: 'data',
    you: 'want',
    nested: { object: 'works' }
  },
  status: 'success',
  errorMessage: null
});
```

Standard action categories:
- **Authentication**: login, logout, signup, password_reset, email_verified
- **Betting**: bet_placed, bet_cancelled, bet_won, bet_lost, bet_pushed
- **Financial**: deposit_requested, deposit_confirmed, withdraw_requested, withdraw_confirmed
- **Account**: profile_updated, settings_changed, referral_link_used
- **Admin**: admin_override, fixture_edit, score_edit

---

## Compliance & Security Notes

- ✅ User audit logs are RLS-protected (users see only their own)
- ✅ All sensitive actions are logged with status
- ✅ Timestamps stored with timezone
- ✅ Failed actions include error messages
- ✅ Service role can insert (for system actions)
- ✅ Referral payouts are user-restricted

---

## Support & Troubleshooting

**Push notifications not appearing?**
- Ensure browser supports notifications (modern versions do)
- Check notification permission in browser settings
- Mobile browsers may have additional restrictions

**Audit logs not saving?**
- Verify RLS policies are correct
- Check user is authenticated
- Review error in browser console

**Referral tracking not updating?**
- Ensure referred_by field is set on signup
- Verify referral_payouts table exists
- Check RLS policies on table

