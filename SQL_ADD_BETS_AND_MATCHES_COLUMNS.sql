-- SQL Migration: Add missing bets/matches columns and constraints
-- Run this in Supabase SQL Editor (SQL > New query) against your project's database.
-- This migration is idempotent and safe to run multiple times.

-- 1) Create a minimal `matches` table if it doesn't exist. Many apps store
-- match fixtures with textual IDs like 'en-week21-game0', so `id` is TEXT.
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY,
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2) Add missing columns to `bets`. Use IF NOT EXISTS so migration is safe.
ALTER TABLE public.bets
  ADD COLUMN IF NOT EXISTS match_id TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC,
  ADD COLUMN IF NOT EXISTS selection VARCHAR,
  ADD COLUMN IF NOT EXISTS odds NUMERIC,
  ADD COLUMN IF NOT EXISTS potential_win NUMERIC,
  ADD COLUMN IF NOT EXISTS bet_type VARCHAR,
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 3) Create indexes to speed up common queries
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON public.bets(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON public.bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);

-- 4) Add foreign key constraint from bets.match_id -> matches.id if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bets_match_id_fkey' AND table_name = 'bets'
  ) THEN
    ALTER TABLE public.bets
      ADD CONSTRAINT bets_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 5) Backfill new columns from older columns if present in the table.
-- These statements are tolerant: they only run UPDATE when the source column exists.

-- 5a) If a `stake` column exists, copy it into `amount` for any rows missing amount.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='bets' AND column_name='stake'
  ) THEN
    EXECUTE 'UPDATE public.bets SET amount = stake WHERE amount IS NULL AND stake IS NOT NULL';
  END IF;
END$$;

-- 5b) If a `potentialWinnings` or `potential_winnings` column exists, copy it into `potential_win`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='bets' AND column_name='potentialWinnings'
  ) THEN
    EXECUTE 'UPDATE public.bets SET potential_win = "potentialWinnings" WHERE potential_win IS NULL AND "potentialWinnings" IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='bets' AND column_name='potential_winnings'
  ) THEN
    EXECUTE 'UPDATE public.bets SET potential_win = potential_winnings WHERE potential_win IS NULL AND potential_winnings IS NOT NULL';
  END IF;
END$$;

-- 5c) If a camelCase betType column exists, copy to bet_type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='bets' AND column_name='"betType"'
  ) THEN
    EXECUTE 'UPDATE public.bets SET bet_type = "betType" WHERE bet_type IS NULL AND "betType" IS NOT NULL';
  END IF;
END$$;

-- 5d) If a `match` column contains full JSON for the match, try extracting an `id` field and write to match_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='bets' AND column_name='match'
  ) THEN
    BEGIN
      -- Only update rows where match_id is NULL and match looks like JSON with an "id" property
      EXECUTE 'UPDATE public.bets SET match_id = (match::json ->> ''id'') WHERE match_id IS NULL AND match IS NOT NULL AND (match::json ->> ''id'') IS NOT NULL';
    EXCEPTION WHEN others THEN
      -- If parsing fails for any row, skip to avoid breaking the migration
      RAISE NOTICE 'Skipping match->match_id backfill due to parse errors';
    END;
  END IF;
END$$;

-- 6) Ensure `matches` table has raw data for any existing bets that still reference `match` JSON but missing matches rows
-- For bets where match_id exists but matches row is missing, insert a minimal matches row with `raw` taken from bets.match
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id_val, raw_val FROM (
      SELECT (CASE WHEN match_id IS NOT NULL THEN match_id ELSE NULL END) AS id_val, match AS raw_val, match_id
      FROM public.bets
    ) t
    WHERE id_val IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.matches m WHERE m.id = t.id_val)
  LOOP
    BEGIN
      INSERT INTO public.matches(id, raw, created_at) VALUES (rec.id_val, CASE WHEN rec.raw_val IS NOT NULL THEN (rec.raw_val::jsonb) ELSE NULL END, now());
    EXCEPTION WHEN others THEN
      -- ignore individual insert errors
      RAISE NOTICE 'Could not insert match for id %', rec.id_val;
    END;
  END LOOP;
END$$;

-- Final: show schema state for verification (optional; remove if running in automation)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bets' ORDER BY ordinal_position;

-- End of migration
