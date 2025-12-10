-- ==========================================
-- SYSTEM STATE SYNCHRONIZATION TABLE
-- ==========================================
-- Stores the global system state that all users see
-- Ensures all users see the same matches, scores, and timeframes

CREATE TABLE IF NOT EXISTS betting_system_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_week INT DEFAULT 1,
  current_timeframe_idx INT DEFAULT 0,
  match_state VARCHAR(50) DEFAULT 'pre-countdown', -- pre-countdown, countdown, playing, betting, next-countdown
  countdown INT DEFAULT 10,
  match_timer INT DEFAULT 0, -- 0-90 match minutes
  betting_timer INT DEFAULT 30, -- 30s betting window
  state_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Add state_start_time column if it doesn't exist (for existing databases)
ALTER TABLE betting_system_state ADD COLUMN IF NOT EXISTS state_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Only one row in this table (the system state)
CREATE UNIQUE INDEX IF NOT EXISTS idx_betting_system_state_single ON betting_system_state((1));

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS betting_system_state_timestamp ON betting_system_state;

CREATE OR REPLACE FUNCTION update_betting_system_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER betting_system_state_timestamp
BEFORE UPDATE ON betting_system_state
FOR EACH ROW
EXECUTE FUNCTION update_betting_system_state_timestamp();

-- RLS Policies - everyone can read, authenticated users can read/write
-- Note: System state is global and should be writable by authenticated users
ALTER TABLE betting_system_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read system state" ON betting_system_state;
DROP POLICY IF EXISTS "Service role can update system state" ON betting_system_state;
DROP POLICY IF EXISTS "Service role can insert system state" ON betting_system_state;

CREATE POLICY "Everyone can read system state" ON betting_system_state
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update system state" ON betting_system_state
  FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Authenticated users can insert system state" ON betting_system_state
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- ==========================================
-- MATCH RESULTS TABLE
-- ==========================================
-- Stores final match scores and results in real-time
-- Triggers automatic bet resolution

CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  home_goals INT NOT NULL,
  away_goals INT NOT NULL,
  winner VARCHAR(10), -- 'home', 'away', 'draw'
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_is_final ON match_results(is_final);
CREATE INDEX IF NOT EXISTS idx_match_results_updated_at ON match_results(updated_at DESC);

-- Trigger to update timestamp
DROP TRIGGER IF EXISTS match_results_timestamp ON match_results;

CREATE OR REPLACE FUNCTION update_match_results_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER match_results_timestamp
BEFORE UPDATE ON match_results
FOR EACH ROW
EXECUTE FUNCTION update_match_results_timestamp();

-- RLS Policies - everyone can read, service role can write
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read match results" ON match_results;

CREATE POLICY "Everyone can read match results" ON match_results
  FOR SELECT USING (true);

-- ==========================================
-- FUNCTION TO RESOLVE BETS
-- ==========================================
-- Automatically resolves all bets for a match when result is finalized

CREATE OR REPLACE FUNCTION resolve_bets_for_match(match_id_param TEXT)
RETURNS TABLE(
  resolved_bets INT,
  total_winnings NUMERIC
) AS $$
DECLARE
  match_result RECORD;
  bet_record RECORD;
  winning_amount NUMERIC;
  total_won NUMERIC := 0;
  resolved_count INT := 0;
BEGIN
  -- Get the match result
  SELECT * INTO match_result FROM match_results WHERE match_id = match_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::INT, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- If not final, don't resolve yet
  IF NOT match_result.is_final THEN
    RETURN QUERY SELECT 0::INT, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Loop through all pending bets for this match
  FOR bet_record IN
    SELECT b.id, b.user_id, b.amount, b.odds, b.selection, b.bet_type
    FROM bets b
    WHERE b.match_id = match_id_param AND b.status = 'pending'
  LOOP
    -- Determine if bet won based on selection
    winning_amount := NULL;
    
    -- Check 1x2 bets
    IF bet_record.bet_type = '1X2' THEN
      IF (bet_record.selection = 'Home' AND match_result.winner = 'home') OR
         (bet_record.selection = 'Away' AND match_result.winner = 'away') OR
         (bet_record.selection = 'Draw' AND match_result.winner = 'draw') THEN
        winning_amount := bet_record.amount * bet_record.odds;
      ELSE
        winning_amount := 0; -- Bet lost
      END IF;
    END IF;
    
    -- Update bet status and result
    UPDATE bets
    SET status = CASE WHEN winning_amount > 0 THEN 'won' ELSE 'lost' END,
        potential_win = winning_amount,
        updated_at = NOW()
    WHERE id = bet_record.id;
    
    -- Add winnings to user balance if won
    IF winning_amount > 0 THEN
      UPDATE users
      SET balance = balance + winning_amount,
          updated_at = NOW()
      WHERE id = bet_record.user_id;
      
      total_won := total_won + winning_amount;
    END IF;
    
    resolved_count := resolved_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT resolved_count, total_won;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- TRIGGER TO AUTO-RESOLVE BETS
-- ==========================================
-- When a match result is marked as final, automatically resolve all bets

DROP TRIGGER IF EXISTS auto_resolve_bets_on_match_final ON match_results;

CREATE OR REPLACE FUNCTION auto_resolve_bets_trigger()
RETURNS TRIGGER AS $$
DECLARE
  result RECORD;
BEGIN
  -- If match just became final, resolve bets
  IF NEW.is_final AND NOT OLD.is_final THEN
    SELECT * INTO result FROM resolve_bets_for_match(NEW.match_id);
    
    -- Log the resolution
    RAISE NOTICE 'Resolved % bets for match %, total winnings: %',
      result.resolved_bets, NEW.match_id, result.total_winnings;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_resolve_bets_on_match_final
AFTER UPDATE ON match_results
FOR EACH ROW
EXECUTE FUNCTION auto_resolve_bets_trigger();

-- ==========================================
-- INITIALIZE SYSTEM STATE
-- ==========================================
-- Create initial system state if it doesn't exist

INSERT INTO betting_system_state (id, current_week, current_timeframe_idx, match_state, countdown, state_start_time)
SELECT '00000000-0000-0000-0000-000000000001'::UUID, 1, 0, 'pre-countdown', 10, NOW()
WHERE NOT EXISTS (SELECT 1 FROM betting_system_state);

-- ==========================================
-- FUNCTION TO UPDATE SYSTEM STATE
-- ==========================================
-- Called by backend/cron to advance match state for all users

CREATE OR REPLACE FUNCTION update_system_state(
  match_state_param VARCHAR,
  countdown_param INT,
  match_timer_param INT,
  betting_timer_param INT,
  user_id_param UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result RECORD;
BEGIN
  UPDATE betting_system_state
  SET match_state = COALESCE(match_state_param, match_state),
      countdown = COALESCE(countdown_param, countdown),
      match_timer = COALESCE(match_timer_param, match_timer),
      betting_timer = COALESCE(betting_timer_param, betting_timer),
      updated_by = COALESCE(user_id_param, updated_by),
      last_updated = NOW()
  RETURNING * INTO result;
  
  RETURN jsonb_build_object(
    'match_state', result.match_state,
    'countdown', result.countdown,
    'match_timer', result.match_timer,
    'betting_timer', result.betting_timer,
    'last_updated', result.last_updated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- FUNCTION TO GET CURRENT SYSTEM STATE
-- ==========================================

CREATE OR REPLACE FUNCTION get_system_state()
RETURNS JSONB AS $$
DECLARE
  state RECORD;
BEGIN
  SELECT * INTO state FROM betting_system_state LIMIT 1;
  
  IF NOT FOUND THEN
    INSERT INTO betting_system_state DEFAULT VALUES
    RETURNING * INTO state;
  END IF;
  
  RETURN jsonb_build_object(
    'id', state.id,
    'current_week', state.current_week,
    'current_timeframe_idx', state.current_timeframe_idx,
    'match_state', state.match_state,
    'countdown', state.countdown,
    'match_timer', state.match_timer,
    'betting_timer', state.betting_timer,
    'last_updated', state.last_updated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_bets_match_status ON bets(match_id, status);
CREATE INDEX IF NOT EXISTS idx_bets_user_match ON bets(user_id, match_id);
