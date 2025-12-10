-- ALTERNATIVE FIX: Simpler version without foreign key to auth.users
-- Use this if FIX_DEPOSIT_WITHDRAW_TABLES.sql gives foreign key errors
-- Run this in Supabase SQL Editor

-- 1. Drop constraints if they exist
ALTER TABLE IF EXISTS deposit_requests DROP CONSTRAINT IF EXISTS deposit_requests_user_id_fkey;
ALTER TABLE IF EXISTS withdraw_requests DROP CONSTRAINT IF EXISTS withdraw_requests_user_id_fkey;

-- 2. Recreate deposit_requests table with simple UUID user_id (no foreign key)
DROP TABLE IF EXISTS deposit_requests CASCADE;
CREATE TABLE deposit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  mpesa VARCHAR(20),
  payment_method VARCHAR(50) DEFAULT 'mpesa',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Recreate withdraw_requests table with simple UUID user_id (no foreign key)
DROP TABLE IF EXISTS withdraw_requests CASCADE;
CREATE TABLE withdraw_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  mpesa VARCHAR(20),
  payment_method VARCHAR(50) DEFAULT 'mpesa',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for deposit_requests
DROP POLICY IF EXISTS "Users can view their own deposits" ON deposit_requests;
CREATE POLICY "Users can view their own deposits" ON deposit_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own deposits" ON deposit_requests;
CREATE POLICY "Users can create their own deposits" ON deposit_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Create RLS policies for withdraw_requests
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON withdraw_requests;
CREATE POLICY "Users can view their own withdrawals" ON withdraw_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own withdrawals" ON withdraw_requests;
CREATE POLICY "Users can create their own withdrawals" ON withdraw_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Create indexes for better performance
CREATE INDEX idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX idx_deposit_requests_created_at ON deposit_requests(created_at DESC);
CREATE INDEX idx_withdraw_requests_user_id ON withdraw_requests(user_id);
CREATE INDEX idx_withdraw_requests_created_at ON withdraw_requests(created_at DESC);

-- 8. Create auto-update trigger for updated_at on deposit_requests
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

-- 9. Create auto-update trigger for updated_at on withdraw_requests
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
