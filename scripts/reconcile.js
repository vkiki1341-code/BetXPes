import { createClient } from '@supabase/supabase-js';

// Reconciliation worker. Run with:
// SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/reconcile.js

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Try to extract scores from many possible fields
function extractScores(rawMatch) {
  if (!rawMatch) return null;
  const homeScore = Number(rawMatch.home_score ?? rawMatch.homeScore ?? rawMatch.homeGoals ?? rawMatch.home_goals ?? rawMatch.scores?.home ?? rawMatch.score?.home ?? rawMatch.result?.home ?? rawMatch.result?.home_score);
  const awayScore = Number(rawMatch.away_score ?? rawMatch.awayScore ?? rawMatch.awayGoals ?? rawMatch.away_goals ?? rawMatch.scores?.away ?? rawMatch.score?.away ?? rawMatch.result?.away ?? rawMatch.result?.away_score);
  const finishedFlag = (rawMatch.status && String(rawMatch.status).toLowerCase().includes('ft')) || rawMatch.finished === true || rawMatch.match_finished === true || rawMatch.is_finished === true;
  return { homeScore: isNaN(homeScore) ? null : homeScore, awayScore: isNaN(awayScore) ? null : awayScore, finishedFlag };
}

function resolveBetOutcome(bet, rawMatch) {
  const stake = Number(bet.stake ?? bet.amount ?? 0) || 0;
  const odds = Number(bet.odds ?? 0) || 0;
  const potential = Number(bet.potential_win ?? bet.potentialWinnings ?? bet.potentialWinnings ?? (stake * odds)) || (stake * odds);

  const selection = String(bet.selection || bet.outcome || '').trim();

  const { homeScore, awayScore, finishedFlag } = extractScores(rawMatch) || {};
  if (!finishedFlag && homeScore == null && awayScore == null) return null;

  if (homeScore == null || awayScore == null) {
    // if finished flag but no scores, treat as void/push
    return { result: 'void', stake, payout: stake };
  }

  const sel = (selection || '').toUpperCase();
  const homeName = (rawMatch.home_team || rawMatch.homeTeam || rawMatch.home || '').toString().toLowerCase();
  const awayName = (rawMatch.away_team || rawMatch.awayTeam || rawMatch.away || '').toString().toLowerCase();

  // 1X2 logic
  if (sel === '1' || /HOME/i.test(sel) || sel === homeName.toUpperCase()) {
    if (homeScore > awayScore) return { result: 'won', payout: potential };
    if (homeScore === awayScore) return { result: 'lost' };
    return { result: 'lost' };
  }
  if (sel === '2' || /AWAY/i.test(sel) || sel === awayName.toUpperCase()) {
    if (awayScore > homeScore) return { result: 'won', payout: potential };
    if (homeScore === awayScore) return { result: 'lost' };
    return { result: 'lost' };
  }
  if (sel === 'X' || /DRAW/i.test(sel)) {
    if (homeScore === awayScore) return { result: 'won', payout: potential };
    return { result: 'lost' };
  }

  // Fallback: if scores present but selection unknown, mark lost
  return { result: 'lost' };
}

async function reconcileOnce() {
  console.log(new Date().toISOString(), 'Starting reconciliation pass');

  // fetch pending bets joined with matches
  const { data: pendingBets, error } = await supabase.from('bets').select('*, matches(*)').eq('status', 'pending').limit(1000);
  if (error) {
    console.error('Error fetching pending bets:', error);
    return;
  }
  if (!pendingBets || pendingBets.length === 0) {
    console.log('No pending bets found');
    return;
  }

  for (const bet of pendingBets) {
    try {
      // find match payload
      let rawMatch = null;
      if (bet.matches && bet.matches.raw) rawMatch = bet.matches.raw;
      else if (bet.match) rawMatch = typeof bet.match === 'string' ? JSON.parse(bet.match) : bet.match;
      else if (bet.raw && bet.raw.match) rawMatch = bet.raw.match;

      const resolved = resolveBetOutcome(bet, rawMatch);
      if (!resolved) continue; // nothing to do

      if (resolved.result === 'won' || resolved.result === 'lost' || resolved.result === 'void' || resolved.result === 'push') {
        // Prefer DB-side atomic function if available
        try {
          const payout = Number(resolved.payout ?? 0) || 0;
          const rpcRes = await supabase.rpc('apply_bet_result', { bet_uuid: bet.id, result: resolved.result, payout });
          if (rpcRes.error) {
            console.warn('RPC apply_bet_result failed, falling back to client-side updates', rpcRes.error);
            throw rpcRes.error;
          }
          // create notification (function does audit + balance update)
          if (resolved.result === 'won') {
            await supabase.from('notifications').insert([{ user_id: bet.user_id, type: 'bet_outcome', title: 'Bet Won', message: `Your bet ${bet.id} won. KES ${Number(resolved.payout).toLocaleString()} credited.`, read: false }]);
          } else if (resolved.result === 'lost') {
            await supabase.from('notifications').insert([{ user_id: bet.user_id, type: 'bet_outcome', title: 'Bet Lost', message: `Your bet ${bet.id} lost. Stake KES ${Number(bet.stake ?? bet.amount ?? 0).toLocaleString()} was not returned.`, read: false }]);
          } else if (resolved.result === 'void' || resolved.result === 'push') {
            const stake = Number(bet.stake ?? bet.amount ?? 0) || 0;
            await supabase.from('notifications').insert([{ user_id: bet.user_id, type: 'bet_outcome', title: 'Bet Voided', message: `Your bet ${bet.id} was voided. KES ${stake} refunded.`, read: false }]);
          }
          console.log('Resolved bet via RPC', resolved.result, bet.id);
        } catch (rpcErr) {
          // Fallback to previous non-atomic approach if RPC not available
          console.warn('Falling back to non-atomic reconciliation for bet', bet.id, rpcErr);
          if (resolved.result === 'won') {
            const { error: uErr } = await supabase.from('bets').update({ status: 'won' }).eq('id', bet.id);
            if (uErr) { console.error('Error updating bet to won', bet.id, uErr); continue; }
            const { data: userRow, error: userErr } = await supabase.from('users').select('balance').eq('id', bet.user_id).single();
            if (userErr) { console.error('Error fetching user balance for payout', userErr); continue; }
            const currentBalance = Number(userRow?.balance ?? 0);
            const newBalance = currentBalance + (Number(resolved.payout) || 0);
            const { error: balErr } = await supabase.from('users').update({ balance: newBalance }).eq('id', bet.user_id);
            if (balErr) { console.error('Error updating user balance for payout', balErr); }
            await supabase.from('notifications').insert([{ user_id: bet.user_id, type: 'bet_outcome', title: 'Bet Won', message: `Your bet ${bet.id} won. KES ${Number(resolved.payout).toLocaleString()} credited.`, read: false }]);
          } else if (resolved.result === 'lost') {
            const { error: uErr } = await supabase.from('bets').update({ status: 'lost' }).eq('id', bet.id);
            if (uErr) { console.error('Error updating bet to lost', bet.id, uErr); continue; }
            await supabase.from('notifications').insert([{ user_id: bet.user_id, type: 'bet_outcome', title: 'Bet Lost', message: `Your bet ${bet.id} lost. Stake KES ${Number(bet.stake ?? bet.amount ?? 0).toLocaleString()} was not returned.`, read: false }]);
          } else if (resolved.result === 'void' || resolved.result === 'push') {
            const stake = Number(bet.stake ?? bet.amount ?? 0) || 0;
            const { error: uErr } = await supabase.from('bets').update({ status: 'void' }).eq('id', bet.id);
            if (uErr) { console.error('Error updating bet to void', bet.id, uErr); continue; }
            const { data: userRow, error: userErr } = await supabase.from('users').select('balance').eq('id', bet.user_id).single();
            if (userErr) { console.error('Error fetching user balance for refund', userErr); continue; }
            const currentBalance = Number(userRow?.balance ?? 0);
            const { error: balErr } = await supabase.from('users').update({ balance: currentBalance + stake }).eq('id', bet.user_id);
            if (balErr) { console.error('Error updating user balance for refund', balErr); }
            await supabase.from('notifications').insert([{ user_id: bet.user_id, type: 'bet_outcome', title: 'Bet Voided', message: `Your bet ${bet.id} was voided. KES ${stake} refunded.`, read: false }]);
          }
        }
      }

      // small pause to avoid hammering
      await sleep(50);
    } catch (e) {
      console.error('Error processing bet in reconciliation', e);
    }
  }
}

async function main() {
  // Default: run once. You can call repeatedly via cron or run in loop.
  // To run continuously, set CONTINUOUS=true (not recommended in serverless environments).
  const continuous = process.env.CONTINUOUS === 'true';
  if (continuous) {
    while (true) {
      try { await reconcileOnce(); } catch (e) { console.error('Reconcile pass error', e); }
      await sleep(30 * 1000); // 30s
    }
  } else {
    await reconcileOnce();
  }
}

main().then(() => {
  console.log('Reconciliation finished');
  process.exit(0);
}).catch((e) => {
  console.error('Fatal error in reconcile script', e);
  process.exit(1);
});
