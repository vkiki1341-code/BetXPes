/**
 * GlobalMatchList Component
 * Displays the current match playing globally right now + upcoming matches
 * All users see the same match at the same time
 * Automatically updates as time progresses
 */

import React, { useEffect } from 'react';
import { useGlobalTimeMatches, useCountdownToNextMatch } from '@/hooks/useGlobalTimeMatches';
import { initializeGlobalMatchSystem } from '@/utils/globalTimeMatchSystem';
import MatchRow from './MatchRow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock, Zap } from 'lucide-react';

interface GlobalMatchListProps {
  onMatchSelect?: (matchId: string) => void;
  showUpcoming?: boolean;
  maxUpcoming?: number;
}

export const GlobalMatchList: React.FC<GlobalMatchListProps> = ({
  onMatchSelect,
  showUpcoming = true,
  maxUpcoming = 5,
}) => {
  // Initialize global schedule on component mount
  useEffect(() => {
    initializeGlobalMatchSystem();
  }, []);

  const matchState = useGlobalTimeMatches(1000); // Update every second
  const countdown = useCountdownToNextMatch(1000);

  const handleMatchExpired = () => {
    // This is handled automatically by the hook
    // The component will re-render with the next match
  };

  if (matchState.isLoading) {
    return (
      <div className="px-4 pb-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center text-gray-600">
              Loading global match schedule...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 space-y-4">
      {/* Global Time Info */}
      <Card className="border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Clock className="w-5 h-5" />
            Global Live Match
          </CardTitle>
          <CardDescription className="text-purple-800">
            Everyone is watching the same match right now
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-2 bg-white rounded border border-purple-200">
              <div className="text-xs text-gray-600 font-semibold">LOCAL TIME</div>
              <div className="text-lg font-bold text-purple-900 mt-1">
                {matchState.currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            </div>
            <div className="p-2 bg-white rounded border border-purple-200">
              <div className="text-xs text-gray-600 font-semibold">NEXT MATCH IN</div>
              <div className="text-lg font-bold text-purple-900 mt-1">
                {countdown.displayText}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Match - Featured */}
      {matchState.currentMatch ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Zap className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-red-600 text-sm">LIVE NOW</h3>
          </div>
          <MatchRow 
            match={matchState.currentMatch} 
            onExpired={handleMatchExpired}
          />
        </div>
      ) : (
        <Card className="border-gray-200">
          <CardContent className="pt-6 text-center text-gray-500">
            <p>No matches currently scheduled.</p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Matches */}
      {showUpcoming && matchState.upcomingMatches.length > 0 && (
        <div className="space-y-2">
          <div className="px-2 py-2">
            <h3 className="font-bold text-gray-700 text-sm">
              UPCOMING ({matchState.upcomingMatches.length})
            </h3>
            <p className="text-xs text-gray-500">
              Next match in {countdown.displayText}
            </p>
          </div>
          
          {matchState.upcomingMatches.slice(0, maxUpcoming).map((match, idx) => (
            <div key={match.id} className="opacity-75 hover:opacity-100 transition-opacity">
              <div className="text-xs px-2 py-1 text-gray-500 font-semibold">
                #{idx + 1} -{' '}
                {match.kickoffTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <MatchRow 
                match={match} 
                onExpired={handleMatchExpired}
              />
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4 pb-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">How It Works</p>
            <ul className="text-xs space-y-1 text-blue-800">
              <li>✓ New match starts every 30 minutes globally</li>
              <li>✓ All users see the same match at the same time</li>
              <li>✓ You can predict matches for any future time</li>
              <li>✓ Matches cycle through all available teams</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalMatchList;
