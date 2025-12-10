import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  Zap,
  TrendingUp,
  Clock,
  AlertCircle,
  ChevronDown,
  Loader,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdvancedSearch() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [error, setError] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    league: [],
    betType: [],
    oddRange: [1.0, 5.0],
    minOdds: 1.0,
    maxOdds: 5.0,
    status: [],
  });
  const [expandedSections, setExpandedSections] = useState({
    league: true,
    betType: true,
    odds: true,
    advanced: false,
  });

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        
        // Fetch matches from Supabase
        const { data: matches, error: matchesError } = await supabase
          .from("matches")
          .select("id, team1, team2, league, odds_1x2, odds_over, odds_under, created_at")
          .order("created_at", { ascending: false })
          .limit(100);

        if (matchesError) {
          console.error("Matches error:", matchesError);
        }

        // Extract unique leagues
        const uniqueLeagues = [...new Set(matches?.map(m => m.league) || [])].map(league => ({
          name: league,
          count: matches?.filter(m => m.league === league).length || 0,
          isFavorite: false
        }));

        setLeagues(uniqueLeagues);

        // Format search results
        const formattedResults = (matches || [])
          .filter(match => {
            const matchesSearch = !searchQuery || 
              match.team1?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              match.team2?.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesLeague = activeFilters.league.length === 0 || 
              activeFilters.league.includes(match.league);
            
            const matchesOdds = (match.odds_1x2 >= activeFilters.minOdds && 
              match.odds_1x2 <= activeFilters.maxOdds);
            
            return matchesSearch && matchesLeague && matchesOdds;
          })
          .map((match) => ({
            id: match.id,
            league: match.league || "Unknown",
            match: `${match.team1 || "Team A"} vs ${match.team2 || "Team B"}`,
            date: new Date(match.created_at).toLocaleDateString(),
            odds: match.odds_1x2 || 2.5,
            favorite: false,
            volume: ["Low", "Medium", "High", "Very High"][Math.floor(Math.random() * 4)],
            trending: Math.random() > 0.7
          }));

        setSearchResults(formattedResults);
      } catch (err) {
        console.error("Error fetching matches:", err);
        setError("Failed to load matches");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [searchQuery, activeFilters]);

  const betTypes = [
    { name: "1X2", description: "Win/Draw/Loss" },
    { name: "Over/Under", description: "Total Goals" },
    { name: "Both Teams to Score", description: "BTTS" },
    { name: "Correct Score", description: "Exact Result" },
    { name: "Asian Handicap", description: "Half-goal odds" },
    { name: "Accumulators", description: "Multiple bets" },
    { name: "First Goal Scorer", description: "Goal scorer market" },
    { name: "Next Goal", description: "Real-time markets" },
  ];

  const toggleFilter = (filterType: string, value: string) => {
    setActiveFilters((prev) => {
      const current = prev[filterType as keyof typeof activeFilters] as string[];
      if (current.includes(value)) {
        return {
          ...prev,
          [filterType]: current.filter((item) => item !== value),
        };
      } else {
        return {
          ...prev,
          [filterType]: [...current, value],
        };
      }
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleFavorite = (leagueName: string) => {
    // Placeholder for favorite functionality
    console.log("Toggled favorite for:", leagueName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900/20 to-slate-950 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        ></div>
        <div
          className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"
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

          <div
            className={`mb-12 transform transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Advanced Search
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl leading-relaxed">
              Find and filter matches by league, bet type, odds, and market
              popularity.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                {/* Search Box */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search matches..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-all"
                  />
                </div>

                {/* League Filter */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection("league")}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                  >
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Filter className="w-5 h-5 text-purple-400" />
                      Leagues
                    </h3>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedSections.league ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedSections.league && (
                    <div className="p-4 border-t border-slate-700/50 max-h-96 overflow-y-auto space-y-2">
                      {leagues.map((league) => (
                        <label
                          key={league.name}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={activeFilters.league.includes(league.name)}
                            onChange={() => toggleFilter("league", league.name)}
                            className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-300 group-hover:text-white transition-colors truncate">
                              {league.name}
                            </p>
                          </div>
                          {league.isFavorite && (
                            <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                          )}
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {league.count}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bet Type Filter */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection("betType")}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                  >
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-400" />
                      Bet Type
                    </h3>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedSections.betType ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedSections.betType && (
                    <div className="p-4 border-t border-slate-700/50 space-y-2">
                      {betTypes.map((type) => (
                        <label
                          key={type.name}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={activeFilters.betType.includes(type.name)}
                            onChange={() => toggleFilter("betType", type.name)}
                            className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-300 group-hover:text-white transition-colors truncate">
                              {type.name}
                            </p>
                            <p className="text-xs text-gray-500">{type.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Odds Range Filter */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection("odds")}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                  >
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      Odds Range
                    </h3>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedSections.odds ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedSections.odds && (
                    <div className="p-4 border-t border-slate-700/50 space-y-4">
                      <div>
                        <label className="text-sm text-gray-300 mb-2 block">
                          Min Odds: {activeFilters.minOdds.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="1.0"
                          max="5.0"
                          step="0.1"
                          value={activeFilters.minOdds}
                          onChange={(e) =>
                            setActiveFilters({
                              ...activeFilters,
                              minOdds: parseFloat(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 mb-2 block">
                          Max Odds: {activeFilters.maxOdds.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="1.0"
                          max="10.0"
                          step="0.1"
                          value={activeFilters.maxOdds}
                          onChange={(e) =>
                            setActiveFilters({
                              ...activeFilters,
                              maxOdds: parseFloat(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Clear Filters */}
                <Button
                  onClick={() =>
                    setActiveFilters({
                      league: [],
                      betType: [],
                      oddRange: [1.0, 5.0],
                      minOdds: 1.0,
                      maxOdds: 5.0,
                      status: [],
                    })
                  }
                  className="w-full bg-slate-800 hover:bg-slate-700 text-gray-300 border border-slate-700/50"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>

            {/* Results Section */}
            <div className="lg:col-span-3">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Results
                  <span className="text-sm text-gray-400 ml-3">
                    {searchResults.length} matches
                  </span>
                </h2>
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
                  <span className="ml-4 text-gray-300">Loading matches...</span>
                </div>
              )}

              {!loading && searchResults.length === 0 && (
                <div className="relative bg-slate-900/50 border border-slate-700/50 rounded-xl p-12 text-center">
                  <p className="text-gray-300 text-lg">No matches found</p>
                  <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
                </div>
              )}

              {!loading && searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="group relative bg-slate-900/50 border border-slate-700/50 hover:border-purple-400/50 rounded-xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-purple-400 mb-2">
                          {result.league}
                        </p>
                        <h3 className="text-lg font-bold text-white">
                          {result.match}
                        </h3>
                      </div>
                      <button
                        onClick={() => toggleFavorite(result.league)}
                        className="ml-4 text-gray-400 hover:text-yellow-400 transition-colors"
                      >
                        <Star className="w-6 h-6" fill="currentColor" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Date</p>
                        <p className="text-sm text-white font-semibold">
                          {result.date}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Best Odds</p>
                        <p className="text-sm text-white font-semibold">
                          {result.odds.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Volume</p>
                        <p className="text-sm text-green-400 font-semibold">
                          {result.volume}
                        </p>
                      </div>
                      <div className="flex items-end">
                        {result.trending && (
                          <div className="flex items-center gap-1 px-3 py-1 bg-red-500/20 border border-red-400/30 rounded-full">
                            <Zap className="w-4 h-4 text-red-400" />
                            <span className="text-xs text-red-400 font-semibold">
                              Trending
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all group-hover:scale-105 transform">
                      Place Bet
                    </Button>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
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
