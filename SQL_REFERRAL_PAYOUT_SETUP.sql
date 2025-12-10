-- Referral Commission Tracking Tables

-- Store referral payout requests
CREATE TABLE IF NOT EXISTS referral_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, rejected
  request_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Index for efficient queries
CREATE INDEX idx_referral_payouts_user_id ON referral_payouts(user_id);
CREATE INDEX idx_referral_payouts_status ON referral_payouts(status);
CREATE INDEX idx_referral_payouts_created_at ON referral_payouts(created_at DESC);

-- RLS Policies
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payouts" ON referral_payouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payout requests" ON referral_payouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update the users table with referral commission fields if not already present
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_commission_total NUMERIC(15, 2) DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_commission_pending NUMERIC(15, 2) DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE;

-- Trigger to update commission totals when payout is processed
CREATE OR REPLACE FUNCTION update_referral_commission_on_payout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE users
    SET referral_commission_pending = GREATEST(referral_commission_pending - NEW.amount, 0)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_referral_commission_trigger
AFTER UPDATE ON referral_payouts
FOR EACH ROW
EXECUTE FUNCTION update_referral_commission_on_payout();

-- Comments for documentation
COMMENT ON TABLE referral_payouts IS 'Tracks referral commission payout requests and their status';
COMMENT ON COLUMN referral_payouts.amount IS 'Payout amount in KES';
COMMENT ON COLUMN referral_payouts.status IS 'pending - awaiting approval, completed - paid out, failed - error, rejected - admin rejected';
