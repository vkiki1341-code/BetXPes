# User Balance Management Guide

## Overview
You can now manage user balances in two ways:
1. **Via Admin Panel** - User-friendly interface in the Admin section
2. **Via Supabase SQL Editor** - Direct database queries

---

## Method 1: Admin Panel Balance Management

### Step-by-Step Instructions:

1. **Login to Admin Panel**
   - Navigate to the Admin section of your app
   - Go to the **"User Management"** tab

2. **View All Users**
   - You'll see a table with:
     - Email address
     - Current balance (KES)
     - User status (Active/Blocked)
     - Action buttons

3. **Edit a User's Balance**
   - Click the **"Edit Balance"** button next to any user
   - A dialog will pop up showing:
     - User ID
     - Current balance input field
   - Enter the new balance amount
   - Click **"Save Balance"** to update

4. **Block/Unblock Users**
   - Click **"Block"** to suspend a user's account
   - Click **"Unblock"** to restore access

### Example:
- User "john@example.com" has balance 0
- Click "Edit Balance"
- Enter 5000
- Click "Save Balance"
- Balance updates to 5000 KES immediately

---

## Method 2: Direct Supabase SQL Updates

### Step-by-Step Instructions:

1. **Open Supabase SQL Editor**
   - Go to your Supabase Dashboard
   - Click **"SQL Editor"** on the left sidebar
   - Click **"New Query"**

2. **Use the Provided Queries**
   - Open the file: `DIRECT_BALANCE_UPDATES.sql`
   - Copy the query you need

3. **Common Operations:**

#### View All Users and Balances:
```sql
SELECT id, email, balance, status, created_at 
FROM users 
ORDER BY created_at DESC;
```

#### Update Balance by Email:
```sql
UPDATE users 
SET balance = 5000 
WHERE email = 'user@example.com' 
RETURNING id, email, balance;
```

#### Update Balance by ID:
```sql
UPDATE users 
SET balance = 10000 
WHERE id = 'user-uuid-here' 
RETURNING id, email, balance;
```

#### Add to Existing Balance:
```sql
UPDATE users 
SET balance = balance + 2500 
WHERE email = 'user@example.com' 
RETURNING id, email, balance;
```

#### Subtract from Balance:
```sql
UPDATE users 
SET balance = balance - 1000 
WHERE email = 'user@example.com' 
RETURNING id, email, balance;
```

4. **Execute the Query**
   - Paste the query into the SQL Editor
   - Replace placeholders (email, amount, etc.)
   - Click **"Run"** or press Ctrl+Enter
   - The results will show the updated record

---

## Important Notes

### Admin Panel Advantages:
✅ User-friendly interface
✅ No SQL knowledge required
✅ Immediate feedback with toast notifications
✅ Can see all users at a glance
✅ Built-in block/unblock functionality

### SQL Editor Advantages:
✅ Bulk operations
✅ Complex filtering
✅ View detailed user data
✅ Execute multiple updates at once
✅ Full control over database

### Best Practices:
1. Always verify the user's email/ID before updating
2. Use the RETURNING clause to confirm the update worked
3. For testing, start with a single user
4. Keep track of balance changes for audit purposes
5. Be careful with bulk updates - they cannot be undone without a database backup
6. Users will see updated balances when they refresh their page

---

## Troubleshooting

### Balance Won't Update in Admin Panel:
1. Check browser console (F12) for errors
2. Verify the users table has the balance column
3. Ensure RLS policies allow balance updates
4. Try refreshing the Admin panel

### Balance Won't Update in Supabase SQL:
1. Check for error messages in the query result
2. Verify the user ID or email is correct
3. Ensure RLS policies are configured (see FIX_DEPOSIT_RLS_POLICIES.sql)
4. Check if the user exists: `SELECT * FROM users WHERE email = 'test@example.com';`

### Users Don't See Updated Balance:
1. Ask them to refresh their browser (F5 or Ctrl+R)
2. The Deposit page refreshes every 5 seconds automatically
3. Clear browser cache if balance still doesn't show

---

## RLS Policy Configuration

If balance updates fail with permission errors, run the RLS policy fix:

1. Open Supabase SQL Editor
2. Create a new query
3. Paste the contents of: `FIX_DEPOSIT_RLS_POLICIES.sql`
4. Click Run

This will enable the necessary permissions for balance updates.

---

## Security Notes

- Only authenticated admin users can see/edit other user balances (when implemented with proper auth)
- All balance updates are logged in your database
- Users can only see their own balance
- Blocked users cannot make transactions or bets

---

## Quick Reference

| Action | Admin Panel | SQL |
|--------|-------------|-----|
| View all users | ✅ Table view | ✅ SELECT query |
| Edit one balance | ✅ Dialog form | ✅ UPDATE WHERE |
| Bulk updates | ❌ One at a time | ✅ UPDATE without WHERE |
| See user history | ❌ Not visible | ✅ JOIN with other tables |
| Block user | ✅ One click | ✅ UPDATE status |

---

For more help, check the console logs (F12 → Console tab) when operations fail.
