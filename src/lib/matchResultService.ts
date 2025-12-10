import { supabase } from '@/lib/supabaseClient';
import { validateMatchScores } from '@/lib/matchScoreValidation';
import { logAuditAction } from '@/lib/auditLog';

/**
 * Service for managing match results and bet resolution
 * Updates are broadcast to all users in real-time via Supabase
 */

/**
 * Update match score and broadcast to all users
 * @param matchId - The match ID to update
 * @param homeGoals - New home team goals
 * @param awayGoals - New away team goals
 * @param isFinal - Whether match is finished
 * @returns Result of update
 */
export async function updateMatchScore(
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  isFinal: boolean = false
) {
  // Validate scores
  const validation = validateMatchScores(homeGoals, awayGoals);
  if (!validation.valid) {
    return {
      error: validation.errors.join(', '),
      success: false,
    };
  }

  try {
    // Determine winner
    let winner: 'home' | 'away' | 'draw' | null = null;
    if (homeGoals > awayGoals) {
      winner = 'home';
    } else if (awayGoals > homeGoals) {
      winner = 'away';
    } else {
      winner = 'draw';
    }

    // Check if result exists
    const { data: existingResult } = await supabase
      .from('match_results')
      .select('id')
      .eq('match_id', matchId)
      .single();

    let result;

    if (existingResult) {
      // Update existing result
      const { data, error } = await supabase
        .from('match_results')
        .update({
          home_goals: homeGoals,
          away_goals: awayGoals,
          winner,
          is_final: isFinal,
        })
        .eq('match_id', matchId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new result
      const { data, error } = await supabase
        .from('match_results')
        .insert({
          match_id: matchId,
          home_goals: homeGoals,
          away_goals: awayGoals,
          winner,
          is_final: isFinal,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    console.log(`[Match Update] ${matchId}: ${homeGoals}-${awayGoals} (Final: ${isFinal})`);

    // This triggers the auto-resolve function if is_final is true
    if (isFinal) {
      await resolveBetsForMatch(matchId);
    }

    return {
      success: true,
      result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to update match score:', errorMessage);
    return {
      error: errorMessage,
      success: false,
    };
  }
}

/**
 * Resolve all pending bets for a match
 * This is called automatically when match is marked final
 * @param matchId - The match ID to resolve bets for
 */
export async function resolveBetsForMatch(matchId: string) {
  try {
    const { data, error } = await supabase.rpc('resolve_bets_for_match', {
      match_id_param: matchId,
    });

    if (error) throw error;

    console.log(
      `[Bets Resolved] Match: ${matchId}, Resolved: ${data.resolved_bets}, Total Winnings: ${data.total_winnings}`
    );

    return {
      success: true,
      resolvedBets: data.resolved_bets,
      totalWinnings: data.total_winnings,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to resolve bets:', errorMessage);
    return {
      error: errorMessage,
      success: false,
    };
  }
}

/**
 * Update global system state that all users see
 * @param matchState - Current match state
 * @param countdown - Countdown timer value
 * @param matchTimer - Match progress (0-90 minutes)
 * @param bettingTimer - Betting window countdown
 * @param userId - User making the update (optional)
 */
export async function updateSystemState(
  matchState: 'pre-countdown' | 'countdown' | 'playing' | 'betting' | 'next-countdown',
  countdown?: number,
  matchTimer?: number,
  bettingTimer?: number,
  userId?: string
) {
  try {
    const { data, error } = await supabase.rpc('update_system_state', {
      match_state_param: matchState,
      countdown_param: countdown ?? null,
      match_timer_param: matchTimer ?? null,
      betting_timer_param: bettingTimer ?? null,
      user_id_param: userId ?? null,
    });

    if (error) throw error;

    console.log('[System State Update]', data);
    return {
      success: true,
      state: data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to update system state:', errorMessage);
    return {
      error: errorMessage,
      success: false,
    };
  }
}

/**
 * Get current system state
 */
export async function getSystemState() {
  try {
    const { data, error } = await supabase.rpc('get_system_state');

    if (error) throw error;

    return {
      success: true,
      state: data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to get system state:', errorMessage);
    return {
      error: errorMessage,
      success: false,
    };
  }
}

/**
 * Get all active match results
 */
export async function getActiveMatchResults(
  matchIds: string[]
): Promise<Map<string, any>> {
  try {
    const { data, error } = await supabase
      .from('match_results')
      .select('*')
      .in('match_id', matchIds);

    if (error) throw error;

    const resultsMap = new Map();
    data?.forEach((result) => {
      resultsMap.set(result.match_id, result);
    });

    return resultsMap;
  } catch (error) {
    console.error('Failed to fetch match results:', error);
    return new Map();
  }
}

/**
 * Get user's real-time bets with match results
 */
export async function getUserBetsWithResults(userId: string) {
  try {
    const { data, error } = await supabase
      .from('bets')
      .select('*, match_results:match_id(home_goals, away_goals, winner, is_final)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      bets: data || [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
      bets: [],
    };
  }
}

/**
 * Get bet statistics for a user
 */
export async function getUserBetStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('bets')
      .select('status, amount, potential_win')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      pending: data?.filter((b) => b.status === 'pending').length || 0,
      won: data?.filter((b) => b.status === 'won').length || 0,
      lost: data?.filter((b) => b.status === 'lost').length || 0,
      totalStaked: data?.reduce((sum, b) => sum + b.amount, 0) || 0,
      totalWon: data?.filter((b) => b.status === 'won').reduce((sum, b) => sum + b.potential_win, 0) || 0,
    };

    return {
      success: true,
      stats,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
      stats: null,
    };
  }
}

/**
 * Log match update for audit trail
 */
export async function logMatchUpdate(
  userId: string | undefined,
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  isFinal: boolean
) {
  if (!userId) return;

  try {
    await logAuditAction(userId, {
      action: 'admin_override',
      details: {
        match_id: matchId,
        home_goals: homeGoals,
        away_goals: awayGoals,
        is_final: isFinal,
      },
      status: 'success',
    });
  } catch (error) {
    console.error('Failed to log match update:', error);
  }
}
