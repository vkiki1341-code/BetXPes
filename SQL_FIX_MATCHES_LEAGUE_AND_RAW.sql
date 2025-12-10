-- SQL Migration: Make `matches.league` nullable and add `raw` JSONB if missing
-- Run this in Supabase SQL Editor. Idempotent and safe to run multiple times.

DO $$
BEGIN
  -- Only run if the matches table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'matches'
  ) THEN

    -- If league column exists, drop NOT NULL constraint
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'matches' AND column_name = 'league'
    ) THEN
      BEGIN
        EXECUTE 'ALTER TABLE public.matches ALTER COLUMN league DROP NOT NULL';
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not drop NOT NULL on matches.league: %', SQLERRM;
      END;
    END IF;

    -- Ensure raw JSONB column exists
    BEGIN
      EXECUTE 'ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS raw JSONB';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not add matches.raw column: %', SQLERRM;
    END;

    -- Ensure created_at exists
    BEGIN
      EXECUTE 'ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now()';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not add matches.created_at column: %', SQLERRM;
    END;

  ELSE
    RAISE NOTICE 'Table public.matches does not exist; skipping migration.';
  END IF;
END$$;

-- Optional: show current columns for verification (remove in automation)
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' ORDER BY ordinal_position;
