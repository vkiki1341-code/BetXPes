/**
 * Global Time Match Display Wrapper
 * Shows the current global time match instead of week-based system
 * Can be used as a drop-in replacement for the main betting display
 */

import React, { useEffect, useState } from 'react';
import { GlobalMatchList } from '@/components/GlobalMatchList';
import { MatchPredictor } from '@/components/MatchPredictor';
import { ensureGlobalTimeSystemActive } from '@/lib/bettingSystemInitializer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Clock, Zap } from 'lucide-react';

interface GlobalTimeBettingWrapperProps {
  showPredictor?: boolean;
  fullPage?: boolean;
}

export const GlobalTimeBettingWrapper: React.FC<GlobalTimeBettingWrapperProps> = ({
  showPredictor = true,
  fullPage = false,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Ensure global time system is active
      ensureGlobalTimeSystemActive();
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize global time system');
      setIsReady(true);
    }
  }, []);

  if (error) {
    return (
      <Card className="border-red-300 bg-red-50 m-4">
        <CardContent className="pt-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">System Error</p>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing global time betting system...</p>
        </div>
      </div>
    );
  }

  if (fullPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Header */}
          <Card className="border-blue-500 bg-gradient-to-r from-blue-900 to-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-100">
                <Zap className="w-6 h-6" />
                Global Live Betting
              </CardTitle>
              <CardDescription className="text-blue-200">
                Real-time matches synchronized globally
              </CardDescription>
            </CardHeader>
          </Card>

          <Tabs defaultValue="live" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="live">Live Now</TabsTrigger>
              {showPredictor && <TabsTrigger value="predict">Predict Match</TabsTrigger>}
            </TabsList>

            <TabsContent value="live">
              <GlobalMatchList showUpcoming={true} maxUpcoming={5} />
            </TabsContent>

            {showPredictor && (
              <TabsContent value="predict">
                <MatchPredictor />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    );
  }

  // Default: return just the match list component
  return <GlobalMatchList showUpcoming={true} maxUpcoming={5} />;
};

export default GlobalTimeBettingWrapper;
