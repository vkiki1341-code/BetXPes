-- Referral System - Testing & Debugging Queries
-- Run these in Supabase SQL Editor to verify the system is working

-- ============================================
-- 1. VIEW ALL REFERRALS
-- ============================================
SELECT 
  r.id,
  r.referral_code,
  u.email,
  r.referred_count,
  r.referral_earnings,
  r.created_at
FROM referrals r
JOIN auth.users u ON r.user_id = u.id
ORDER BY r.created_at DESC;

-- ============================================
-- 2. VIEW SPECIFIC USER'S REFERRAL INFO
-- ============================================
-- Replace 'user-email@example.com' with actual email
SELECT 
  r.referral_code,
  r.referred_count,
  r.referral_earnings
FROM referrals r
JOIN auth.users u ON r.user_id = u.id
WHERE u.email = 'user-email@example.com';

-- ============================================
-- 3. VIEW ALL REFERRALS FOR A USER
-- ============================================
-- Replace 'user-email@example.com' with referrer's email
SELECT 
  rl.id,
  rl.referred_user_email,
  rl.referred_at,
  rl.status,
  rl.bonus_earned
FROM referral_list rl
JOIN auth.users u ON rl.referrer_id = u.id
WHERE u.email = 'user-email@example.com'
ORDER BY rl.referred_at DESC;

-- ============================================
-- 4. FIND USER BY REFERRAL CODE
-- ============================================
-- Replace 'ABC12345' with actual referral code
SELECT 
  r.referral_code,
  u.email,
  r.referred_count,
  r.referral_earnings
FROM referrals r
JOIN auth.users u ON r.user_id = u.id
WHERE r.referral_code = 'ABC12345';

-- ============================================
-- 5. TOP 10 REFERRERS (LEADERBOARD)
-- ============================================
SELECT 
  u.email,
  r.referral_code,
  r.referred_count,
  r.referral_earnings,
  r.created_at
FROM referrals r
JOIN auth.users u ON r.user_id = u.id
ORDER BY r.referred_count DESC
LIMIT 10;

-- ============================================
-- 6. TOTAL REFERRAL STATS
-- ============================================
SELECT 
  COUNT(DISTINCT r.user_id) as total_users_with_codes,
  SUM(r.referred_count) as total_referrals,
  SUM(r.referral_earnings) as total_earnings_given
FROM referrals r;

-- ============================================
-- 7. VIEW RECENT REFERRALS (LAST 7 DAYS)
-- ============================================
SELECT 
  rl.referred_user_email,
  u.email as referrer_email,
  rl.referred_at,
  rl.bonus_earned,
  rl.status
FROM referral_list rl
JOIN auth.users u ON rl.referrer_id = u.id
WHERE rl.referred_at >= NOW() - INTERVAL '7 days'
ORDER BY rl.referred_at DESC;

-- ============================================
-- 8. FIND USERS WHO WERE REFERRED
-- ============================================
-- Replace 'referred-user-email@example.com'
SELECT 
  ru.email as referred_user,
  u.email as referred_by,
  rl.referred_at,
  rl.bonus_earned
FROM referral_list rl
JOIN auth.users ru ON rl.referred_user_id = ru.id
JOIN auth.users u ON rl.referrer_id = u.id
WHERE ru.email = 'referred-user-email@example.com';

-- ============================================
-- 9. CHECK IF REFERRAL CODE EXISTS
-- ============================================
SELECT EXISTS(SELECT 1 FROM referrals WHERE referral_code = 'ABC12345') as code_exists;

-- ============================================
-- 10. UPDATE EARNINGS (MANUAL - FOR TESTING)
-- ============================================
-- CAUTION: Only run for testing!
-- Replace 'ABC12345' with actual code
UPDATE referrals
SET 
  referred_count = referred_count + 1,
  referral_earnings = referral_earnings + 500,
  updated_at = NOW()
WHERE referral_code = 'ABC12345';

-- ============================================
-- 11. DELETE TEST DATA (CAREFUL!)
-- ============================================
-- Delete a specific referral record by code
-- DELETE FROM referral_list WHERE id = 'referral-list-id';
-- DELETE FROM referrals WHERE referral_code = 'TEST12345';

-- ============================================
-- 12. CHECK TABLE STRUCTURE
-- ============================================
-- View columns in referrals table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'referrals'
ORDER BY ordinal_position;

-- ============================================
-- 13. CHECK ROW LEVEL SECURITY
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename IN ('referrals', 'referral_list');

-- ============================================
-- 14. VIEW UNUSED REFERRAL CODES
-- ============================================
SELECT 
  u.email,
  r.referral_code,
  r.referred_count,
  r.created_at
FROM referrals r
JOIN auth.users u ON r.user_id = u.id
WHERE r.referred_count = 0
ORDER BY r.created_at DESC;

-- ============================================
-- 15. REFERRALS BY STATUS
-- ============================================
SELECT 
  status,
  COUNT(*) as count,
  SUM(bonus_earned) as total_bonus
FROM referral_list
GROUP BY status;

-- ============================================
-- TESTING WORKFLOW
-- ============================================
-- 1. Check if tables exist:
SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('referrals', 'referral_list');

-- 2. Count records:
SELECT 'referrals' as table_name, COUNT(*) as count FROM referrals
UNION ALL
SELECT 'referral_list' as table_name, COUNT(*) as count FROM referral_list;

-- 3. Check for errors:
-- Run queries 1-5 above and verify no errors

-- 4. Create test data:
-- Sign up with new user using referral link

-- 5. Verify test data:
-- Run query 2 or 3 to see new referral

-- ============================================
-- COMMON ISSUES & FIXES
-- ============================================

-- Issue: "referrals table doesn't exist"
-- Fix: Run REFERRAL_SETUP.sql first

-- Issue: "permission denied for schema public"
-- Fix: Check RLS policies (query 13)

-- Issue: No data returned
-- Fix: Verify users exist in auth.users table
-- SELECT * FROM auth.users;

-- Issue: Referral code is NULL
-- Fix: Check if code was generated correctly
-- SELECT referral_code, user_id FROM referrals WHERE referral_code IS NULL;

-- ============================================
-- PERFORMANCE QUERIES
-- ============================================

-- View index information
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('referrals', 'referral_list')
ORDER BY tablename, indexname;

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM referrals WHERE referral_code = 'TEST123';

-- ============================================
-- DATA CLEANUP (USE WITH CAUTION)
-- ============================================

-- Reset referral counts (for testing only!)
-- UPDATE referrals SET referred_count = 0, referral_earnings = 0;

-- Delete all test referrals
-- DELETE FROM referral_list WHERE referred_at > NOW() - INTERVAL '1 hour';

-- Remove duplicate referral codes
-- DELETE FROM referrals r1 WHERE r1.ctid > (
--   SELECT min(r2.ctid) FROM referrals r2 
--   WHERE r2.referral_code = r1.referral_code
-- );
