import { supabase } from '@/lib/supabaseClient';
import { logAuditAction } from '@/lib/auditLog';

export interface BetToBePlaced {
  match_id: string;
  bet_type: string;
  selection: string;
  amount: number;
  odds: number;
}

export interface PlaceBetsResult {
  status: 'ok' | 'insufficient_balance' | 'failed' | 'invalid_bets';
  new_balance?: number;
  bets_placed?: number;
  stake_deducted?: number;
  error?: string;
  current_balance?: number;
  required_stake?: number;
  bets_inserted?: number;
}

/**
 * Place bets using atomic RPC function
 * This ensures either ALL bets are placed or NONE are placed (atomic transaction)
 *
 * @param userId - User ID placing the bets
 * @param bets - Array of bets to place
 * @returns PlaceBetsResult with status and new balance
 */
export async function placeBetsAtomic(
  userId: string,
  bets: BetToBePlaced[]
): Promise<PlaceBetsResult> {
  if (!userId) {
    return {
      status: 'failed',
      error: 'User not authenticated',
    };
  }

  if (!bets || bets.length === 0) {
    return {
      status: 'invalid_bets',
      error: 'No bets to place',
    };
  }

  // Calculate total stake
  const totalStake = bets.reduce((sum, bet) => sum + bet.amount, 0);

  try {
    // Format bets for RPC (convert to snake_case to match SQL)
    const formattedBets = bets.map((bet) => ({
      match_id: bet.match_id,
      bet_type: bet.bet_type,
      selection: bet.selection,
      amount: bet.amount,
      odds: bet.odds,
    }));

    // Call the atomic RPC function
    const { data, error } = await supabase.rpc('place_bets_atomic', {
      user_id_param: userId,
      bets_param: formattedBets,
      total_stake_param: totalStake,
    });

    if (error) {
      console.error('RPC Error:', error);
      return {
        status: 'failed',
        error: error.message || 'Failed to place bets',
      };
    }

    // Check if RPC returned an error in the response
    if (data?.error) {
      console.warn('RPC returned error:', data.error);
      return {
        status: data.status || 'failed',
        error: data.error,
        current_balance: data.current_balance,
        required_stake: data.required_stake,
      };
    }

    // Log successful bet placement
    if (data?.status === 'ok') {
      await logAuditAction(userId, {
        action: 'bet_placed',
        details: {
          bet_count: bets.length,
          total_stake: totalStake,
          new_balance: data.new_balance,
        },
        status: 'success',
      });
    }

    return data as PlaceBetsResult;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Bet placement error:', errorMessage);

    // Log failed bet placement
    await logAuditAction(userId, {
      action: 'bet_placed',
      details: {
        bet_count: bets.length,
        total_stake: totalStake,
      },
      status: 'failed',
      errorMessage,
    });

    return {
      status: 'failed',
      error: errorMessage,
    };
  }
}

/**
 * Alternative: Use the validated version that checks all bets before inserting
 */
export async function placeBetsValidated(
  userId: string,
  bets: BetToBePlaced[]
): Promise<PlaceBetsResult> {
  if (!userId) {
    return {
      status: 'failed',
      error: 'User not authenticated',
    };
  }

  if (!bets || bets.length === 0) {
    return {
      status: 'invalid_bets',
      error: 'No bets to place',
    };
  }

  const totalStake = bets.reduce((sum, bet) => sum + bet.amount, 0);

  try {
    const formattedBets = bets.map((bet) => ({
      match_id: bet.match_id,
      bet_type: bet.bet_type,
      selection: bet.selection,
      amount: bet.amount,
      odds: bet.odds,
    }));

    // Call the validated RPC function
    const { data, error } = await supabase.rpc('place_bets_validated', {
      user_id_param: userId,
      bets_param: formattedBets,
      total_stake_param: totalStake,
      min_stake_param: 50, // Minimum stake
    });

    if (error) {
      console.error('RPC Error:', error);
      return {
        status: 'failed',
        error: error.message || 'Failed to place bets',
      };
    }

    if (data?.error) {
      return {
        status: data.status || 'failed',
        error: data.error,
      };
    }

    if (data?.status === 'success') {
      await logAuditAction(userId, {
        action: 'bet_placed',
        details: {
          bet_count: bets.length,
          total_stake: totalStake,
          new_balance: data.new_balance,
        },
        status: 'success',
      });
    }

    return data as PlaceBetsResult;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Bet placement error:', errorMessage);

    await logAuditAction(userId, {
      action: 'bet_placed',
      details: { bet_count: bets.length, total_stake: totalStake },
      status: 'failed',
      errorMessage,
    });

    return {
      status: 'failed',
      error: errorMessage,
    };
  }
}

/**
 * Validate bet array before placement
 */
export function validateBetsBeforePlacement(bets: BetToBePlaced[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(bets) || bets.length === 0) {
    errors.push('No bets to place');
    return { valid: false, errors };
  }

  bets.forEach((bet, index) => {
    // Check required fields
    if (!bet.match_id) {
      errors.push(`Bet ${index}: Missing match ID`);
    }
    if (!bet.bet_type) {
      errors.push(`Bet ${index}: Missing bet type`);
    }
    if (!bet.selection) {
      errors.push(`Bet ${index}: Missing selection`);
    }

    // Check amounts
    if (typeof bet.amount !== 'number' || bet.amount <= 0) {
      errors.push(`Bet ${index}: Invalid amount`);
    }
    if (bet.amount < 50) {
      errors.push(`Bet ${index}: Minimum stake is 50 KES`);
    }

    // Check odds
    if (typeof bet.odds !== 'number' || bet.odds <= 0) {
      errors.push(`Bet ${index}: Invalid odds`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format bets for display
 */
export function formatBet(bet: BetToBePlaced): string {
  return `${bet.selection} @ ${bet.odds.toFixed(2)} (${bet.amount} KES)`;
}
