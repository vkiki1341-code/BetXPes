-- Create audit table and atomic function to apply bet results
-- Run this in Supabase SQL Editor using a Superuser/Service Role

-- Ensure uuid extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.bet_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id UUID NOT NULL,
  user_id UUID,
  change_type VARCHAR NOT NULL,
  amount NUMERIC DEFAULT 0,
  prev_balance NUMERIC,
  new_balance NUMERIC,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function: apply_bet_result
-- Parameters:
--  bet_uuid: uuid of the bet to resolve
--  result: 'won' | 'lost' | 'void' | 'cancelled'
--  payout: numeric amount to credit to user (for won/void)

CREATE OR REPLACE FUNCTION public.apply_bet_result(bet_uuid UUID, result TEXT, payout NUMERIC DEFAULT 0)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  b RECORD;
  u_balance NUMERIC;
  new_balance NUMERIC;
  audit_metadata JSONB;
BEGIN
  -- Lock the bet row
  SELECT * INTO b FROM public.bets WHERE id = bet_uuid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bet not found: %', bet_uuid;
  END IF;

  -- Prevent double resolution
  IF lower(coalesce(b.status, '')) IN ('won','lost','void','cancelled') THEN
    RETURN jsonb_build_object('status','noop','message','Bet already settled', 'bet_id', bet_uuid);
  END IF;

  -- Fetch and lock user balance
  SELECT balance INTO u_balance FROM public.users WHERE id = b.user_id FOR UPDATE;
  IF u_balance IS NULL THEN
    u_balance := 0;
  END IF;

  audit_metadata := jsonb_build_object('bet', row_to_json(b));

  IF lower(result) = 'won' THEN
    UPDATE public.bets SET status = 'won', updated_at = now() WHERE id = bet_uuid;
    new_balance := u_balance + coalesce(payout, 0);
    UPDATE public.users SET balance = new_balance WHERE id = b.user_id;
    INSERT INTO public.bet_audit(bet_id, user_id, change_type, amount, prev_balance, new_balance, metadata) VALUES (bet_uuid, b.user_id, 'payout', payout, u_balance, new_balance, audit_metadata);

    RETURN jsonb_build_object('status','ok','result','won','payout', payout, 'new_balance', new_balance);

  ELSIF lower(result) = 'lost' THEN
    UPDATE public.bets SET status = 'lost', updated_at = now() WHERE id = bet_uuid;
    INSERT INTO public.bet_audit(bet_id, user_id, change_type, amount, prev_balance, new_balance, metadata) VALUES (bet_uuid, b.user_id, 'lost', 0, u_balance, u_balance, audit_metadata);
    RETURN jsonb_build_object('status','ok','result','lost');

  ELSIF lower(result) IN ('void','push','cancelled') THEN
    -- refund stake (payout param expected to be stake amount for void/cancel)
    UPDATE public.bets SET status = COALESCE(NULLIF(lower(result),'push'),'void'), updated_at = now() WHERE id = bet_uuid;
    new_balance := u_balance + coalesce(payout, 0);
    UPDATE public.users SET balance = new_balance WHERE id = b.user_id;
    INSERT INTO public.bet_audit(bet_id, user_id, change_type, amount, prev_balance, new_balance, metadata) VALUES (bet_uuid, b.user_id, lower(result), payout, u_balance, new_balance, audit_metadata);
    RETURN jsonb_build_object('status','ok','result', lower(result),'refund', payout, 'new_balance', new_balance);

  ELSE
    RAISE EXCEPTION 'Unknown result value: %', result;
  END IF;
END;
$$;
