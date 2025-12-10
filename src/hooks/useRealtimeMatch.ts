import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SystemState {
  id: string;
  current_week: number;
  current_timeframe_idx: number;
  match_state: 'pre-countdown' | 'countdown' | 'playing' | 'betting' | 'next-countdown';
  countdown: number;
  match_timer: number;
  betting_timer: number;
  last_updated: string;
}

export interface MatchResult {
  id: string;
  match_id: string;
  home_goals: number;
  away_goals: number;
  winner: 'home' | 'away' | 'draw' | null;
  is_final: boolean;
  updated_at: string;
}

/**
 * Hook to subscribe to global betting system state
 * All users see the exact same match progress, timers, and state
 */
export function useSystemState() {
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial state
    const fetchInitialState = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_system_state');

        if (error) throw error;

        setSystemState(data);
      } catch (error) {
        console.error('Failed to fetch system state:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialState();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('betting-system-state')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'betting_system_state',
        },
        (payload: any) => {
          console.log('[System State Update]', payload.new);
          setSystemState(payload.new);
          setIsConnected(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    systemState,
    isConnected,
    loading,
  };
}

/**
 * Hook to subscribe to match results
 * Gets real-time updates when match scores change or match finishes
 */
export function useMatchResults(matchIds: string[] = []) {
  const [results, setResults] = useState<Map<string, MatchResult>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchIds || matchIds.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch initial results
    const fetchInitialResults = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('match_results')
          .select('*')
          .in('match_id', matchIds);

        if (error) throw error;

        const resultsMap = new Map<string, MatchResult>();
        data?.forEach((result) => {
          resultsMap.set(result.match_id, result);
        });
        setResults(resultsMap);
      } catch (error) {
        console.error('Failed to fetch match results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialResults();

    // Subscribe to realtime updates for match results
    const channel = supabase
      .channel('match-results')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_results',
          filter: `match_id=in.(${matchIds.join(',')})`,
        },
        (payload: any) => {
          console.log('[Match Result Update]', payload.new);
          setResults((prev) => {
            const updated = new Map(prev);
            updated.set(payload.new.match_id, payload.new);
            return updated;
          });
          setIsConnected(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchIds]);

  return {
    results,
    isConnected,
    loading,
    getResult: (matchId: string) => results.get(matchId),
  };
}

/**
 * Hook to subscribe to all bets for current user
 * Shows real-time bet status updates (pending, won, lost)
 */
export function useUserBets(userId: string) {
  const [bets, setBets] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Fetch initial bets
    const fetchInitialBets = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('bets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setBets(data || []);
      } catch (error) {
        console.error('Failed to fetch user bets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialBets();

    // Subscribe to realtime updates for user bets
    const channel = supabase
      .channel(`user-bets:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bets',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('[Bet Update]', payload);
          
          if (payload.eventType === 'DELETE') {
            setBets((prev) => prev.filter((b) => b.id !== payload.old.id));
          } else {
            setBets((prev) => {
              const updated = prev.filter((b) => b.id !== payload.new.id);
              return [payload.new, ...updated];
            });
          }
          setIsConnected(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    bets,
    isConnected,
    loading,
  };
}

/**
 * Comprehensive hook that combines all three for a complete sync
 */
export function useRealtimeMatch(matchIds: string[], userId: string) {
  const { systemState, isConnected: stateConnected } = useSystemState();
  const { results, isConnected: resultsConnected } = useMatchResults(matchIds);
  const { bets, isConnected: betsConnected } = useUserBets(userId);

  return {
    systemState,
    matchResults: results,
    userBets: bets,
    isConnected: stateConnected && resultsConnected && betsConnected,
  };
}
