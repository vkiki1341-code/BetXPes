-- Fix: Add missing 'mpesa' column to deposit_requests and withdraw_requests tables
-- Run this in Supabase SQL Editor to enable Deposit and Withdraw pages

-- 1. Drop existing foreign key constraint if it exists (to avoid issues)
ALTER TABLE IF EXISTS deposit_requests DROP CONSTRAINT IF EXISTS deposit_requests_user_id_fkey;

-- 1. Create deposit_requests table if it doesn't exist, or add missing columns
CREATE TABLE IF NOT EXISTS deposit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  mpesa VARCHAR(20),
  payment_method VARCHAR(50) DEFAULT 'mpesa',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint back with proper settings
ALTER TABLE deposit_requests 
ADD CONSTRAINT deposit_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add missing columns if they don't exist
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS mpesa VARCHAR(20);
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'mpesa';

-- 2. Drop existing foreign key constraint if it exists (to avoid issues)
ALTER TABLE IF EXISTS withdraw_requests DROP CONSTRAINT IF EXISTS withdraw_requests_user_id_fkey;

-- 2. Create withdraw_requests table if it doesn't exist, or add missing columns
CREATE TABLE IF NOT EXISTS withdraw_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  mpesa VARCHAR(20),
  payment_method VARCHAR(50) DEFAULT 'mpesa',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint back with proper settings
ALTER TABLE withdraw_requests 
ADD CONSTRAINT withdraw_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add missing columns if they don't exist
ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS mpesa VARCHAR(20);
ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'mpesa';

-- 3. Enable RLS (Row Level Security)
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for deposit_requests
DROP POLICY IF EXISTS "Users can view their own deposits" ON deposit_requests;
CREATE POLICY "Users can view their own deposits" ON deposit_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own deposits" ON deposit_requests;
CREATE POLICY "Users can create their own deposits" ON deposit_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Create RLS policies for withdraw_requests
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON withdraw_requests;
CREATE POLICY "Users can view their own withdrawals" ON withdraw_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own withdrawals" ON withdraw_requests;
CREATE POLICY "Users can create their own withdrawals" ON withdraw_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_created_at ON deposit_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user_id ON withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_created_at ON withdraw_requests(created_at DESC);

-- 7. Create auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_deposit_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_deposit_requests_timestamp ON deposit_requests;
CREATE TRIGGER update_deposit_requests_timestamp
  BEFORE UPDATE ON deposit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_deposit_requests_timestamp();

CREATE OR REPLACE FUNCTION update_withdraw_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_withdraw_requests_timestamp ON withdraw_requests;
CREATE TRIGGER update_withdraw_requests_timestamp
  BEFORE UPDATE ON withdraw_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_withdraw_requests_timestamp();
