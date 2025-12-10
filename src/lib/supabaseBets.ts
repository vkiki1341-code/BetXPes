import { supabase } from "@/lib/supabaseClient";

export const saveBetToSupabase = async (bet: any, userId: string) => {
  // Validate inputs
  if (!bet || !userId) {
    console.error("❌ Invalid bet or userId:", { bet, userId });
    return new Error("Invalid bet or user ID");
  }

  console.log("💾 Bet to be saved (raw):", bet);
  console.log("Match object:", bet.match);
  console.log("Match ID:", bet.match?.id);

  // Get match_id from the match object
  const matchId = bet.match?.id;
  if (!matchId) {
    console.error("❌ Match ID is required but not found in bet.match");
    return new Error("Match ID is required to place a bet");
  }

  // Ensure the referenced match exists in the `matches` table. If not, insert it.
  try {
    console.log("🔎 Checking if match exists:", matchId);
    const { data: existingMatches, error: matchQueryError } = await supabase
      .from("matches")
      .select("id")
      .eq("id", matchId)
      .limit(1);

    if (matchQueryError) {
      console.warn("⚠️ Could not query matches table:", matchQueryError);
    }

    if (!existingMatches || existingMatches.length === 0) {
      console.log("➕ Match not found in DB, inserting match record:", matchId);
      // Insert minimally: `id` and `raw` JSON. Many schema variations exist;
      // inserting only `raw` avoids referencing columns that may not exist.
      const matchInsert: any = {
        id: matchId,
        // send the object directly so Supabase stores JSONB, not a JSON string
        raw: bet.match ?? null,
      };

      const { data: insertedMatch, error: matchInsertError } = await supabase.from("matches").insert([matchInsert]).select();
      if (matchInsertError) {
        console.error("❌ Error inserting match record:", matchInsertError);
        // If matches insertion fails, abort bet placement
        return matchInsertError;
      }
      console.log("✓ Inserted match record:", insertedMatch);
    } else {
      console.log("✓ Match already exists in DB:", matchId);
    }
  } catch (e) {
    console.error("❌ Exception while ensuring match exists:", e);
    return new Error(String(e));
  }

  // Structure the bet data - matches the actual bets table schema
  const betData: any = {
    user_id: userId,
    match_id: matchId,  // Foreign key reference to matches table
    amount: parseFloat(bet.stake) || 0,  // Column name is "amount" not "stake"
    selection: bet.selection || '',
    odds: parseFloat(bet.odds) || 0,
    potential_win: parseFloat(bet.potentialWin) || (parseFloat(bet.stake) * parseFloat(bet.odds)) || 0,  // Column name is "potential_win"
    created_at: new Date().toISOString(),  // Timestamp for 90-second timeout protection
  };

  // Add optional fields
  if (bet.betType) {
    betData.bet_type = bet.betType;
  }

  console.log("📤 Saving bet to Supabase with data:", betData);
  console.log("📋 Columns being saved:", Object.keys(betData).join(", "));

  try {
    const { data, error } = await supabase.from("bets").insert([betData]).select();
    
    if (error) {
      console.error("❌ Error saving bet:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      return error;
    }
    
    console.log("✓ Bet saved successfully:", data);
    
    // Create a notification for bet placed
    const matchInfo = bet.match;
    const selectionText = bet.selection || bet.outcome || 'Selection';
    const stakeAmount = bet.stake || 0;
    
    console.log("🔔 Creating notification for bet placement");
    
    const notifResult = await supabase.from("notifications").insert([{
      user_id: userId,
      type: 'bet_placed',
      title: 'Bet Placed Successfully',
      message: `Bet placed on ${matchInfo?.homeTeam?.shortName} vs ${matchInfo?.awayTeam?.shortName} - ${selectionText} @ ${bet.odds} odds (KES ${stakeAmount})`,
      read: false,
    }]);
    
    console.log("Notification creation result:", notifResult);
    return null; // Success
  } catch (e) {
    console.error("❌ Exception during bet save:", e);
    return new Error(String(e));
  }
};

export const saveBetOutcomeNotification = async (userId: string, bet: any, result: 'won' | 'lost' | 'push') => {
  const matchInfo = bet.match;
  const stakeAmount = bet.stake || 0;
  
  let title = '';
  let message = '';
  
  if (result === 'won') {
    const winnings = (stakeAmount * parseFloat(bet.odds)).toFixed(2);
    title = '🎉 Bet Won!';
    message = `Your bet on ${matchInfo?.homeTeam?.shortName} vs ${matchInfo?.awayTeam?.shortName} won! You won KES ${winnings}`;
  } else if (result === 'lost') {
    title = '❌ Bet Lost';
    message = `Your bet on ${matchInfo?.homeTeam?.shortName} vs ${matchInfo?.awayTeam?.shortName} lost. Stake: KES ${stakeAmount}`;
  } else {
    title = '🔄 Bet Voided';
    message = `Your bet on ${matchInfo?.homeTeam?.shortName} vs ${matchInfo?.awayTeam?.shortName} was voided. Refunded: KES ${stakeAmount}`;
  }
  
  await supabase.from("notifications").insert([{
    user_id: userId,
    type: 'bet_outcome',
    title,
    message,
    read: false,
  }]);
};

export const getBetsFromSupabase = async (userId: string) => {
  try {
    console.log("=== FETCHING BETS FOR USER:", userId);
    
    // Fetch bets with matches join
    let { data, error } = await supabase
      .from("bets")
      .select("*, matches(*)")
      .eq("user_id", userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("❌ Database error fetching bets:", error);
      return { data: null, error: error };
    }

    console.log("✓ Raw bets from database:", data);

    if (!data || data.length === 0) {
      console.log("No bets found in database");
      return { data: [], error: null };
    }

    // Fetch match results for all matches with pending/resolved bets
    // This ensures we have the latest score info for bet resolution
    const matchIds = Array.from(new Set(data.map((bet: any) => bet.match_id).filter(Boolean)));
    let matchResultsMap: any = {};
    
    if (matchIds.length > 0) {
      console.log(`🔍 Fetching match results for ${matchIds.length} matches...`);
      const { data: matchResults, error: matchResultsError } = await supabase
        .from("match_results")
        .select("id, match_id, home_goals, away_goals, winner, is_final")
        .in("match_id", matchIds);
      
      if (matchResultsError) {
        console.warn("⚠️ Could not fetch match_results:", matchResultsError.message);
      } else if (matchResults && matchResults.length > 0) {
        // Create a map of match_id -> match_result for quick lookup
        matchResults.forEach((mr: any) => {
          matchResultsMap[mr.match_id] = mr;
        });
        console.log(`✓ Fetched match results for ${Object.keys(matchResultsMap).length} matches`);
      }
    }

    // Transform database records to BetData format
    const transformedBets = data.map((bet: any) => {
      console.log("Processing bet:", bet);

      // Get match info from joined matches table or from JSON fields
      // Prefer joined `matches` row, but if it contains a `raw` JSONB field, use that.
      let matchInfo: any = null;
      if (bet.matches) {
        // joined matches row
        matchInfo = bet.matches;
        if (matchInfo.raw) {
          matchInfo = matchInfo.raw;
        }
      } else if (bet.match) {
        matchInfo = bet.match;
      } else if (bet.raw) {
        matchInfo = bet.raw;
      } else if (bet.match_raw) {
        matchInfo = bet.match_raw;
      } else if (bet.__raw && (bet.__raw.match || bet.__raw.matches || bet.__raw.raw)) {
        matchInfo = bet.__raw.match ?? bet.__raw.matches ?? bet.__raw.raw;
      }
      let homeTeam = 'Unknown';
      let awayTeam = 'Unknown';
      let kickoffTime = new Date().toISOString();

      // Helper to safely parse JSON strings
      const parseIfString = (val: any) => {
        if (!val) return null;
        if (typeof val === 'string') {
          try {
            return JSON.parse(val);
          } catch (e) {
            return null;
          }
        }
        return val;
      };

      let rawMatch = parseIfString(matchInfo) || matchInfo || {};

      // Defensive: if rawMatch is a wrapper object with a `data` or `fixture` or `event` key, unwrap it
      const unwrapCandidates = ['data', 'fixture', 'event', 'match', 'payload'];
      for (const k of unwrapCandidates) {
        if (rawMatch && rawMatch[k]) {
          const un = parseIfString(rawMatch[k]) || rawMatch[k];
          if (un && (typeof un === 'object' || typeof un === 'string')) {
            // prefer unwrapped object if it contains recognizable team keys
            rawMatch = un;
            break;
          }
        }
      }

      // Accessors with many fallbacks for various schemas. This does a deeper search
      // to handle arrays (participants), nested objects and string labels like "Team A vs Team B".
      const extractTeams = (obj: any): { home?: string; away?: string } => {
        if (!obj) return {};
        // direct common keys
        const direct = (o: any) => {
          const get = (v: any) => {
            if (!v) return null;
            if (typeof v === 'string') return v;
            if (typeof v === 'object') return v.shortName || v.name || v.displayName || v.fullName || null;
            return null;
          };

          const h = get(o.home_team ?? o.homeTeam ?? o.home ?? o.home_name ?? o.homeName ?? o.home_team_name);
          const a = get(o.away_team ?? o.awayTeam ?? o.away ?? o.away_name ?? o.awayName ?? o.away_team_name);
          if (h || a) return { home: h || undefined, away: a || undefined };
          return null;
        };

        // participants array (common in some feeds)
        const fromParticipants = (o: any) => {
          const parts = o.participants || o.teams || o.competitors || o.sides;
          if (Array.isArray(parts) && parts.length >= 2) {
            const first = parts[0];
            const second = parts[1];
            const getName = (p: any) => p?.shortName || p?.name || p?.displayName || (typeof p === 'string' ? p : null);
            return { home: getName(first) || undefined, away: getName(second) || undefined };
          }
          return null;
        };

        // label or name containing both teams ("Team A vs Team B", "Team A - Team B", "Team A v Team B")
        const fromLabel = (o: any) => {
          const label = o.label || o.name || o.match_label || o.title || null;
          if (label && typeof label === 'string') {
            const separators = [' vs ', ' v ', ' - ', ' vs. ', '\u2013', '\u2014'];
            for (const sep of separators) {
              if (label.includes(sep)) {
                const parts = label.split(sep).map((s) => s.trim()).filter(Boolean);
                if (parts.length >= 2) return { home: parts[0], away: parts[1] };
              }
            }
            // sometimes labels like "Team A vs Team B - Competition" -> try splitting on ' - ' and then ' vs '
            if (label.includes(' - ')) {
              const left = label.split(' - ')[0];
              for (const sep of [' vs ', ' v ']) {
                if (left.includes(sep)) {
                  const parts = left.split(sep).map((s) => s.trim());
                  if (parts.length >= 2) return { home: parts[0], away: parts[1] };
                }
              }
            }
          }
          return null;
        };

        // deep traversal: look for keys that look like team name fields anywhere in the structure
        const deepSearch = (o: any, depth = 0): { home?: string; away?: string } | null => {
          if (!o || depth > 4) return null; // limit recursion
          if (typeof o === 'string') {
            // a single string might already be "A vs B"
            const lbl = fromLabel({ label: o });
            if (lbl) return lbl;
            return null;
          }
          if (Array.isArray(o)) {
            // try first two array elements
            if (o.length >= 2) {
              const a0 = o[0];
              const a1 = o[1];
              const n0 = (a0?.shortName || a0?.name || a0?.displayName || (typeof a0 === 'string' ? a0 : null));
              const n1 = (a1?.shortName || a1?.name || a1?.displayName || (typeof a1 === 'string' ? a1 : null));
              if (n0 || n1) return { home: n0 || undefined, away: n1 || undefined };
            }
            for (const item of o) {
              const found = deepSearch(item, depth + 1);
              if (found) return found;
            }
            return null;
          }

          // shallow strategies
          const d = direct(o);
          if (d) return d;
          const p = fromParticipants(o);
          if (p) return p;
          const l = fromLabel(o);
          if (l) return l;

          // recurse into children
          for (const k of Object.keys(o)) {
            try {
              const child = o[k];
              if (child && (typeof child === 'object' || typeof child === 'string')) {
                const res = deepSearch(child, depth + 1);
                if (res) return res;
              }
            } catch (e) {
              // ignore errors on weird values
            }
          }
          return null;
        };

        // run the strategies
        const parsed = deepSearch(obj, 0) || {};
        return { home: parsed.home, away: parsed.away };
      };

      const teams = extractTeams(rawMatch) || {};
      homeTeam = teams.home || 'Unknown';
      awayTeam = teams.away || 'Unknown';

      // kickoff time fallbacks
      const kTime = rawMatch.kickoff_time || rawMatch.kickoffTime || rawMatch.match_time || rawMatch.matchTime || rawMatch.time || rawMatch.match_time_local;
      if (kTime) {
        try {
          kickoffTime = (typeof kTime === 'string' || typeof kTime === 'number') ? new Date(kTime).toISOString() : new Date().toISOString();
        } catch (e) {
          kickoffTime = new Date().toISOString();
        }
      }

      // Attempt to auto-resolve bet status using match result when possible (basic 1X2 support)
      const tryResolveStatusFromMatch = (currentStatus: string, rawMatch: any, betType: string, selection: string, homeName?: string, awayName?: string, matchResult?: any) => {
        if (!currentStatus || String(currentStatus).toLowerCase() !== 'pending') return currentStatus;
        if (!rawMatch && !matchResult) return currentStatus;

        // PRIORITY 1: Check if there's a match_result row from database
        let homeScore: any = undefined;
        let awayScore: any = undefined;
        let finishedFlag = false;

        if (matchResult && matchResult.id) {
          // We have match result data from match_results table
          homeScore = matchResult.home_goals;
          awayScore = matchResult.away_goals;
          finishedFlag = matchResult.is_final === true;
          console.log(`[BET RESOLUTION] Using match_results table: ${homeScore}-${awayScore} (final: ${finishedFlag})`);
        } else if (rawMatch) {
          // Fallback to parsing scores from match object
          homeScore = Number(rawMatch.home_score ?? rawMatch.homeScore ?? rawMatch.homeGoals ?? rawMatch.home_goals ?? rawMatch.scores?.home ?? rawMatch.scores?.home_score ?? rawMatch.score?.home ?? rawMatch.score?.homeScore ?? rawMatch.result?.home ?? rawMatch.result?.home_score);
          awayScore = Number(rawMatch.away_score ?? rawMatch.awayScore ?? rawMatch.awayGoals ?? rawMatch.away_goals ?? rawMatch.scores?.away ?? rawMatch.scores?.away_score ?? rawMatch.score?.away ?? rawMatch.score?.awayScore ?? rawMatch.result?.away ?? rawMatch.result?.away_score);
          finishedFlag = (rawMatch.status && String(rawMatch.status).toLowerCase().includes('ft')) || rawMatch.finished === true || rawMatch.match_finished === true || rawMatch.is_finished === true;
        }

        const kickoff = rawMatch?.kickoff_time || rawMatch?.kickoffTime || rawMatch?.match_time || rawMatch?.matchTime || rawMatch?.time;
        const kickedOff = kickoff ? (new Date(kickoff).getTime() < Date.now()) : false;

        const hasScores = !isNaN(homeScore) && !isNaN(awayScore);

        // If match result exists OR (has scores AND match is finished OR past kickoff time)
        if ((matchResult?.id || finishedFlag || (hasScores && kickedOff)) && hasScores) {
          // Only implement basic 1X2 resolution here
          if ((betType || '').toLowerCase().includes('1x2') || (betType || '').toLowerCase().includes('match') || true) {
            // Support selection types: '1','2','X', or team names.
            const sel = String(selection || '').toUpperCase();
            const homeNorm = String(homeName || rawMatch?.home_team || rawMatch?.homeTeam || rawMatch?.home || '')
              .toLowerCase();
            const awayNorm = String(awayName || rawMatch?.away_team || rawMatch?.awayTeam || rawMatch?.away || '')
              .toLowerCase();

            let result = 'lost'; // default to lost
            if (sel === '1' || sel === 'HOME' || sel === homeNorm.toUpperCase()) {
              result = homeScore > awayScore ? 'won' : (homeScore === awayScore ? (sel === 'X' ? 'won' : 'lost') : 'lost');
            } else if (sel === '2' || sel === 'AWAY' || sel === awayNorm.toUpperCase()) {
              result = awayScore > homeScore ? 'won' : (homeScore === awayScore ? (sel === 'X' ? 'won' : 'lost') : 'lost');
            } else if (sel === 'X' || sel === 'DRAW') {
              result = homeScore === awayScore ? 'won' : 'lost';
            } else {
              // fallback: if scores present and no match for selection, mark lost
              result = 'lost';
            }
            
            console.log(`[BET RESOLUTION] Bet ${sel} vs ${homeScore}-${awayScore} = ${result}`);
            return result;
          }
        }

        return currentStatus;
      };

      const transformed = {
        type: bet.bet_type || bet.type || 'Unknown',
        homeTeam,
        awayTeam,
        kickoffTime,
        selection: bet.selection || bet.outcome || 'Unknown',
        odds: Number(bet.odds) || 0,
        stake: Number(bet.amount ?? bet.stake) || 0,  // Map "amount" column to "stake" in display
        status: bet.status || 'pending',
        potentialWinnings: Number(bet.potential_win ?? bet.potentialWinnings) || (Number(bet.amount ?? bet.stake) * Number(bet.odds || 0)),  // Map "potential_win" column
        // include original DB row so UI can inspect raw payloads for debugging
        __raw: bet,
      } as any;

      // Derive status from match data when possible
      try {
        // augment selection into normalized form for resolution
        const normalizedSelection = ((): string => {
          const s = String(transformed.selection || '').trim();
          if (!s) return '';
          // common variants
          if (/^(1|home|h|home_team|homeTeam)$/i.test(s)) return '1';
          if (/^(2|away|a|away_team|awayTeam)$/i.test(s)) return '2';
          if (/^(x|draw|d|tie|n|drawn)$/i.test(s)) return 'X';
          return s;
        })();

        // Get match result data from our fetched map or from bet.match_results if available
        const matchResult = matchResultsMap[bet.match_id] 
          || (bet.match_results && Array.isArray(bet.match_results) && bet.match_results.length > 0 
            ? bet.match_results[0] 
            : null);

        const resolved = tryResolveStatusFromMatch(
          transformed.status, 
          rawMatch, 
          transformed.type, 
          normalizedSelection, 
          transformed.homeTeam, 
          transformed.awayTeam,
          matchResult
        );
        if (resolved && resolved !== transformed.status) {
          transformed.status = resolved;
          console.log(`[STATUS UPDATE] Bet ${bet.id}: ${transformed.status} -> ${resolved}`);
        }
      } catch (e) {
        // ignore resolution errors
        console.error('Error resolving bet status:', e);
      }

      console.log("Transformed bet:", transformed);
      return transformed;
    });

    console.log("✓ All transformed bets:", transformedBets);
    return { data: transformedBets, error: null };
  } catch (err) {
    console.error("❌ Unexpected error in getBetsFromSupabase:", err);
    return { data: null, error: err };
  }
};

// Cancel a bet and refund the stake (charge back) to the user's balance.
export const cancelBet = async (userId: string, betId: string) => {
  try {
    // fetch the bet row and ensure it belongs to the user
    const { data: betRows, error: betErr } = await supabase.from('bets').select('*').eq('id', betId).limit(1).single();
    if (betErr) {
      console.error('Error fetching bet for cancel:', betErr);
      return { error: betErr };
    }

    const betRow: any = betRows;
    if (!betRow) {
      return { error: new Error('Bet not found') };
    }
    if (String(betRow.user_id) !== String(userId)) {
      return { error: new Error('Not authorized to cancel this bet') };
    }

    // Determine stake amount from multiple possible column names
    const stake = Number(betRow.stake ?? betRow.amount ?? betRow.stake_amount ?? 0) || 0;

    // Don't cancel if already settled (won/lost)
    const status = (betRow.status || '').toString().toLowerCase();
    if (status === 'won' || status === 'lost') {
      return { error: new Error('Cannot cancel a settled bet') };
    }

    // Update bet status to cancelled/refunded
    const newStatus = 'cancelled';
    const { error: updateErr } = await supabase.from('bets').update({ status: newStatus }).eq('id', betId).eq('user_id', userId);
    if (updateErr) {
      console.error('Error updating bet status during cancel:', updateErr);
      return { error: updateErr };
    }

    // Credit user balance
    const { data: userRow, error: userErr } = await supabase.from('users').select('balance').eq('id', userId).single();
    if (userErr) {
      console.error('Error fetching user balance for refund:', userErr);
      return { error: userErr };
    }

    const currentBalance = Number(userRow?.balance ?? 0) || 0;
    const newBalance = currentBalance + stake;

    const { error: balanceErr } = await supabase.from('users').update({ balance: newBalance }).eq('id', userId);
    if (balanceErr) {
      console.error('Error updating user balance for refund:', balanceErr);
      return { error: balanceErr };
    }

    // Create notification
    try {
      await supabase.from('notifications').insert([{
        user_id: userId,
        type: 'bet_cancelled',
        title: 'Bet Cancelled — Refund Issued',
        message: `Your bet (ID: ${betId}) was cancelled and KES ${stake} has been refunded to your balance.`,
        read: false,
      }]);
    } catch (e) {
      // non-fatal
      console.warn('Could not insert cancellation notification', e);
    }

    return { error: null };
  } catch (e) {
    console.error('Exception in cancelBet:', e);
    return { error: e };
  }
};

// Subscribe to match updates. Handler receives the realtime payload.
export const subscribeToMatchUpdates = (handler: (payload: any) => void) => {
  try {
    const chan = supabase
      .channel('public:matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
        try {
          handler(payload);
        } catch (e) {
          console.warn('Handler error in subscribeToMatchUpdates', e);
        }
      })
      .subscribe();

    return () => {
      try {
        chan.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  } catch (e) {
    console.error('Error creating subscription for match updates', e);
    return () => {};
  }
};

// Diagnostic function to check if bets exist in database
export const debugBetsInDatabase = async (userId: string) => {
  try {
    console.log("🔍 [DEBUG] Checking bets in database for user:", userId);
    
    // Raw query - no joins
    const { data: rawBets, error } = await supabase
      .from("bets")
      .select("id, user_id, match_id, amount, selection, odds, status, created_at")
      .eq("user_id", userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("❌ [DEBUG] Error querying bets:", error);
      return { count: 0, bets: [], error };
    }
    
    console.log(`✓ [DEBUG] Found ${rawBets?.length || 0} bets in database:`, rawBets);
    return { count: rawBets?.length || 0, bets: rawBets || [], error: null };
  } catch (e) {
    console.error('❌ [DEBUG] Exception in debugBetsInDatabase:', e);
    return { count: 0, bets: [], error: e };
  }
};

/**
 * Force-resolve bets that have been pending for too long (90+ seconds)
 * This is a safety mechanism to prevent bets from being stuck indefinitely
 */
export const forceResolveStaleBets = async (matchId: string) => {
  try {
    console.log(`\n⏱️  [BET TIMEOUT] =====================`);
    console.log(`⏱️  [BET TIMEOUT] Checking for stale bets (pending > 95 seconds)`);
    console.log(`⏱️  [BET TIMEOUT] Match ID: ${matchId}`);
    console.log(`⏱️  [BET TIMEOUT] Timestamp: ${new Date().toISOString()}`);
    console.log(`⏱️  [BET TIMEOUT] =====================\n`);
    
    // Get pending bets for this match
    const { data: staleBets, error: fetchError } = await supabase
      .from('bets')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'pending');
    
    if (fetchError) {
      console.error(`❌ [BET TIMEOUT] Error fetching bets: ${fetchError.message}`);
      return { found: 0, forced: 0, error: fetchError };
    }
    
    if (!staleBets || staleBets.length === 0) {
      console.log(`ℹ️  [BET TIMEOUT] No pending bets found for match ${matchId}`);
      return { found: 0, forced: 0, error: null };
    }
    
    const now = new Date();
    const ninetyFiveSecondsAgo = new Date(now.getTime() - 95000);
    
    // Filter bets that have been pending for more than 95 seconds
    const staleList = staleBets.filter(bet => {
      const createdAt = new Date(bet.created_at || bet.created_at);
      return createdAt < ninetyFiveSecondsAgo;
    });
    
    if (staleList.length === 0) {
      console.log(`ℹ️  [BET TIMEOUT] ${staleBets.length} pending bets found, but none older than 95 seconds`);
      return { found: staleBets.length, forced: 0, error: null };
    }
    
    console.log(`⚠️  [BET TIMEOUT] Found ${staleList.length} STALE bets (pending 95+ seconds)`);
    console.log(`⚠️  [BET TIMEOUT] Bet IDs: ${staleList.map(b => b.id).join(', ')}`);
    
    // Get the latest match_results to determine actual outcome
    const { data: matchResult } = await supabase
      .from('match_results')
      .select('*')
      .eq('match_id', matchId)
      .single();
    
    if (!matchResult) {
      console.error(`❌ [BET TIMEOUT] No match_results found for ${matchId}. Cannot force resolve without score.`);
      return { found: staleList.length, forced: 0, error: new Error('No match results') };
    }
    
    const homeGoals = matchResult.home_goals || 0;
    const awayGoals = matchResult.away_goals || 0;
    
    console.log(`⏱️  [BET TIMEOUT] Using stored score: ${homeGoals}-${awayGoals}`);
    
    // Force resolve each stale bet
    let forceResolvedCount = 0;
    for (const bet of staleList) {
      try {
        let betResult: 'won' | 'lost' = 'lost';
        const selection = String(bet.selection || '').toUpperCase().trim();
        
        if (selection === '1' || selection === 'HOME') {
          betResult = homeGoals > awayGoals ? 'won' : 'lost';
        } else if (selection === '2' || selection === 'AWAY') {
          betResult = awayGoals > homeGoals ? 'won' : 'lost';
        } else if (selection === 'X' || selection === 'DRAW') {
          betResult = homeGoals === awayGoals ? 'won' : 'lost';
        } else if (selection === 'OV1.5' || selection === 'OVER 1.5') {
          betResult = (homeGoals + awayGoals) > 1.5 ? 'won' : 'lost';
        } else if (selection === 'UN1.5' || selection === 'UNDER 1.5') {
          betResult = (homeGoals + awayGoals) < 1.5 ? 'won' : 'lost';
        } else if (selection === 'OV2.5' || selection === 'OVER 2.5') {
          betResult = (homeGoals + awayGoals) > 2.5 ? 'won' : 'lost';
        } else if (selection === 'UN2.5' || selection === 'UNDER 2.5') {
          betResult = (homeGoals + awayGoals) < 2.5 ? 'won' : 'lost';
        } else if (selection === 'BTTS' || selection === 'BTTS YES') {
          betResult = (homeGoals > 0 && awayGoals > 0) ? 'won' : 'lost';
        }
        
        console.log(`⏱️  [BET TIMEOUT] Force resolving bet ${bet.id}: "${selection}" → ${betResult}`);
        
        const { error: updateError } = await supabase
          .from('bets')
          .update({ 
            status: betResult,
            updated_at: new Date().toISOString()
          })
          .eq('id', bet.id);
        
        if (updateError) {
          console.error(`❌ [BET TIMEOUT] Failed to force resolve bet ${bet.id}: ${updateError.message}`);
          continue;
        }
        
        // If bet won, credit user balance
        if (betResult === 'won') {
          const winnings = bet.amount * bet.odds;
          const { data: userData } = await supabase
            .from('users')
            .select('balance')
            .eq('id', bet.user_id)
            .single();
          
          const currentBalance = Number(userData?.balance || 0);
          const newBalance = currentBalance + winnings;
          
          await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', bet.user_id);
          
          console.log(`✅ [BET TIMEOUT] Bet ${bet.id} force resolved to WON. User balance: +${winnings}`);
        } else {
          console.log(`✅ [BET TIMEOUT] Bet ${bet.id} force resolved to LOST`);
        }
        
        forceResolvedCount++;
      } catch (err) {
        console.error(`❌ [BET TIMEOUT] Exception force resolving bet ${bet.id}:`, err instanceof Error ? err.message : String(err));
      }
    }
    
    console.log(`\n⏱️  [BET TIMEOUT] COMPLETE: ${forceResolvedCount}/${staleList.length} stale bets force resolved\n`);
    return { found: staleList.length, forced: forceResolvedCount, error: null };
  } catch (err) {
    console.error(`❌ [BET TIMEOUT] EXCEPTION in forceResolveStaleBets:`, err instanceof Error ? err.message : String(err));
    return { found: 0, forced: 0, error: err };
  }
};

// Automatically resolve all pending bets for a specific match after results are saved
export const resolveBetsForMatch = async (matchId: string, homeGoals: number, awayGoals: number) => {
  try {
    console.log(`\n⚽ [BET RESOLUTION] =====================`);
    console.log(`⚽ [BET RESOLUTION] START: Resolving match ${matchId}: ${homeGoals}-${awayGoals}`);
    console.log(`⚽ [BET RESOLUTION] Timestamp: ${new Date().toISOString()}`);
    console.log(`⚽ [BET RESOLUTION] =====================\n`);
    
    // Fetch all PENDING bets for this match
    console.log(`⚽ [BET RESOLUTION] Querying bets where match_id='${matchId}' AND status='pending'`);
    const { data: pendingBets, error: fetchError } = await supabase
      .from('bets')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'pending');
    
    console.log(`⚽ [BET RESOLUTION] Query completed at ${new Date().toISOString()}`);
    
    if (fetchError) {
      console.error(`❌ [BET RESOLUTION] DATABASE ERROR fetching bets for match ${matchId}`);
      console.error(`❌ [BET RESOLUTION] Error message: ${fetchError.message}`);
      console.error(`❌ [BET RESOLUTION] Error code: ${fetchError.code}`);
      return { resolved: 0, error: fetchError };
    }
    
    if (!pendingBets || pendingBets.length === 0) {
      console.log(`ℹ️ [BET RESOLUTION] No pending bets found for match ${matchId}`);
      console.log(`ℹ️ [BET RESOLUTION] Possible reasons: No bets placed, All resolved already, or Wrong match_id`);
      return { resolved: 0, error: null };
    }
    
    console.log(`📊 [BET RESOLUTION] Found ${pendingBets.length} pending bets to resolve`);
    console.log(`📊 [BET RESOLUTION] Bet IDs: ${pendingBets.map(b => b.id).join(', ')}`);
    
    let resolvedCount = 0;
    
    // Process each bet
    for (const bet of pendingBets) {
      try {
        // Determine result based on selection
        let betResult: 'won' | 'lost' = 'lost';
        const selection = String(bet.selection || '').toUpperCase().trim();
        
        if (selection === '1' || selection === 'HOME') {
          // Home win bet
          betResult = homeGoals > awayGoals ? 'won' : 'lost';
        } else if (selection === '2' || selection === 'AWAY') {
          // Away win bet
          betResult = awayGoals > homeGoals ? 'won' : 'lost';
        } else if (selection === 'X' || selection === 'DRAW') {
          // Draw bet
          betResult = homeGoals === awayGoals ? 'won' : 'lost';
        } else if (selection === 'OV1.5' || selection === 'OVER 1.5') {
          // Over 1.5 goals
          betResult = (homeGoals + awayGoals) > 1.5 ? 'won' : 'lost';
        } else if (selection === 'UN1.5' || selection === 'UNDER 1.5') {
          // Under 1.5 goals
          betResult = (homeGoals + awayGoals) < 1.5 ? 'won' : 'lost';
        } else if (selection === 'OV2.5' || selection === 'OVER 2.5') {
          // Over 2.5 goals
          betResult = (homeGoals + awayGoals) > 2.5 ? 'won' : 'lost';
        } else if (selection === 'UN2.5' || selection === 'UNDER 2.5') {
          // Under 2.5 goals
          betResult = (homeGoals + awayGoals) < 2.5 ? 'won' : 'lost';
        } else if (selection === 'BTTS' || selection === 'BTTS YES') {
          // Both teams to score
          betResult = (homeGoals > 0 && awayGoals > 0) ? 'won' : 'lost';
        }
        
        console.log(`\n💾 [BET RESOLUTION] Processing Bet ${bet.id}:`);
        console.log(`💾 [BET RESOLUTION]   Selection: "${selection}"`);
        console.log(`💾 [BET RESOLUTION]   Score: ${homeGoals}-${awayGoals}`);
        console.log(`💾 [BET RESOLUTION]   Result: ${betResult}`);
        
        // Update bet status in database
        console.log(`💾 [BET RESOLUTION] Updating bet ${bet.id}: 'pending' → '${betResult}'`);
        const { error: updateError } = await supabase
          .from('bets')
          .update({ 
            status: betResult,
            updated_at: new Date().toISOString()
          })
          .eq('id', bet.id);
        
        if (updateError) {
          console.error(`❌ [BET RESOLUTION] FAILED to update bet ${bet.id}`);
          console.error(`❌ [BET RESOLUTION] Error: ${updateError.message}`);
          console.error(`❌ [BET RESOLUTION] Code: ${updateError.code}`);
          continue;
        }
        
        console.log(`✅ [BET RESOLUTION] Bet ${bet.id} updated to '${betResult}'`);
        
        // If bet WON, credit user balance
        if (betResult === 'won') {
          const winnings = bet.amount * bet.odds;
          
          // Get current user balance
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('balance')
            .eq('id', bet.user_id)
            .single();
          
          if (userError) {
            console.error(`❌ [BET RESOLUTION] Error fetching user balance for ${bet.user_id}:`, userError);
            continue;
          }
          
          const currentBalance = Number(userData?.balance || 0);
          const newBalance = currentBalance + winnings;
          
          // Update user balance
          const { error: balanceError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', bet.user_id);
          
          if (balanceError) {
            console.error(`❌ [BET RESOLUTION] Error updating balance for ${bet.user_id}:`, balanceError);
            continue;
          }
          
          console.log(`💰 [BET RESOLUTION] User ${bet.user_id} won KES ${winnings}. Balance: ${currentBalance} -> ${newBalance}`);
        }
        
        // Create outcome notification
        try {
          const matchInfo = bet.match ? (typeof bet.match === 'string' ? JSON.parse(bet.match) : bet.match) : {};
          const homeTeam = matchInfo?.homeTeam?.shortName || 'Home';
          const awayTeam = matchInfo?.awayTeam?.shortName || 'Away';
          
          let notifTitle = '';
          let notifMessage = '';
          
          if (betResult === 'won') {
            const winnings = (bet.amount * bet.odds).toFixed(2);
            notifTitle = '🎉 Bet Won!';
            notifMessage = `Your bet on ${homeTeam} vs ${awayTeam} won! You won KES ${winnings}`;
          } else {
            notifTitle = '❌ Bet Lost';
            notifMessage = `Your bet on ${homeTeam} vs ${awayTeam} lost. Stake: KES ${bet.amount}`;
          }
          
          await supabase.from('notifications').insert([{
            user_id: bet.user_id,
            type: 'bet_outcome',
            title: notifTitle,
            message: notifMessage,
            read: false,
          }]);
        } catch (notifError) {
          console.warn(`⚠️ [BET RESOLUTION] Could not create notification for bet ${bet.id}:`, notifError);
        }
        
        resolvedCount++;
        
      } catch (betError) {
        console.error(`❌ [BET RESOLUTION] Exception processing bet ${bet.id}:`, betError);
        continue;
      }
    }
    
    console.log(`\n✅ [BET RESOLUTION] =====================`);
    console.log(`✅ [BET RESOLUTION] COMPLETED: ${resolvedCount}/${pendingBets.length} bets resolved`);
    console.log(`✅ [BET RESOLUTION] Match: ${matchId} | Score: ${homeGoals}-${awayGoals}`);
    console.log(`✅ [BET RESOLUTION] Time: ${new Date().toISOString()}`);
    console.log(`✅ [BET RESOLUTION] =====================\n`);
    return { resolved: resolvedCount, error: null };
    
  } catch (err) {
    console.error(`\n❌ [BET RESOLUTION] =====================`);
    console.error(`❌ [BET RESOLUTION] EXCEPTION in resolveBetsForMatch`);
    console.error(`❌ [BET RESOLUTION] Error: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`❌ [BET RESOLUTION] Type: ${err instanceof Error ? err.name : typeof err}`);
    if (err instanceof Error && err.stack) {
      console.error(`❌ [BET RESOLUTION] Stack: ${err.stack}`);
    }
    console.error(`❌ [BET RESOLUTION] Time: ${new Date().toISOString()}`);
    console.error(`❌ [BET RESOLUTION] =====================\n`);
    return { resolved: 0, error: err };
  }
};

