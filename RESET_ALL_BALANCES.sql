-- Reset all user balances to 0 (remove the default 5000 balance)
-- This ensures all users start with 0 balance
-- Run this in Supabase SQL Editor to apply the change

UPDATE users SET balance = 0;

-- Verify the update worked
SELECT COUNT(*) as total_users, AVG(balance) as average_balance, MAX(balance) as max_balance FROM users;
