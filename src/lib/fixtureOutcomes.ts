import { supabase } from './supabaseClient';

export interface FixtureOutcome {
  match_id: string;
  home_goals: number;
  away_goals: number;
  result: string; // 'home' | 'away' | 'draw'
}

/**
 * Save a fixture outcome globally to Supabase
 * This makes it visible to all users
 */
export async function saveFixtureOutcomeGlobal(outcome: FixtureOutcome) {
  try {
    const { data, error } = await supabase
      .from('match_results')
      .upsert(
        {
          match_id: outcome.match_id,
          home_goals: outcome.home_goals,
          away_goals: outcome.away_goals,
          result: outcome.result,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'match_id' }
      )
      .select();

    if (error) {
      console.error('❌ Failed to save fixture outcome globally:', error);
      return null;
    }

    console.log('✅ Fixture outcome saved globally:', outcome);
    return data;
  } catch (err) {
    console.error('Exception saving fixture outcome:', err);
    return null;
  }
}

/**
 * Get a fixture outcome from Supabase
 */
export async function getFixtureOutcome(matchId: string) {
  try {
    const { data, error } = await supabase
      .from('match_results')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (error) {
      // 404 is expected if outcome doesn't exist
      if (error.code !== 'PGRST116') {
        console.warn('Failed to fetch fixture outcome:', error);
      }
      return null;
    }

    return data;
  } catch (err) {
    console.error('Exception fetching fixture outcome:', err);
    return null;
  }
}

/**
 * Get all fixture outcomes for a league/week
 */
export async function getFixtureOutcomesForWeek(matchIds: string[]) {
  try {
    if (matchIds.length === 0) return [];

    const { data, error } = await supabase
      .from('match_results')
      .select('*')
      .in('match_id', matchIds);

    if (error) {
      console.warn('Failed to fetch fixture outcomes:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception fetching fixture outcomes:', err);
    return [];
  }
}

/**
 * Subscribe to fixture outcome changes (realtime)
 * This allows the UI to update immediately when outcomes change
 */
export function subscribeToFixtureOutcome(
  matchId: string,
  callback: (outcome: any) => void
) {
  const subscription = supabase
    .channel(`match_results:match_id=eq.${matchId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_results',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return subscription;
}
