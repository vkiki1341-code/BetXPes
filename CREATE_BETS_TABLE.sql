-- Create the bets table with proper schema for storing user bets
CREATE TABLE IF NOT EXISTS public.bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  betType VARCHAR NOT NULL, -- Type of bet (1X2, BTTS, OV/UN, etc.)
  selection VARCHAR NOT NULL, -- What the user selected (e.g., "1", "Over 1.5", "Yes")
  odds FLOAT NOT NULL, -- The odds at placement
  stake FLOAT NOT NULL, -- Amount staked in KES
  potentialWinnings FLOAT NOT NULL, -- Potential return (stake * odds)
  match TEXT NOT NULL, -- Full match data as JSON string
  status VARCHAR DEFAULT 'pending', -- pending, won, lost, void
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON public.bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);

-- Enable RLS
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bets" ON public.bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bets" ON public.bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bets" ON public.bets
  FOR UPDATE USING (auth.uid() = user_id);

-- Run this in Supabase SQL Editor and then update the application code to only use these columns
