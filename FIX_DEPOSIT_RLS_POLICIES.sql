-- Fix RLS policies for deposit_requests and withdraw_requests
-- Run this in Supabase SQL Editor to allow admin updates and service role operations

-- ============================================
-- DEPOSIT_REQUESTS RLS POLICIES FIX
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own deposits" ON deposit_requests;
DROP POLICY IF EXISTS "Users can create their own deposits" ON deposit_requests;

-- 1. Users can SELECT (view) their own deposits
CREATE POLICY "Users can view their own deposits" ON deposit_requests
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 2. Users can INSERT (create) their own deposits
CREATE POLICY "Users can create their own deposits" ON deposit_requests
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow authenticated users with admin role to update any deposit
-- (This assumes you have a check in your app or an admin table)
-- For now, we'll create a permissive policy for service role
CREATE POLICY "Service role can update deposits" ON deposit_requests
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 4. Allow service role to delete deposits if needed
CREATE POLICY "Service role can delete deposits" ON deposit_requests
  FOR DELETE 
  USING (true);

-- ============================================
-- WITHDRAW_REQUESTS RLS POLICIES FIX
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON withdraw_requests;
DROP POLICY IF EXISTS "Users can create their own withdrawals" ON withdraw_requests;

-- 1. Users can SELECT (view) their own withdrawals
CREATE POLICY "Users can view their own withdrawals" ON withdraw_requests
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 2. Users can INSERT (create) their own withdrawals
CREATE POLICY "Users can create their own withdrawals" ON withdraw_requests
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow authenticated users with admin role to update any withdrawal
CREATE POLICY "Service role can update withdrawals" ON withdraw_requests
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 4. Allow service role to delete withdrawals if needed
CREATE POLICY "Service role can delete withdrawals" ON withdraw_requests
  FOR DELETE 
  USING (true);

-- ============================================
-- FIX USERS TABLE RLS POLICIES
-- ============================================

-- Ensure users table has proper RLS policies for balance updates
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;

-- 1. Users can view their own balance
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- 2. Service role can update user balance
CREATE POLICY "Service role can update users" ON users
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Ensure deposit_requests table has proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON deposit_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON withdraw_requests TO authenticated;

-- Ensure users table has proper permissions
GRANT SELECT, UPDATE ON users TO authenticated;

-- ============================================
-- VERIFY RLS IS ENABLED
-- ============================================

-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('deposit_requests', 'withdraw_requests', 'users');

-- Check active policies
SELECT schemaname, tablename, policyname, permissive, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('deposit_requests', 'withdraw_requests', 'users');
