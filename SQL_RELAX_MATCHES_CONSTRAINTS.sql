-- SQL Migration: Relax NOT NULL constraints and add nullable match columns
-- Run this in Supabase SQL Editor. Idempotent and safe to run multiple times.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'matches'
  ) THEN

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

    -- Add common columns as nullable if missing (safe defaults)
    BEGIN
      EXECUTE 'ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS league TEXT';
      EXECUTE 'ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_team TEXT';
      EXECUTE 'ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_team TEXT';
      EXECUTE 'ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_time TIMESTAMP WITH TIME ZONE';
      EXECUTE 'ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS kickoff_time TIMESTAMP WITH TIME ZONE';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not add one or more match columns: %', SQLERRM;
    END;

    -- Drop NOT NULL on commonly enforced columns so minimal inserts succeed
    -- This will allow inserting minimal rows with only `id` and `raw`.
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matches' AND column_name = 'league'
      ) THEN
        EXECUTE 'ALTER TABLE public.matches ALTER COLUMN league DROP NOT NULL';
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not drop NOT NULL on matches.league: %', SQLERRM;
    END;

    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matches' AND column_name = 'match_time'
      ) THEN
        EXECUTE 'ALTER TABLE public.matches ALTER COLUMN match_time DROP NOT NULL';
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not drop NOT NULL on matches.match_time: %', SQLERRM;
    END;

    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matches' AND column_name = 'kickoff_time'
      ) THEN
        EXECUTE 'ALTER TABLE public.matches ALTER COLUMN kickoff_time DROP NOT NULL';
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not drop NOT NULL on matches.kickoff_time: %', SQLERRM;
    END;

    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matches' AND column_name = 'home_team'
      ) THEN
        EXECUTE 'ALTER TABLE public.matches ALTER COLUMN home_team DROP NOT NULL';
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not drop NOT NULL on matches.home_team: %', SQLERRM;
    END;

    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matches' AND column_name = 'away_team'
      ) THEN
        EXECUTE 'ALTER TABLE public.matches ALTER COLUMN away_team DROP NOT NULL';
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not drop NOT NULL on matches.away_team: %', SQLERRM;
    END;

  ELSE
    RAISE NOTICE 'Table public.matches does not exist; skipping migration.';
  END IF;
END$$;
