
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBetsFromSupabase, cancelBet, subscribeToMatchUpdates, debugBetsInDatabase, forceResolveStaleBets } from "@/lib/supabaseBets";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, Filter, TrendingUp, Award, Clock, ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BetData {
  type: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  selection: string;
  odds: number | string;
  stake: number | string;
  status: string;
  potentialWinnings?: number | string;
  __raw?: any;
}

const MyBets = () => {
  const [bets, setBets] = useState<BetData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "won" | "lost">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showRawId, setShowRawId] = useState<number | null>(null);
  const [recentlyUpdatedBets, setRecentlyUpdatedBets] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const matchIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Fetch bets once on mount. Manual refresh button provided for user control.
    const fetchBetsOnMount = async () => {
      await fetchBets();
    };
    fetchBetsOnMount();
    
    // Subscribe to bet table updates for REAL-TIME results
    console.log('📡 [REALTIME] Setting up realtime subscription to bets table');
    const betsSubscription = supabase
      .channel('public:bets')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'bets' 
        }, 
        (payload) => {
          try {
            console.log('⚡ [REALTIME] Bet updated in realtime:', payload.new);
            // When a bet is updated (status changed), refresh to show new status
            const updatedBet = payload.new;
            
            // Track this bet as recently updated for visual highlight
            setRecentlyUpdatedBets(prev => new Set([...prev, updatedBet.id]));
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
              setRecentlyUpdatedBets(prev => {
                const updated = new Set(prev);
                updated.delete(updatedBet.id);
                return updated;
              });
            }, 3000);
            
            // Update the specific bet in our list
            setBets(prevBets => 
              prevBets.map(bet => 
                bet.__raw?.id === updatedBet.id 
                  ? {
                      ...bet,
                      status: updatedBet.status,
                      // Update other fields that might have changed
                      __raw: updatedBet
                    }
                  : bet
              )
            );
            
            console.log(`✅ [REALTIME] Updated bet ${updatedBet.id} to status: ${updatedBet.status}`);
          } catch (e) {
            console.warn('⚠️ [REALTIME] Error handling bet update:', e);
          }
        }
      )
      .subscribe();
    
    // Also subscribe to match updates so we can refresh when matches finish
    const matchSubscription = supabase
      .channel('public:matches')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'matches' 
        }, 
        (payload) => {
          try {
            const record = payload?.record || payload?.new || payload?.payload?.record;
            const matchId = record?.id || record?.match_id || null;
            if (!matchId) return;
            if (matchIdsRef.current.has(String(matchId))) {
              console.log(`🔄 [REALTIME] Match ${matchId} updated, refreshing bets`);
              fetchBets();
            }
          } catch (e) {
            console.warn('⚠️ [REALTIME] Error handling match update:', e);
          }
        }
      )
      .subscribe();

    // Subscribe to match_results table updates to detect when bets should be resolved
    console.log('📡 [REALTIME] Setting up realtime subscription to match_results table');
    const matchResultsSubscription = supabase
      .channel('public:match_results')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_results'
        },
        (payload) => {
          try {
            console.log('⚡ [REALTIME] Match result updated:', payload.new);
            // When match results are finalized, refresh all bets to show results
            const result = payload.new;
            if (result?.is_final === true) {
              console.log(`🔄 [REALTIME] Match ${result.match_id} is now final, refreshing bets`);
              fetchBets();
            }
          } catch (e) {
            console.warn('⚠️ [REALTIME] Error handling match result update:', e);
          }
        }
      )
      .subscribe();

    return () => {
      try { betsSubscription.unsubscribe(); } catch (e) {}
      try { matchSubscription.unsubscribe(); } catch (e) {}
      try { matchResultsSubscription.unsubscribe(); } catch (e) {}
    };
  }, []);

  // Keep match id set in sync with bets
  useEffect(() => {
    const s = new Set<string>();
    for (const bt of bets) {
      const raw = bt.__raw || {};
      const mid = raw.match_id || raw.match?.id || raw.matchId || raw.matches?.id || raw.match_raw?.id;
      if (mid) s.add(String(mid));
    }
    matchIdsRef.current = s;
  }, [bets]);

  // SAFETY MECHANISM: Periodic check for stuck bets (every 30 seconds)
  // This is a failsafe to ensure no bets stay pending beyond 90 seconds
  useEffect(() => {
    const safetyCheckInterval = setInterval(async () => {
      try {
        // Get all pending bets on this page
        const pendingBets = bets.filter(b => b.status === 'pending');
        if (pendingBets.length === 0) {
          // No pending bets, nothing to check
          return;
        }

        console.log(`⏰ [SAFETY CHECK] Checking ${pendingBets.length} pending bets for stale timeouts...`);

        // Get all unique match IDs from pending bets
        const matchIds = new Set<string>();
        for (const bet of pendingBets) {
          const raw = bet.__raw || {};
          const matchId = raw.match_id || raw.match?.id;
          if (matchId) {
            matchIds.add(String(matchId));
          }
        }

        // Check each match for stale bets
        for (const matchId of matchIds) {
          const result = await forceResolveStaleBets(matchId);
          if (result.forced > 0) {
            console.warn(`⚠️  [SAFETY CHECK] Force-resolved ${result.forced} stuck bets in match ${matchId}`);
            // Refresh bets to show updated status
            await fetchBets();
          }
        }
      } catch (err) {
        console.error('❌ [SAFETY CHECK] Error in stuck bets check:', err instanceof Error ? err.message : String(err));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(safetyCheckInterval);
  }, [bets]);

  // central fetch function used by mount and manual refresh
  const fetchBets = async () => {
    setLoading(true);
    // safety timeout: clear loading if fetch hangs
    const timeout = setTimeout(() => {
      console.warn("⚠️ fetchBets timed out after 8s, hiding spinner");
      setLoading(false);
    }, 8000);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (userId) {
        console.log("📋 Fetching bets for user:", userId);
        
        // Debug: check raw bets in database
        const debugResult = await debugBetsInDatabase(userId);
        
        const { data, error } = await getBetsFromSupabase(userId);

        if (error) {
          console.error("❌ Error fetching bets:", error);
          setBets([]);
        } else if (data && data.length > 0) {
          console.log("✓ Bets fetched successfully, count:", data.length);
          setBets(data);
        } else {
          console.log("No bets found for user");
          setBets([]);
        }
      } else {
        console.log("No user authenticated");
        const stored = localStorage.getItem("betting_user_bets");
        setBets(stored ? JSON.parse(stored) : []);
      }

      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error("❌ Error in fetchBets:", err);
      setBets([]);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (loading) return;
    await fetchBets();
  };

  const { toast } = useToast();

  const handleCancel = async (e: any, bet: BetData) => {
    e.stopPropagation();
    if (!bet?.__raw?.id) {
      toast({ title: 'Cancellation failed', description: 'Bet id not available', action: undefined });
      return;
    }

    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        toast({ title: 'Not signed in', description: 'Please sign in to cancel bets' });
        setLoading(false);
        return;
      }

      const res = await cancelBet(userId, String(bet.__raw.id));
      if (res?.error) {
        console.error('Cancel error', res.error);
        toast({ title: 'Cancel failed', description: String(res.error?.message || res.error) });
      } else {
        toast({ title: 'Bet cancelled', description: `KES ${Number(bet.stake).toLocaleString()} refunded` });
        // refresh list
        await fetchBets();
      }
    } catch (err) {
      console.error('Exception cancelling bet', err);
      toast({ title: 'Cancel failed', description: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const filteredBets = bets.filter((bet) => {
    if (filter === "all") return true;
    return bet.status?.toLowerCase() === filter;
  });

  const stats = {
    total: bets.length,
    pending: bets.filter((b) => b.status?.toLowerCase() === "pending").length,
    won: bets.filter((b) => b.status?.toLowerCase() === "won").length,
    lost: bets.filter((b) => b.status?.toLowerCase() === "lost").length,
    totalStaked: bets.reduce((sum, b) => sum + (Number(b.stake) || 0), 0),
    potentialWinnings: bets
      .filter((b) => b.status?.toLowerCase() === "pending")
      .reduce((sum, b) => sum + (Number(b.potentialWinnings) || Number(b.odds) * Number(b.stake)), 0),
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "won":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
      case "lost":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      case "pending":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "won":
        return <Award className="w-4 h-4" />;
      case "lost":
        return <TrendingUp className="w-4 h-4 rotate-180" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-6">
      {/* Back Button */}
      <div className="mb-6">
        <Button 
          onClick={() => navigate("/betting")} 
          variant="outline" 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Betting
        </Button>
      </div>

      {/* Header with Gradient */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 rounded-lg p-6 text-white shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My Bets</h1>
          <p className="text-blue-100">Track all your bets and winnings</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <div className="text-sm text-muted-foreground mb-2">Total Bets</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1">All time</div>
        </Card>

        <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <div className="text-sm text-green-700 dark:text-green-400 mb-2">Won</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.won}</div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">Successful</div>
        </Card>

        <Card className="p-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
          <div className="text-sm text-red-700 dark:text-red-400 mb-2">Lost</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.lost}</div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">Unsuccessful</div>
        </Card>

        <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-700 dark:text-blue-400 mb-2">Pending</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pending}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">In progress</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <div className="flex-1 flex items-center gap-2">
        <Button
          onClick={() => setFilter("all")}
          variant={filter === "all" ? "default" : "outline"}
          className={filter === "all" ? "bg-blue-600 hover:bg-blue-700" : ""}
        >
          <Filter className="w-4 h-4 mr-2" />
          All Bets
        </Button>
        <Button
          onClick={() => setFilter("pending")}
          variant={filter === "pending" ? "default" : "outline"}
          className={filter === "pending" ? "bg-blue-600 hover:bg-blue-700" : ""}
        >
          Pending ({stats.pending})
        </Button>
        <Button
          onClick={() => setFilter("won")}
          variant={filter === "won" ? "default" : "outline"}
          className={filter === "won" ? "bg-green-600 hover:bg-green-700" : ""}
        >
          Won ({stats.won})
        </Button>
        <Button
          onClick={() => setFilter("lost")}
          variant={filter === "lost" ? "default" : "outline"}
          className={filter === "lost" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          Lost ({stats.lost})
        </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="text-xs text-muted-foreground ml-2">
            {lastUpdated ? `Last: ${lastUpdated}` : ''}
          </div>
        </div>
      </div>

      {/* Bets List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center space-x-2 text-muted-foreground">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading your bets...</span>
          </div>
        </div>
      ) : filteredBets.length === 0 ? (
        <Card className="p-12 text-center bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <div className="text-muted-foreground mb-2">
            {bets.length === 0 ? "You have not placed any bets yet." : `No ${filter} bets found.`}
          </div>
          <p className="text-sm text-muted-foreground">
            {bets.length === 0 ? "Visit the home page to place your first bet!" : "Try changing your filter."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBets.map((bet, idx) => {
            const betId = bet.__raw?.id;
            const isRecentlyUpdated = betId && recentlyUpdatedBets.has(betId);
            
            return (
            <Card
              key={idx}
              className={`bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all cursor-pointer overflow-hidden ${
                isRecentlyUpdated 
                  ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse' 
                  : ''
              }`}
              onClick={() => setExpandedId(expandedId === idx ? null : idx)}
            >
              {isRecentlyUpdated && (
                <div className="h-1 bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400 animate-pulse"></div>
              )}
              {/* Main Bet Row */}
              <div className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(bet.status)} border flex items-center gap-1`}
                      >
                        {getStatusIcon(bet.status)}
                        <span className="capitalize">{bet.status || "Pending"}</span>
                      </Badge>
                      {isRecentlyUpdated && (
                        <span className="text-xs font-bold text-yellow-500 animate-pulse">⚡ UPDATED</span>
                      )}
                      <span className="text-xs text-muted-foreground">{bet.type}</span>
                    </div>

                    <div className="mb-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {bet.homeTeam} vs {bet.awayTeam}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(bet.kickoffTime).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Selection</div>
                        <div className="font-semibold text-slate-900 dark:text-white">{bet.selection}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Odds</div>
                        <div className="font-semibold text-slate-900 dark:text-white">{bet.odds}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Stake</div>
                        <div className="font-semibold text-slate-900 dark:text-white">KES {Number(bet.stake).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Potential</div>
                        <div className="font-semibold text-slate-900 dark:text-white">KES {Number(bet.potentialWinnings ?? (Number(bet.odds) * Number(bet.stake) || 0)).toLocaleString()}</div>
                        {bet.status?.toLowerCase() === 'pending' && new Date(bet.kickoffTime).getTime() + 60_000 < Date.now() && (
                          <div className="text-xs text-amber-600 mt-1">Awaiting result</div>
                        )}
                      </div>
                    </div>

                    {/* OUTCOME SECTION - Show match result and bet outcome */}
                    {bet.status?.toLowerCase() !== 'pending' && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {/* Match Score */}
                          <div>
                            <div className="text-muted-foreground text-xs mb-1">Match Score</div>
                            <div className="text-lg font-bold text-slate-900 dark:text-white">
                              {(() => {
                                // Try to get match_results data from the raw bet object
                                const matchResults = Array.isArray(bet.__raw?.match_results) && bet.__raw?.match_results.length > 0
                                  ? bet.__raw?.match_results[0]
                                  : bet.__raw?.match_results;
                                const homeGoals = matchResults?.home_goals ?? bet.__raw?.match?.homeGoals ?? '?';
                                const awayGoals = matchResults?.away_goals ?? bet.__raw?.match?.awayGoals ?? '?';
                                return `${homeGoals} - ${awayGoals}`;
                              })()}
                            </div>
                          </div>
                          
                          {/* Bet Outcome */}
                          <div>
                            <div className="text-muted-foreground text-xs mb-1">Your Outcome</div>
                            <div className={`text-lg font-bold ${
                              bet.status?.toLowerCase() === 'won'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {bet.status?.toLowerCase() === 'won' ? '✅ WON' : '❌ LOST'}
                            </div>
                          </div>
                          
                          {/* Payout / Loss */}
                          <div>
                            <div className="text-muted-foreground text-xs mb-1">
                              {bet.status?.toLowerCase() === 'won' ? 'Winnings' : 'Loss'}
                            </div>
                            <div className={`text-lg font-bold ${
                              bet.status?.toLowerCase() === 'won'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {bet.status?.toLowerCase() === 'won'
                                ? `+KES ${Math.round((Number(bet.odds) - 1) * Number(bet.stake)).toLocaleString()}`
                                : `-KES ${Number(bet.stake).toLocaleString()}`
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end">
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedId === idx ? "rotate-180" : ""
                      }`}
                    />
                    {bet.status?.toLowerCase() === "won" && (
                      <div className="text-right mt-2">
                        <div className="text-xs text-green-600 dark:text-green-400">Winnings</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          KES {Number(bet.potentialWinnings || 0).toLocaleString()}
                        </div>
                      </div>
                    )}
                    {bet.status?.toLowerCase() === "lost" && (
                      <div className="text-right mt-2">
                        <div className="text-xs text-red-600 dark:text-red-400">Loss</div>
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                          -KES {Number(bet.stake).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === idx && (
                <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 md:p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Bet ID</div>
                      <div className="font-mono text-slate-900 dark:text-white">#{idx + 1}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Total Odds</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{bet.odds}x</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Potential Return</div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        KES {Number(Number(bet.odds) * Number(bet.stake)).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Placed On</div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {new Date(bet.kickoffTime).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {expandedId === idx && (
                <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 md:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">Raw payload</div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowRawId(showRawId === idx ? null : idx); }}>
                        {showRawId === idx ? 'Hide' : 'Show'}
                      </Button>
                      {bet.status?.toLowerCase() !== 'won' && bet.status?.toLowerCase() !== 'lost' && bet.status?.toLowerCase() !== 'cancelled' && (
                        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleCancel(e, bet); }}>
                          Cancel & Refund
                        </Button>
                      )}
                    </div>
                  </div>
                  {showRawId === idx && (
                    <pre className="text-xs overflow-auto max-h-64 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                      {JSON.stringify(bet.__raw ?? bet, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBets;
