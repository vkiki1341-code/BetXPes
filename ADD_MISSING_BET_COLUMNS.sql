-- Add missing columns to the bets table
-- Run this in Supabase SQL Editor

-- Add bet_type column if it doesn't exist
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS bet_type VARCHAR;

-- Add match column if it doesn't exist (stores full match data as JSON)
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS match TEXT;

-- Add selection column if it doesn't exist
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS selection VARCHAR;

-- Add odds column if it doesn't exist
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS odds FLOAT;

-- Add stake column if it doesn't exist
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS stake FLOAT;

-- Add potential_winnings column if it doesn't exist
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS potential_winnings FLOAT;

-- Add status column if it doesn't exist
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending';

-- Add created_at column if it doesn't exist
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();

-- Add updated_at column if it doesn't exist
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON public.bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bets' AND table_schema = 'public'
ORDER BY ordinal_position;
