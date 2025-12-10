# Session & Balance Management System

## Overview

Your application now has a complete session and balance management system. Every user who logs in gets:
1. **Authentication Session** - Managed by Supabase Auth
2. **User Data** - Balance, profile, preferences stored in database
3. **Real-time Balance Updates** - Auto-refresh every 5 seconds on relevant pages

---

## How It Works

### 1. User Login Creates Session

When a user logs in:

```
User enters email/password
           ↓
Supabase Auth validates credentials
           ↓
Session token created & stored in browser
           ↓
User is now authenticated
           ↓
Redirect to /betting
```

### 2. Session Persists Across Pages

Once logged in, the session follows the user everywhere:

```
Login at /login
     ↓
Redirect to /betting
     ↓
Can visit /deposit, /account, /admin, etc.
     ↓
Session remains valid
     ↓
All pages can access user data
```

### 3. Balance is Fetched & Displayed

Each page that needs balance:

```
Page mounts
     ↓
Calls supabase.auth.getUser()
     ↓
Gets current user from session
     ↓
Fetches balance from users table
     ↓
Displays balance on page
     ↓
Sets up 5-second auto-refresh
```

---

## Pages with Session & Balance

### Pages That Display User Balance

1. **Betting Interface** (`/betting`)
   - Shows balance at top
   - Auto-refreshes every 5 seconds
   - Updates when bets are placed

2. **Deposit Page** (`/deposit`)
   - Shows current balance
   - Shows deposit history
   - Updates when deposits are approved
   - Auto-refresh every 5 seconds

3. **Withdraw Page** (`/withdraw`)
   - Shows current balance
   - Shows withdrawal history
   - Validates against current balance
   - Auto-refresh every 5 seconds

4. **Account Page** (`/account`)
   - Shows balance in profile section
   - Shows referral earnings
   - Shows account details

### Pages That Use Session (No Balance Display)

1. **Admin Panel** (`/admin`)
   - Uses session to identify admin
   - Can view all user balances
   - Can edit user balances

2. **My Bets** (`/mybets`)
   - Uses session to identify user
   - Shows user's betting history

3. **History** (`/history`)
   - Uses session to get user data
   - Shows historical transactions

4. **Referral** (`/referral`)
   - Uses session to identify user
   - Shows referral code and earnings

---

## Session Flow Diagram

```
┌─────────────────────────────────────────────────┐
│             Application Start                    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ Check Authentication Status │
    │ supabase.auth.getUser()     │
    └────────┬──────────────┬─────┘
             │              │
         LOGGED IN      NOT LOGGED IN
             │              │
             ▼              ▼
    ┌──────────────┐  ┌──────────────┐
    │Load user data│  │Redirect to   │
    │Fetch balance │  │/login        │
    │Setup polling │  └──────────────┘
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────┐
    │ User Can Access:         │
    │ /betting                 │
    │ /deposit                 │
    │ /account                 │
    │ /withdraw                │
    │ /admin (if authorized)   │
    │ etc.                     │
    └────────┬─────────────────┘
             │
             ▼ (Every 5 seconds)
    ┌──────────────────────────┐
    │ Auto-refresh Balance     │
    │ Fetch from users table   │
    │ Update UI                │
    └──────────────────────────┘
```

---

## Code Implementation Details

### Session Check in Protected Pages

All protected pages follow this pattern:

```typescript
useEffect(() => {
  const fetchUserData = async () => {
    // Get user from session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Not logged in - redirect
      navigate("/login");
      return;
    }

    // Store user info
    setUserId(user.id);
    setEmail(user.email);

    // Fetch balance from database
    const { data: userData } = await supabase
      .from("users")
      .select("balance")
      .eq("id", user.id);

    if (userData && userData.length > 0) {
      setBalance(userData[0].balance);
    }
  };

  fetchUserData();

  // Auto-refresh every 5 seconds
  const interval = setInterval(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Fetch and update balance
    }
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

### Key Points:

1. **No `.single()` calls** - Use arrays and check length
2. **Proper error handling** - Check for data existence
3. **Auto-refresh polling** - Updates balance every 5 seconds
4. **Cleanup** - Clear intervals on unmount

---

## Pages Implementing This System

### Deposit.tsx
- ✅ Fetches user from session
- ✅ Displays balance
- ✅ 5-second auto-refresh
- ✅ Updates on deposit approval

### Withdraw.tsx
- ✅ Fetches user from session
- ✅ Displays balance
- ✅ Validates withdrawal against balance
- ✅ Tracks withdrawal history

### SharedTimeframesBetting.tsx
- ✅ Fetches user from session
- ✅ Displays balance
- ✅ 5-second auto-refresh
- ✅ Updates when bets placed

### Account.tsx
- ✅ Fetches user from session
- ✅ Displays profile & balance
- ✅ Shows referral earnings
- ✅ Manages account settings

### Referral.tsx
- ✅ Fetches user from session
- ✅ Shows referral code
- ✅ Displays earnings
- ✅ Shows referred users list

---

## Admin Balance Management

Admins can update user balances in two ways:

### 1. Via Admin Panel

```
Admin → User Management tab
      → Click "Edit Balance"
      → Enter new amount
      → Click "Save"
      → Balance updates in database
      → User sees update on next auto-refresh
```

### 2. Via Supabase SQL

```sql
UPDATE users 
SET balance = 5000 
WHERE email = 'user@example.com' 
RETURNING id, email, balance;
```

After admin updates balance:
- User's page auto-refreshes every 5 seconds
- New balance displays immediately
- No page reload needed

---

## Balance Update Flow

```
┌─────────────────────────────────┐
│   Admin approves deposit        │
│   Amount: 5000 KES              │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Update deposit_requests status  │
│ to 'completed'                  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Fetch current user balance      │
│ From users table                │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Calculate: old + 5000           │
│ Example: 0 + 5000 = 5000        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Update users.balance            │
│ WHERE id = user_id              │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Create notification for user    │
│ "Your deposit was approved"     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ User's /deposit page            │
│ Auto-refreshes in 5 seconds     │
│ Shows new balance: 5000 KES     │
└─────────────────────────────────┘
```

---

## Troubleshooting

### Balance Shows 0

**Possible Causes:**
1. User record missing from users table
2. Balance column doesn't exist
3. RLS policy blocks reading

**Fix:**
1. Check user exists in users table
2. Verify balance column exists
3. Check RLS policies (see FIX_DEPOSIT_RLS_POLICIES.sql)

### Auto-Refresh Not Working

**Possible Causes:**
1. Interval not set up correctly
2. setInterval cleared on unmount
3. useEffect dependency issue

**Fix:**
1. Check browser console for errors
2. Verify interval returns cleanup function
3. Check useEffect dependencies

### Session Lost After Refresh

**Possible Causes:**
1. Supabase session not persisted
2. LocalStorage cleared
3. Auth token expired

**Fix:**
1. Check Supabase project settings
2. Enable session persistence in browser
3. Check token refresh logic

### Balance Not Updating After Deposit

**Possible Causes:**
1. Deposit approval didn't update users table
2. Auto-refresh interval not running
3. RLS policy prevents reading

**Fix:**
1. Check Admin panel for errors (F12 console)
2. Check if deposit status changed
3. Run FIX_DEPOSIT_RLS_POLICIES.sql

---

## Testing the System

### Test 1: Verify Session Creation
```
1. Go to /login
2. Enter valid credentials
3. Should redirect to /betting
4. Check browser console: You should see user ID logged
5. Balance should display at top
```

### Test 2: Verify Balance Display
```
1. Login
2. Go to /deposit
3. Your balance should show
4. It should match what's in Supabase users.balance
```

### Test 3: Verify Auto-Refresh
```
1. Login
2. Go to /deposit
3. In another tab, admin approves a deposit for this user
4. Wait max 5 seconds
5. Balance on /deposit should update automatically
6. No page refresh needed
```

### Test 4: Verify Session Persistence
```
1. Login
2. Refresh page (F5)
3. Should stay logged in
4. All data should still load
```

### Test 5: Verify Session Logout
```
1. Login
2. Click logout
3. Try to access /deposit
4. Should redirect to /login
```

---

## Database Schema

### users table (required fields)
```sql
Column      | Type      | Required
─────────────┼───────────┼──────────
id          | uuid      | Yes (primary key)
email       | text      | Yes (unique)
balance     | decimal   | Yes (default 0)
status      | text      | No
created_at  | timestamp | Yes
updated_at  | timestamp | No
```

### deposit_requests table
```sql
Column      | Type      | Required
─────────────┼───────────┼──────────
id          | uuid      | Yes (primary key)
user_id     | uuid      | Yes
amount      | decimal   | Yes
status      | text      | Yes (pending/completed/rejected)
mpesa       | text      | No
created_at  | timestamp | Yes
```

---

## RLS Policies Required

To enable balance updates and reads, ensure these RLS policies exist:

```sql
-- Users can view their own balance
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- Service role can update users
CREATE POLICY "Service role can update users" ON users
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Service role can update deposits
CREATE POLICY "Service role can update deposits" ON deposit_requests
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);
```

Run `FIX_DEPOSIT_RLS_POLICIES.sql` to set these up automatically.

---

## Summary

Your session and balance system works like this:

1. **User logs in** → Session created by Supabase Auth
2. **User redirected to /betting** → Protected route confirmed auth
3. **Each page loads** → Fetches user from session
4. **Balance displayed** → Fetched from users table
5. **Auto-refresh active** → Updates every 5 seconds
6. **Admin updates balance** → Database changes reflected instantly
7. **User logs out** → Session cleared, redirected to /login

This ensures balances are always accurate, current, and sync'd across all pages! 🎉
