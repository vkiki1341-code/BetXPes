import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Target, Award, BarChart3, Calendar, Download, Loader } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function UserAnalytics() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [timeframe, setTimeframe] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState([]);
  const [bettingData, setBettingData] = useState([]);
  const [recentBets, setRecentBets] = useState([]);
  const [favoriteLeagues, setFavoriteLeagues] = useState([]);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError("Please log in to view analytics");
          setLoading(false);
          return;
        }
        setUserId(user.id);

        // Fetch user's bets
        const { data: bets, error: betsError } = await supabase
          .from("bets")
          .select("id, amount, odds, result, bet_type, league, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (betsError) {
          console.error("Bets error:", betsError);
        }

        // Calculate stats
        const totalBets = bets?.length || 0;
        const winningBets = bets?.filter(b => b.result === "win") || [];
        const winRate = totalBets > 0 ? (winningBets.length / totalBets * 100).toFixed(1) : 0;
        
        let totalProfit = 0;
        bets?.forEach(bet => {
          if (bet.result === "win") {
            totalProfit += (bet.odds - 1) * bet.amount;
          } else {
            totalProfit -= bet.amount;
          }
        });

        const roi = totalBets > 0 ? ((totalProfit / (bets?.reduce((sum, b) => sum + b.amount, 0) || 1)) * 100).toFixed(1) : 0;

        setStats([
          { icon: Target, label: "Total Bets", value: totalBets.toString(), change: "+12.5%", color: "from-purple-600 to-pink-600" },
          { icon: TrendingUp, label: "Win Rate", value: `${winRate}%`, change: "+5.2%", color: "from-green-600 to-emerald-600" },
          { icon: Award, label: "ROI", value: `${roi}%`, change: "+8.1%", color: "from-blue-600 to-cyan-600" },
          { icon: BarChart3, label: "Total Profit", value: `KES ${Math.round(totalProfit).toLocaleString()}`, change: "+15.8%", color: "from-yellow-600 to-orange-600" }
        ]);

        // Analyze betting types
        const typeAnalysis: Record<string, { count: number; wins: number }> = {};
        bets?.forEach(bet => {
          if (!typeAnalysis[bet.bet_type]) {
            typeAnalysis[bet.bet_type] = { count: 0, wins: 0 };
          }
          typeAnalysis[bet.bet_type].count++;
          if (bet.result === "win") {
            typeAnalysis[bet.bet_type].wins++;
          }
        });

        const formattedBettingData = Object.entries(typeAnalysis).map(([type, data]) => ({
          type: type || "Unknown",
          count: data.count,
          wins: data.wins,
          roi: `${((data.wins / data.count) * 100).toFixed(0)}%`
        }));

        setBettingData(formattedBettingData);

        // Format recent bets (last 5)
        const formattedRecentBets = (bets || []).slice(0, 5).map((bet) => ({
          id: bet.id,
          league: bet.league || "Unknown",
          team: "Match",
          type: bet.bet_type || "1X2",
          stake: `KES ${bet.amount}`,
          result: bet.result === "win" ? "Win" : "Loss",
          profit: bet.result === "win" ? `KES ${Math.round((bet.odds - 1) * bet.amount)}` : `-KES ${bet.amount}`,
          date: new Date(bet.created_at).toLocaleDateString()
        }));

        setRecentBets(formattedRecentBets);

        // Analyze favorite leagues
        const leagueAnalysis: Record<string, { bets: number; wins: number; odds: number }> = {};
        bets?.forEach(bet => {
          if (!leagueAnalysis[bet.league]) {
            leagueAnalysis[bet.league] = { bets: 0, wins: 0, odds: 0 };
          }
          leagueAnalysis[bet.league].bets++;
          if (bet.result === "win") {
            leagueAnalysis[bet.league].wins++;
          }
          leagueAnalysis[bet.league].odds += bet.odds;
        });

        const formattedLeagues = Object.entries(leagueAnalysis)
          .map(([league, data]) => ({
            league: league || "Unknown",
            bets: data.bets,
            winRate: `${((data.wins / data.bets) * 100).toFixed(0)}%`,
            avgOdds: (data.odds / data.bets).toFixed(2),
            favorite: data.bets > 20
          }))
          .sort((a, b) => b.bets - a.bets)
          .slice(0, 5);

        setFavoriteLeagues(formattedLeagues);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeframe]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900/20 to-slate-950 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        ></div>
      </div>

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <button
            onClick={() => navigate("/betting")}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-12 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Betting
          </button>

          <div className={`mb-20 transform transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Betting Analytics
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl leading-relaxed">
              Detailed insights into your betting performance, win rates, and ROI analysis.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 text-purple-400 animate-spin" />
              <span className="ml-4 text-gray-300">Loading analytics data...</span>
            </div>
          )}

          {!loading && (
            <>
          {/* Timeframe Selector */}
          <div className="mb-12 flex gap-3">
            {["week", "month", "year"].map((period) => (
              <Button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-6 py-2 rounded-lg transition-all capitalize ${
                  timeframe === period
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    : "bg-slate-800 border border-slate-700/50 text-gray-300 hover:border-purple-400/30"
                }`}
              >
                This {period}
              </Button>
            ))}
            <Button
              variant="outline"
              className="border-purple-400/50 text-purple-400 hover:bg-purple-500/10 ml-auto flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export Report
            </Button>
          </div>

          {/* Performance Stats */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="group relative"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-all duration-500`}></div>
                  
                  <div className="relative bg-slate-900/50 border border-slate-700/50 group-hover:border-purple-400/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
                    <Icon className="w-8 h-8 text-purple-400 mb-4" />
                    <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
                    <span className="text-green-400 text-sm font-semibold">{stat.change}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Betting Type Performance */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">Betting Type Performance</h2>
            <div className="relative bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50 border-b border-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Total Bets</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Wins</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Win Rate</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bettingData.map((data, index) => (
                      <tr key={index} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-white">{data.type}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{data.count}</td>
                        <td className="px-6 py-4 text-sm text-green-400 font-semibold">{data.wins}</td>
                        <td className="px-6 py-4 text-sm text-purple-400 font-semibold">{(data.wins / data.count * 100).toFixed(1)}%</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                            {data.roi}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Favorite Leagues */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">League Performance</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {favoriteLeagues.map((league, index) => (
                <div
                  key={index}
                  className="relative bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-400/30 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{league.league}</h3>
                      {league.favorite && (
                        <span className="text-yellow-400 text-xs font-semibold">★ Favorite League</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Total Bets</p>
                      <p className="text-2xl font-bold text-white">{league.bets}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Win Rate</p>
                      <p className="text-2xl font-bold text-green-400">{league.winRate}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Avg Odds</p>
                      <p className="text-lg font-bold text-purple-400">{league.avgOdds}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setTimeframe(league.league)}
                      className="bg-purple-600 hover:bg-purple-700 text-white h-fit"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Bets */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Recent Bets</h2>
            <div className="relative bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50 border-b border-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">League</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Match</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Stake</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Result</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Profit/Loss</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBets.map((bet) => (
                      <tr key={bet.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-300">{bet.league}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{bet.team}</td>
                        <td className="px-6 py-4 text-sm text-purple-400 font-semibold">{bet.type}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{bet.stake}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            bet.result === "Win"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {bet.result}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm font-semibold ${
                          bet.profit.includes("-") ? "text-red-400" : "text-green-400"
                        }`}>
                          {bet.profit}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{bet.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
