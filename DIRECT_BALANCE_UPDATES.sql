-- ============================================
-- DIRECT BALANCE UPDATE QUERIES FOR SUPABASE
-- ============================================
-- Use these queries in the Supabase SQL Editor to directly update user balances

-- 1. VIEW ALL USERS WITH THEIR BALANCES
SELECT id, email, balance, status, created_at 
FROM users 
ORDER BY created_at DESC;

-- 2. UPDATE A SPECIFIC USER'S BALANCE BY EMAIL
-- Replace 'user@example.com' with the actual email and 5000 with the desired balance
UPDATE users 
SET balance = 5000 
WHERE email = 'user@example.com' 
RETURNING id, email, balance;

-- 3. UPDATE A SPECIFIC USER'S BALANCE BY ID
-- Replace 'user-uuid-here' with the actual user ID and 10000 with the desired balance
UPDATE users 
SET balance = 10000 
WHERE id = 'user-uuid-here' 
RETURNING id, email, balance;

-- 4. ADD/SUBTRACT FROM A USER'S EXISTING BALANCE (BY EMAIL)
-- This adds 2500 to their current balance
UPDATE users 
SET balance = balance + 2500 
WHERE email = 'user@example.com' 
RETURNING id, email, balance;

-- 5. ADD/SUBTRACT FROM A USER'S EXISTING BALANCE (BY ID)
-- This subtracts 1000 from their current balance
UPDATE users 
SET balance = balance - 1000 
WHERE id = 'user-uuid-here' 
RETURNING id, email, balance;

-- 6. SET BALANCE TO ZERO FOR A SPECIFIC USER
UPDATE users 
SET balance = 0 
WHERE email = 'user@example.com' 
RETURNING id, email, balance;

-- 7. BULK UPDATE - SET ALL USERS TO A CERTAIN BALANCE (USE WITH CAUTION!)
-- This sets all users' balance to 10000 KES
UPDATE users 
SET balance = 10000 
WHERE status != 'deleted' 
RETURNING id, email, balance;

-- 8. VIEW USERS WITH BALANCE OVER A CERTAIN AMOUNT
SELECT id, email, balance, status 
FROM users 
WHERE balance > 5000 
ORDER BY balance DESC;

-- 9. VIEW USERS WITH ZERO OR NEGATIVE BALANCE
SELECT id, email, balance, status 
FROM users 
WHERE balance <= 0 
ORDER BY balance ASC;

-- 10. CREATE A SUMMARY OF TOTAL BALANCES
SELECT 
  COUNT(*) as total_users,
  SUM(balance) as total_balance,
  AVG(balance) as average_balance,
  MIN(balance) as min_balance,
  MAX(balance) as max_balance
FROM users 
WHERE status != 'deleted';

-- ============================================
-- NOTES FOR DIRECT BALANCE UPDATES
-- ============================================
-- 1. Always verify the email or ID before running UPDATE queries
-- 2. Use "RETURNING" clause to see the updated record
-- 3. For testing, UPDATE queries won't actually save unless you click "Run"
-- 4. Be careful with bulk updates - test with a WHERE clause first
-- 5. After updating balance in Supabase, the Admin panel will show updates when you refresh
-- 6. Users will see their updated balance in the Deposit page when they refresh
-- ============================================
