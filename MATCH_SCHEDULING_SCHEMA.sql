/**
 * Database Schema Updates for Global Match Scheduling
 * Execute this to add timing columns to matches table
 */

-- Add columns to track scheduled timing
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS schedule_index INTEGER;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS reference_epoch BIGINT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_interval_minutes INTEGER;

-- Create index for faster lookups by scheduled time
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_time ON public.matches(scheduled_start_time);

-- Create index for schedule index lookups
CREATE INDEX IF NOT EXISTS idx_matches_schedule_index ON public.matches(schedule_index);

-- Update matches table structure to better track match cycles
ALTER TABLE public.matches 
  ADD COLUMN IF NOT EXISTS league_country_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS home_team_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS away_team_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS match_cycle_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- Add column to track when schedule was last synced
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS schedule_last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create a view for upcoming matches
CREATE OR REPLACE VIEW upcoming_matches AS
SELECT 
  m.id,
  m.league_country_code,
  m.home_team_name,
  m.away_team_name,
  m.scheduled_start_time,
  m.schedule_index,
  m.overOdds,
  m.underOdds,
  NOW() as current_time,
  m.scheduled_start_time - NOW() as time_until_match
FROM public.matches m
WHERE m.scheduled_start_time > NOW()
  AND m.is_completed = false
ORDER BY m.scheduled_start_time ASC;

-- Create a view for current/live matches
CREATE OR REPLACE VIEW live_matches AS
SELECT 
  m.id,
  m.league_country_code,
  m.home_team_name,
  m.away_team_name,
  m.scheduled_start_time,
  m.schedule_index,
  m.overOdds,
  m.underOdds,
  EXTRACT(EPOCH FROM (NOW() - m.scheduled_start_time)) as minutes_elapsed
FROM public.matches m
WHERE m.scheduled_start_time <= NOW()
  AND m.is_completed = false
ORDER BY m.scheduled_start_time DESC;

-- Create a table for global schedule configuration
CREATE TABLE IF NOT EXISTS public.global_schedule_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_epoch BIGINT NOT NULL,
  match_interval_minutes INTEGER NOT NULL DEFAULT 30,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_modified_by UUID REFERENCES auth.users(id)
);

-- Create a table to track schedule changes
CREATE TABLE IF NOT EXISTS public.schedule_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_epoch BIGINT NOT NULL,
  match_interval_minutes INTEGER NOT NULL,
  change_reason VARCHAR(255),
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for schedule config
ALTER TABLE public.global_schedule_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to read global schedule config" ON public.global_schedule_config
  FOR SELECT USING (true);

CREATE POLICY "Only admins can update global schedule config" ON public.global_schedule_config
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can insert global schedule config" ON public.global_schedule_config
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
