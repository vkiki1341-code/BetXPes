# Reset User Balances to Zero

The system was previously set to give all users a default 5000 KES balance. This has been removed completely from the code.

## Current Status

✅ **Code Changes**: All hardcoded default 5000 balances have been removed
- Signup.tsx: Creates new users with balance = 0 ✓
- Account.tsx, Deposit.tsx, Withdraw.tsx: Fetch real balance from database ✓
- BettingHeader.tsx: Now fetches and displays real balance ✓

❌ **Database**: Existing users in the database still have 5000 balance (need manual reset)

## How to Reset Database Balances

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to [https://supabase.com](https://supabase.com) and log in
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query** or paste the following:

```sql
UPDATE users SET balance = 0;
```

5. Click **Run** (or press Ctrl+Enter)
6. Verify: You should see a message like "Update: 5 rows"

### Option 2: Using SQL File

If you have the Supabase CLI installed:

```bash
cd c:\Users\HP\Desktop\exact-page-clone-main
supabase db push -- "RESET_ALL_BALANCES.sql"
```

## Verification

After running the reset, you can verify by checking:

1. Login to the app with an existing account
2. Go to Account page
3. Balance should show 0 (or whatever they've deposited)

Or check in Supabase dashboard:

```sql
SELECT email, balance FROM users LIMIT 10;
```

All users should have balance = 0 unless they've made deposits.

## Going Forward

- New users created via Signup will automatically have balance = 0 ✓
- Users can only increase balance by depositing funds ✓
- All balance updates come from the database in real-time ✓
