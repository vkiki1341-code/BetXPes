-- Trigger to notify when a match is finished
-- Run this in Supabase SQL editor (use staging first)

-- Notify payload: { "match_id": "<uuid>" }

CREATE OR REPLACE FUNCTION public.notify_match_finished()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_finished boolean := false;
  new_finished boolean := false;
  payload text;
BEGIN
  -- Determine finished state from a few common fields
  IF TG_OP = 'UPDATE' THEN
    old_finished := (
      (coalesce(lower(cast(OLD.status as text)),'') LIKE '%ft%') OR
      (OLD.finished IS TRUE) OR (OLD.match_finished IS TRUE) OR (OLD.is_finished IS TRUE)
    );

    new_finished := (
      (coalesce(lower(cast(NEW.status as text)),'') LIKE '%ft%') OR
      (NEW.finished IS TRUE) OR (NEW.match_finished IS TRUE) OR (NEW.is_finished IS TRUE)
    );

    -- Only notify when state transitioned from not-finished -> finished
    IF (NOT old_finished) AND new_finished THEN
      payload := json_build_object('match_id', NEW.id)::text;
      PERFORM pg_notify('match_finished', payload);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on matches table
DROP TRIGGER IF EXISTS trg_notify_match_finished ON public.matches;
CREATE TRIGGER trg_notify_match_finished
AFTER UPDATE ON public.matches
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION public.notify_match_finished();

-- Optional: helper to remove trigger
-- DROP TRIGGER trg_notify_match_finished ON public.matches;
-- DROP FUNCTION public.notify_match_finished();

-- Notes:
-- - This trigger only sends a Postgres NOTIFY message with the match_id when a match transitions to a finished state.
-- - The worker can LISTEN/subscribe to the `match_finished` channel (or use Supabase Realtime) and then reconcile only bets for that match.
-- - If you prefer the DB to resolve bets automatically, we can extend this function to call `apply_bet_result` for each pending bet for the match, but that requires embedding resolution logic in SQL and should be tested carefully.
