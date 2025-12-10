import { useEffect, useState } from 'react';
import { getFixtureOutcome, subscribeToFixtureOutcome } from '@/lib/fixtureOutcomes';

export interface FixtureResult {
  home_goals: number;
  away_goals: number;
  result: string;
}

/**
 * Hook to fetch and subscribe to fixture outcomes
 * Returns the outcome if it exists, null otherwise
 */
export function useFixtureOutcome(matchId: string) {
  const [outcome, setOutcome] = useState<FixtureResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Fetch initial outcome
    getFixtureOutcome(matchId)
      .then((data) => {
        if (data) {
          setOutcome({
            home_goals: data.home_goals,
            away_goals: data.away_goals,
            result: data.result,
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching fixture outcome:', err);
        setError(err.message);
        setLoading(false);
      });

    // Subscribe to real-time updates
    const subscription = subscribeToFixtureOutcome(matchId, (newOutcome) => {
      if (newOutcome) {
        console.log('📡 Fixture outcome updated:', matchId, newOutcome);
        setOutcome({
          home_goals: newOutcome.home_goals,
          away_goals: newOutcome.away_goals,
          result: newOutcome.result,
        });
      }
    });

    return () => {
      // Cleanup subscription
      if (subscription) {
        subscription.unsubscribe().catch((err) => console.error('Error unsubscribing:', err));
      }
    };
  }, [matchId]);

  return { outcome, loading, error };
}
