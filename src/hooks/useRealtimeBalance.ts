import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UseRealtimeBalanceOptions {
  userId: string;
  onBalanceChange?: (newBalance: number, oldBalance: number) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to subscribe to real-time balance updates for a user
 * Uses Supabase Realtime to keep balance synchronized across all tabs/instances
 */
export function useRealtimeBalance({
  userId,
  onBalanceChange,
  onError,
}: UseRealtimeBalanceOptions) {
  const [balance, setBalance] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch initial balance
  const fetchInitialBalance = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setBalance(data?.balance || 0);
      setLoading(false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to fetch initial balance:', err);
      onError?.(err);
      setLoading(false);
    }
  }, [userId, onError]);

  // Subscribe to realtime balance updates
  useEffect(() => {
    if (!userId) return;

    // Fetch initial balance first
    fetchInitialBalance();

    // Create realtime subscription
    const channel = supabase
      .channel(`user-balance:${userId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: userId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          const oldBalance = balance;
          const newBalance = payload.new.balance;

          console.log(
            `[Balance Update] User: ${userId}, Old: ${oldBalance}, New: ${newBalance}`
          );

          setBalance(newBalance);
          setIsConnected(true);

          // Trigger callback if balance changed
          if (oldBalance !== newBalance) {
            onBalanceChange?.(newBalance, oldBalance);
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        console.log('[Realtime] Presence synced');
        setIsConnected(true);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Realtime] Presence join:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Realtime] Presence leave:', key);
      })
      .subscribe(async (status) => {
        console.log('[Realtime] Subscribe status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Confirm subscription with presence
          await channel.track({
            user_id: userId,
            timestamp: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, fetchInitialBalance, balance, onBalanceChange]);

  // Manual refresh function
  const refreshBalance = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const newBalance = data?.balance || 0;
      if (newBalance !== balance) {
        setBalance(newBalance);
        onBalanceChange?.(newBalance, balance);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to refresh balance:', err);
      onError?.(err);
    }
  }, [userId, balance, onBalanceChange, onError]);

  return {
    balance,
    isConnected,
    loading,
    refreshBalance,
  };
}

/**
 * Hook to manage multiple realtime subscriptions
 * Useful for subscribing to balance AND other user data simultaneously
 */
export function useRealtimeUserData({
  userId,
  onDataChange,
  onError,
}: {
  userId: string;
  onDataChange?: (data: any) => void;
  onError?: (error: Error) => void;
}) {
  const [userData, setUserData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;

        setUserData(data);
        setLoading(false);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to all user updates
    const channel = supabase
      .channel(`user-data:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('[User Data Update]', payload);
          setUserData(payload.new);
          setIsConnected(true);
          onDataChange?.(payload.new);
        }
      )
      .subscribe(() => {
        setIsConnected(true);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onDataChange, onError]);

  return {
    userData,
    isConnected,
    loading,
  };
}
