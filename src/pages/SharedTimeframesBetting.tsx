import React, { useState } from "react";
import { getAdminSettings, saveAdminSettings, checkAndAutoReshuffle } from "@/utils/matchGenerator";
import { leagues } from "@/data/leagues";
import UserNotifications from "@/components/UserNotifications";
import { supabase } from "@/lib/supabaseClient";
import { useEffect } from "react";
import { useBetSlipHistory } from "@/hooks/useBetSlipHistory";
import { BetSlipHistory } from "@/components/BetSlipHistory";
import { placeBetsAtomic } from "@/lib/bettingService";
import { useRealtimeBalance } from "@/hooks/useRealtimeBalance";
import { resolveBetsForMatch, forceResolveStaleBets } from "@/lib/supabaseBets";
import { getFixtureOutcomesForWeek } from "@/lib/fixtureOutcomes";

// System-wide state: track current week/timeframe globally in Supabase
const SYSTEM_STATE_KEY = "betting_system_state";

// Get global system state from Supabase (all users see the same)
async function getSystemStateFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('betting_system_state')
      .select('*')
      .single();
    
    if (error || !data) {
      console.warn('No system state in DB, using defaults');
      return getDefaultSystemState();
    }
    
    return {
      currentWeek: data.current_week || 1,
      currentTimeframeIdx: data.current_timeframe_idx || 0,
      matchState: data.match_state || 'pre-countdown',
      countdown: data.countdown || 10,
      lastUpdated: data.updated_at || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Failed to fetch system state from DB:', err);
    return getDefaultSystemState();
  }
}

// Save global system state to Supabase (syncs all users)
async function saveSystemStateToSupabase(state: any) {
  try {
    const { error } = await supabase
      .from('betting_system_state')
      .upsert({
        id: 1, // Single row for global state
        current_week: state.currentWeek,
        current_timeframe_idx: state.currentTimeframeIdx,
        match_state: state.matchState,
        countdown: state.countdown,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    
    if (error) {
      console.error('Failed to save system state to DB:', error);
      return;
    }
    
    console.log('✓ System state saved to DB:', state);
  } catch (err) {
    console.error('Exception saving system state:', err);
  }
}

function getDefaultSystemState() {
  return {
    currentWeek: 1,
    currentTimeframeIdx: 0,
    matchState: 'pre-countdown',
    countdown: 10,
    lastUpdated: new Date().toISOString(),
  };
}

// Fallback to localStorage if Supabase is down
function getSystemState() {
  const stored = localStorage.getItem(SYSTEM_STATE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return getDefaultSystemState();
}

function saveSystemState(state: any) {
  localStorage.setItem(SYSTEM_STATE_KEY, JSON.stringify({
    ...state,
    lastUpdated: new Date().toISOString(),
  }));
  // Also save to Supabase for global sync
  saveSystemStateToSupabase(state);
}

// Helper to persist and retrieve match history
const MATCH_HISTORY_KEY = "betting_match_history";
function saveMatchResult(result) {
  const history = JSON.parse(localStorage.getItem(MATCH_HISTORY_KEY) || "[]");
  history.push(result);
  localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(history));
}
function getMatchHistory() {
  return JSON.parse(localStorage.getItem(MATCH_HISTORY_KEY) || "[]");
}
// Helper to simulate live match events
// Progressive match simulation: generates a timeline of goal events
function simulateMatch(matchId, duration = 40, adminOverride = null) {
  // Check if there's an admin override for this match
  if (adminOverride && adminOverride.homeGoals !== undefined && adminOverride.awayGoals !== undefined) {
    const homeGoals = adminOverride.homeGoals;
    const awayGoals = adminOverride.awayGoals;
    let winner = adminOverride.winner;
    
    // If winner not explicitly set, calculate it
    if (!winner) {
      if (homeGoals > awayGoals) winner = "home";
      else if (awayGoals > homeGoals) winner = "away";
      else winner = "draw";
    }
    
    // Generate realistic events based on the predetermined score
    const events = [];
    let homeGoalsToGenerate = homeGoals;
    let awayGoalsToGenerate = awayGoals;
    
    for (let t = 1; t <= duration && (homeGoalsToGenerate > 0 || awayGoalsToGenerate > 0); t++) {
      if (Math.random() < 0.10) { // Slightly higher chance to reach target goals
        if (homeGoalsToGenerate > 0 && Math.random() < 0.5) {
          homeGoalsToGenerate--;
          events.push({ time: t, team: "home" });
        } else if (awayGoalsToGenerate > 0) {
          awayGoalsToGenerate--;
          events.push({ time: t, team: "away" });
        }
      }
    }
    
    return { homeGoals, awayGoals, winner, events };
  }
  
  // duration in seconds
  const events = [];
  let homeGoals = 0;
  let awayGoals = 0;
  let winner = null;
  // Simulate goal events at random times
  for (let t = 1; t <= duration; t++) {
    // Each second, chance for a goal
    if (Math.random() < 0.07) { // ~7% chance per second
      const who = Math.random() < 0.5 ? "home" : "away";
      if (who === "home") homeGoals++;
      else awayGoals++;
      events.push({ time: t, team: who });
    }
  }
  if (homeGoals > awayGoals) winner = "home";
  else if (awayGoals > homeGoals) winner = "away";
  else winner = "draw";
  return { homeGoals, awayGoals, winner, events };
}

// Helper to get progressive score at a given match minute
function getProgressiveScore(events, matchMinute, duration = 40) {
  // Map matchMinute (0-90) to simulation second (1-40)
  const simSecond = Math.floor((matchMinute / 90) * duration);
  let home = 0, away = 0;
  for (const ev of events) {
    if (ev.time <= simSecond) {
      if (ev.team === "home") home++;
      else away++;
    }
  }
  return { home, away };
}
// Helper to randomize goal outcomes
const randomGoals = () => Math.floor(Math.random() * 5);

// Function to calculate dynamic odds based on match result
const calculateDynamicOdds = (homeGoals: number, awayGoals: number) => {
  const totalGoals = homeGoals + awayGoals;
  
  // 1X2 odds based on final result
  let odds_1 = 2.10, odds_X = 3.20, odds_2 = 2.80;
  if (homeGoals > awayGoals) {
    odds_1 = 1.20; // Home already won, low odds
    odds_X = 5.00;
    odds_2 = 8.00;
  } else if (awayGoals > homeGoals) {
    odds_1 = 8.00;
    odds_X = 5.00;
    odds_2 = 1.20; // Away already won, low odds
  } else {
    odds_1 = 4.00;
    odds_X = 1.15; // Draw already happened, very low odds
    odds_2 = 4.00;
  }
  
  // BTTS odds
  const btts_yes = (homeGoals > 0 && awayGoals > 0) ? 1.10 : 2.50;
  const btts_no = (homeGoals > 0 && awayGoals > 0) ? 4.00 : 1.20;
  
  // Over/Under 1.5
  const ov15 = totalGoals > 1.5 ? 1.15 : 3.20;
  const un15 = totalGoals < 1.5 ? 1.15 : 3.20;
  
  // Over/Under 2.5
  const ov25 = totalGoals > 2.5 ? 1.30 : 2.50;
  const un25 = totalGoals < 2.5 ? 1.30 : 2.50;
  
  // Total Goals - multiple brackets
  const ov35 = totalGoals > 3.5 ? 1.40 : 2.20;
  const un35 = totalGoals < 3.5 ? 1.40 : 2.20;
  const ov45 = totalGoals > 4.5 ? 2.00 : 1.80;
  const un45 = totalGoals < 4.5 ? 1.80 : 2.00;
  
  // Time of First Goal - already happened, so only current or past times are valid
  // We'll use a placeholder since we don't track exact goal times in this simple version
  const tofg_odds = ["1.05", "1.05", "1.05", "2.50", "3.50", "4.00"];
  
  // Odd/Even goals
  const oddGoals = totalGoals % 2 === 1;
  const odd_odds = oddGoals ? 1.10 : 3.00;
  const even_odds = oddGoals ? 3.00 : 1.10;
  
  return {
    "1X2": { 
      selections: ["1", "X", "2"], 
      odds: [odds_1.toFixed(2), odds_X.toFixed(2), odds_2.toFixed(2)] 
    },
    "BTTS": { 
      selections: ["Yes", "No"], 
      odds: [btts_yes.toFixed(2), btts_no.toFixed(2)] 
    },
    "OV/UN 1.5": { 
      selections: ["Over 1.5", "Under 1.5"], 
      odds: [ov15.toFixed(2), un15.toFixed(2)] 
    },
    "OV/UN 2.5": { 
      selections: ["Over 2.5", "Under 2.5"], 
      odds: [ov25.toFixed(2), un25.toFixed(2)] 
    },
    "Total Goals": { 
      selections: ["Over 2.5", "Over 3.5", "Over 4.5", "Under 2.5", "Under 3.5", "Under 4.5"], 
      odds: ["1.85", ov35.toFixed(2), ov45.toFixed(2), un25.toFixed(2), un35.toFixed(2), un45.toFixed(2)] 
    },
    "Time of First Goal": { 
      selections: ["0-15 min", "16-30 min", "31-45 min", "46-60 min", "61-75 min", "76-90 min"], 
      odds: tofg_odds 
    },
    "Total Goals Odd/Even": { 
      selections: ["Odd", "Even"], 
      odds: [odd_odds.toFixed(2), even_odds.toFixed(2)] 
    },
  };
};

import { generateMatches } from "@/utils/matchGenerator";
import BettingHeader from "@/components/BettingHeader";
import NavigationTabs from "@/components/NavigationTabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCurrentMatch, getUpcomingMatches, getMatchAtTime, getAllAvailableMatches } from "@/utils/globalTimeMatchSystem";
import { getGlobalSchedule, calculateScheduledTime } from "@/lib/matchScheduleService";

// Betting types (copied from MatchRow)
const betTypes = [
  { type: "1X2", selections: ["1", "X", "2"], odds: ["2.10", "3.20", "2.80"] },
  { type: "BTTS", selections: ["Yes", "No"], odds: ["1.90", "1.90"] },
  { type: "OV/UN 1.5", selections: ["Over 1.5", "Under 1.5"], odds: ["1.60", "2.20"] },
  { type: "OV/UN 2.5", selections: ["Over 2.5", "Under 2.5"], odds: ["2.00", "1.80"] },
  { type: "Total Goals", selections: ["Over 2.5", "Over 3.5", "Over 4.5", "Under 2.5", "Under 3.5", "Under 4.5"], odds: ["1.85", "2.40", "3.50", "1.95", "1.50", "1.25"] },
  { type: "Time of First Goal", selections: ["0-15 min", "16-30 min", "31-45 min", "46-60 min", "61-75 min", "76-90 min"], odds: ["4.50", "3.80", "3.20", "3.40", "2.80", "2.50"] },
  { type: "Total Goals Odd/Even", selections: ["Odd", "Even"], odds: ["1.90", "1.90"] },
];

// Correct score options (all possible match results)
const correctScoreOptions = [
  { score: "0-0", odds: "8.50" },
  { score: "0-1", odds: "10.00" },
  { score: "0-2", odds: "15.00" },
  { score: "0-3", odds: "20.00" },
  { score: "1-0", odds: "6.50" },
  { score: "1-1", odds: "5.50" },
  { score: "1-2", odds: "12.00" },
  { score: "1-3", odds: "18.00" },
  { score: "2-0", odds: "9.00" },
  { score: "2-1", odds: "7.50" },
  { score: "2-2", odds: "8.00" },
  { score: "2-3", odds: "16.00" },
  { score: "3-0", odds: "14.00" },
  { score: "3-1", odds: "11.00" },
  { score: "3-2", odds: "13.00" },
  { score: "3-3", odds: "18.50" },
];

// Timeframes
// Generate dynamic time slots (every 2 minutes from now)
const getTimeSlots = (count = 6) => {
  // Generate time slots every 2 minutes
  const slots = [];
  const now = new Date();
  
  // Generate past and future slots (2 minutes apart)
  for (let i = -2; i < count - 2; i++) {
    const slotTime = new Date(now.getTime() + i * 2 * 60000); // 2 minutes apart
    slots.push(slotTime);
  }
  return slots;
};

// Helper to get logo path, fallback to default
const getLogoPath = (team: any) => {
  // First check if team has a logo property (properly imported)
  if (team.logo) {
    return team.logo;
  }
  // Fallback to default if no logo property
  return defaultLogo;
};

const defaultLogo = "/src/assets/teams/default.png";

// Helper: Get current timeframe index based on global time system
const getCurrentTimeframeIdx = (): number => {
  const schedule = getGlobalSchedule();
  const now = new Date();
  const currentIndex = Math.floor((now.getTime() - schedule.referenceEpoch) / (schedule.matchInterval * 60000));
  return currentIndex;
};

// Helper: Find which slot index a given time falls into
const getSlotIndexForTime = (time: Date, slots: Date[]): number => {
  return slots.findIndex(slot => 
    Math.abs(slot.getTime() - time.getTime()) < 60000 // Within 1 minute
  );
};

// Helper: Filter matches by country/league
// No filtering needed - matches are already loaded per country
const getMatchesByCountry = (matches: any[], countryCode: string): any[] => {
  // Since we load matches per country, just return all matches
  return matches || [];
};

const BetXPesa = () => {
  // Betslip UI state
  const [betslipOpen, setBetslipOpen] = useState(true);
  // Betslip state: array of bets
  const [betslip, setBetslip] = useState<any[]>([]);
  // User and balance state
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  // History modal state
  const [showHistory, setShowHistory] = useState(false);
  const [matchHistory, setMatchHistory] = useState([]);
  // Track if we've already saved results for current betting phase (prevent duplicate saves)
  const [resultsSavedForPhase, setResultsSavedForPhase] = useState(false);
  // Correct score state
  const [showCorrectScore, setShowCorrectScore] = useState(false);
  const [selectedCorrectScoreMatch, setSelectedCorrectScoreMatch] = useState<any>(null);
  const [selectedCorrectScoreLeague, setSelectedCorrectScoreLeague] = useState<any>(null);

  // Fetch user data with realtime balance updates
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current user from session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log("No user session found");
          return;
        }

        setUser(user);
        console.log("User session established:", user.id);

        // Fetch user balance from users table
        const { data: userData, error: balanceError } = await supabase
          .from("users")
          .select("balance")
          .eq("id", user.id);

        if (balanceError) {
          console.error("Error fetching balance:", balanceError);
        } else if (userData && userData.length > 0) {
          setBalance(userData[0].balance || 0);
          console.log("Balance loaded:", userData[0].balance);
        } else {
          console.warn("No user record found in users table");
          setBalance(0);
        }
      } catch (error) {
        console.error("Error in fetchUserData:", error);
      }
    };

    fetchUserData();
  }, []);

  // Subscribe to realtime balance updates via Supabase
  const { balance: realtimeBalance } = useRealtimeBalance({
    userId: user?.id,
    onBalanceChange: (newBalance) => {
      console.log("✨ Balance updated in real-time:", newBalance);
      setBalance(newBalance);
    },
    onError: (error) => {
      console.error("Balance subscription error:", error);
    }
  });

  // Use realtime balance if available, otherwise fall back to local state
  useEffect(() => {
    if (realtimeBalance !== null && realtimeBalance !== undefined) {
      setBalance(realtimeBalance);
    }
  }, [realtimeBalance]);

  // Sync global system state with Supabase - all users see the same thing
  // Sync global system state with Supabase on mount
  useEffect(() => {
    let unsubscribe: any = null;

    const setupRealtimeSync = async () => {
      try {
        // CHECK: Only setup Supabase sync if global time system is NOT active
        const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
        
        if (isGlobalTimeActive) {
          console.log('✅ Global time system is active - SKIPPING Supabase realtime sync');
          return;
        }

        // Subscribe to realtime changes
        unsubscribe = supabase
          .channel('betting_system_state_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'betting_system_state' },
            (payload) => {
              const newData = (payload.new || {}) as any;
              const newState = {
                currentWeek: newData?.current_week || 1,
                currentTimeframeIdx: newData?.current_timeframe_idx || 0,
                matchState: newData?.match_state || 'pre-countdown',
                countdown: newData?.countdown || 10,
                lastUpdated: new Date().toISOString(),
              };
              console.log('✨ System state changed globally:', newState);
              localStorage.setItem('betting_system_state', JSON.stringify(newState));
              // Dispatch event for component to listen to
              window.dispatchEvent(new CustomEvent('systemStateChanged', { detail: newState }));
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Failed to setup realtime sync:', err);
      }
    };

    setupRealtimeSync();

    return () => {
      if (unsubscribe) {
        unsubscribe.unsubscribe();
      }
    };
  }, []);

        // Track current match week for fixtures - synchronized across all users
        const totalWeeks = 36;
        // Initialize from Supabase, not localStorage - ensures global sync
        const [currentTimeframeIdx, setCurrentTimeframeIdx] = useState(0);
        const [liveTimeframeIdx, setLiveTimeframeIdx] = useState(0); // Track the truly active/live timeframe - synchronized
        // Each timeframe corresponds to a match week
        const [fixtureSchedule, setFixtureSchedule] = useState(generateLeagueFixtures(leagues[0]));
        // Number of games per timeframe
        const gamesPerTimeframe = 5;
      const [selectedFixtureCountry, setSelectedFixtureCountry] = useState(leagues[0].countryCode);
    // Fixture modal state
    const [showFixture, setShowFixture] = useState(false);

    // Listen for global system state changes and update component state
    useEffect(() => {
      const handleSystemStateChange = (event: any) => {
        const newState = event.detail;
        console.log('📡 Component updating from global state:', newState);
        setCurrentTimeframeIdx(newState.currentTimeframeIdx);
        setLiveTimeframeIdx(newState.currentTimeframeIdx);
        setMatchState(newState.matchState);
        setCountdown(newState.countdown);
      };

      window.addEventListener('systemStateChanged', handleSystemStateChange);
      
      // Also sync immediately on mount
      const syncImmediately = async () => {
        try {
          // CHECK: If global time system is active, use it to set current timeframe
          const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
          
          if (isGlobalTimeActive) {
            console.log('✅ Global time system is active - using global time to set timeframe');
            // Get current timeframe from global time system
            const currentIdx = getCurrentTimeframeIdx();
            setCurrentTimeframeIdx(currentIdx);
            setLiveTimeframeIdx(currentIdx);
            setMatchState('pre-countdown');
            setCountdown(10);
            return;
          }
          
          // Only load from Supabase if global time system is NOT active
          const globalState = await getSystemStateFromSupabase();
          console.log('⚡ Initial sync from Supabase:', globalState);
          setCurrentTimeframeIdx(globalState.currentTimeframeIdx);
          setLiveTimeframeIdx(globalState.currentTimeframeIdx);
          setMatchState(globalState.matchState);
          setCountdown(globalState.countdown);
        } catch (err) {
          console.error('Sync failed, using defaults:', err);
          // Use defaults if sync fails
          setCurrentTimeframeIdx(0);
          setLiveTimeframeIdx(0);
          setMatchState('pre-countdown');
          setCountdown(10);
        }
      };
      
      syncImmediately();
      
      return () => {
        window.removeEventListener('systemStateChanged', handleSystemStateChange);
      };
    }, []);

    // Generate fixture schedule for all leagues, weeks 1-36
    function generateLeagueFixtures(league) {
      const teams = [...league.teams];
      const weeks = 36;
      const fixtures = [];
      // Round-robin: each team plays every other team twice (home/away)
      for (let week = 1; week <= weeks; week++) {
        const weekMatches = [];
        // Simple round-robin pairing for demonstration
        for (let i = 0; i < teams.length / 2; i++) {
          const homeIdx = (week + i) % teams.length;
          const awayIdx = (week + teams.length - i - 1) % teams.length;
          weekMatches.push({
            home: teams[homeIdx],
            away: teams[awayIdx],
          });
        }
        fixtures.push({ week, matches: weekMatches });
      }
      return fixtures;
    }
  const [stake, setStake] = useState("");
  const [betPlaced, setBetPlaced] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  // Dynamic bet types state - will update when match finishes
  const [dynamicBetTypes, setDynamicBetTypes] = useState(betTypes);
  const [selectedBetType, setSelectedBetType] = useState(betTypes[0]);
  const [selectedSelection, setSelectedSelection] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(leagues[0].countryCode);
  const [matchupsByTimeframe, setMatchupsByTimeframe] = useState({});
  const [selectedBetTypesByMatch, setSelectedBetTypesByMatch] = useState({});
  const [selectedBetTypeForMatch, setSelectedBetTypeForMatch] = useState<string | null>(null);
  // Cache for match simulations: { [matchId]: { homeGoals, awayGoals, winner, events } }
  const [matchSimCache, setMatchSimCache] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [betSlip, setBetSlip] = useState<any>(null);
  // New states for countdown and transitions
  const [matchState, setMatchState] = useState<'pre-countdown' | 'playing' | 'betting' | 'next-countdown'>('pre-countdown');
  const [countdown, setCountdown] = useState(10); // for pre-match countdown
  const [matchTimer, setMatchTimer] = useState(0); // 0-90 for match minutes
  const [bettingTimer, setBettingTimer] = useState(30); // 30s betting window
  // Admin control states
  const [adminMode, setAdminMode] = useState(false);
  const [adminSettings, setAdminSettingsState] = useState(getAdminSettings());
  const [adminOutcomes, setAdminOutcomes] = useState(adminSettings.manualOutcomes || {});
  const [showCorrectScoreForMatch, setShowCorrectScoreForMatch] = useState<string | null>(null);
  // Bet slip history state
  const { saveBetSlip } = useBetSlipHistory();
  const [showBetSlipHistory, setShowBetSlipHistory] = useState(false);
  const [betSlipName, setBetSlipName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Get teams for selected country
  const league = leagues.find(l => l.countryCode === selectedCountry);
  const teams = league ? league.teams : [];

  // Remove generateAllMatchups and shuffleArray, not needed for fixture-based scheduling

  // Real-time update every 2 minutes (will be replaced by new flow)
  React.useEffect(() => {
    // When country changes, reset fixture schedule and use synchronized timeframe index
    const league = leagues.find(l => l.countryCode === selectedCountry);
    const newSchedule = generateLeagueFixtures(league);
    setFixtureSchedule(newSchedule);
    
    // CHECK: If global time system is active, skip week-based state
    const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
    let syncedTimeframeIdx = 0;
    
    if (isGlobalTimeActive) {
      console.log('✅ Global time system is active - SKIPPING week-based state in country change');
      syncedTimeframeIdx = 0;
      setCurrentTimeframeIdx(0);
      setLiveTimeframeIdx(0);
    } else {
      // Load the synchronized system state to show current week to all users
      const currentSystemState = getSystemState();
      syncedTimeframeIdx = Math.min(currentSystemState.currentTimeframeIdx, totalWeeks - 1);
      setCurrentTimeframeIdx(syncedTimeframeIdx);
      setLiveTimeframeIdx(syncedTimeframeIdx);
    }
    
    const slots = getTimeSlots(totalWeeks);
    setTimeSlots(slots);
    
    // Use global time system to get the current match time slot
    const currentMatch = getCurrentMatch();
    const currentMatchTime = currentMatch ? currentMatch.kickoffTime : slots[0];
    setSelectedTimeSlot(currentMatchTime);
    
    // Load matches using global time system - 9 matches per timeframe per country
    const loadGlobalTimeMatches = async () => {
      const newMatchups = {};
      const newSimCache = {};
      
      // Get the selected league based on country code
      const selectedLeague = leagues.find(l => l.countryCode === selectedCountry);
      if (!selectedLeague) {
        console.warn(`❌ League not found for country: ${selectedCountry}`);
        return;
      }
      
      console.log(`📊 Loading matches for ${selectedLeague.country}`);
      
      // Create all possible matches for this league
      const leagueMatches: any[] = [];
      const teams = selectedLeague.teams;
      
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          leagueMatches.push({
            homeTeam: teams[i],
            awayTeam: teams[j],
          });
        }
      }
      
      console.log(`✅ Created ${leagueMatches.length} possible matches for ${selectedLeague.country}`);
      
      // Shuffle the matches for variety
      const shuffledMatches = leagueMatches.sort(() => Math.random() - 0.5);
      
      // If we have fewer than 9 matches, duplicate to ensure we always have 9
      let availableMatches = [...shuffledMatches];
      while (availableMatches.length < 9) {
        availableMatches.push(...shuffledMatches);
      }
      
      // Create a map of time slots to matches
      slots.forEach((slot, idx) => {
        const matchesForSlot = [];
        
        // Get 9 matches for this timeframe by cycling through available matches
        for (let i = 0; i < 9; i++) {
          const matchIndex = (idx * 9 + i) % availableMatches.length;
          const matchData = availableMatches[matchIndex];
          
          const matchId = `${selectedCountry}-${slot.getTime()}-${i}`;
          
          // Simulate the match with consistent ID
          newSimCache[matchId] = simulateMatch(matchId, 40, null);
          
          matchesForSlot.push({
            id: matchId,
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            kickoffTime: slot,
            overOdds: "1.50",
            underOdds: "2.50",
            outcome: null,
          });
        }
        
        console.log(`⏰ Timeframe ${idx} (${selectedLeague.country}): ${matchesForSlot.length} matches`);
        newMatchups[slot.toISOString()] = matchesForSlot;
      });
      
      setMatchupsByTimeframe(newMatchups);
      setMatchSimCache(newSimCache);
      setSelectedMatchup(null);
    };
    
    loadGlobalTimeMatches();
  }, [selectedCountry]);
  
  // Update liveTimeframeIdx based on global time system (every 5 seconds)
  React.useEffect(() => {
    const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
    
    if (!isGlobalTimeActive) return;
    
    const updateLiveIdx = () => {
      const currentIdx = getCurrentTimeframeIdx();
      setLiveTimeframeIdx(currentIdx);
    };
    
    // Update immediately
    updateLiveIdx();
    
    // Then update every 5 seconds
    const interval = setInterval(updateLiveIdx, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Track previous match state to detect transitions
  const [prevMatchState, setPrevMatchState] = React.useState<string>('pre-countdown');
  // Track if we've already advanced in this cycle to prevent duplicate advances
  const [hasAdvancedThisCycle, setHasAdvancedThisCycle] = React.useState<boolean>(false);

  // For global time system: skip the week advancement logic
  React.useEffect(() => {
    const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
    
    // If global time is active, we don't need to manually advance weeks
    if (isGlobalTimeActive) {
      return;
    }
    
    // Otherwise, use the old week-based advancement logic
    // When we transition back to pre-countdown from next-countdown, advance the week (only once per cycle)
    if (prevMatchState === 'next-countdown' && matchState === 'pre-countdown' && !hasAdvancedThisCycle) {
      console.log('🔄 Week cycle complete, advancing to next week');
      let nextIdx = currentTimeframeIdx + 1;
      let newSchedule = fixtureSchedule;
      if (nextIdx >= totalWeeks) {
        // Week 36 reached! Check for auto-reshuffle
        const reshuffled = checkAndAutoReshuffle(totalWeeks);
        if (reshuffled) {
          console.log('✅ Auto-reshuffle triggered! Reloading page to load new fixtures...');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return; // Exit early, reload will handle the rest
        }
        
        // If no auto-reshuffle, reshuffle manually and restart
        const league = leagues.find(l => l.countryCode === selectedCountry);
        newSchedule = generateLeagueFixtures(league);
        setFixtureSchedule(newSchedule);
        nextIdx = 0;
      }
      // Save synchronized system state to Supabase and localStorage
      const newState = {
        currentWeek: nextIdx + 1,
        currentTimeframeIdx: nextIdx,
        matchState: 'pre-countdown',
        countdown: 10,
      };
      saveSystemState(newState);
      saveSystemStateToSupabase(newState).catch(err => console.error('Failed to save week progression:', err));
      
      // Update local state AND selected time slot
      setCurrentTimeframeIdx(nextIdx);
      setLiveTimeframeIdx(nextIdx);
      setSelectedMatchup(null);
      // Important: update selectedTimeSlot to show new week's matches
      if (timeSlots && timeSlots[nextIdx]) {
        setSelectedTimeSlot(timeSlots[nextIdx]);
      }
      
      // Mark that we've advanced in this cycle to prevent duplicate advances
      setHasAdvancedThisCycle(true);
    }
    
    // Reset the advance flag when we exit the pre-countdown state
    if (matchState !== 'pre-countdown') {
      setHasAdvancedThisCycle(false);
    }
    
    setPrevMatchState(matchState);
  }, [matchState, timeSlots, hasAdvancedThisCycle, currentTimeframeIdx, fixtureSchedule]);
  // Match flow effect
  React.useEffect(() => {
    let timer: any;
    if (matchState === 'pre-countdown') {
      // Only start countdown if not already running
      if (countdown === 10) {
        timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setMatchState('playing');
              setMatchTimer(0);
              return 10;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else if (matchState === 'playing') {
      setMatchTimer(0);
      timer = setInterval(() => {
        setMatchTimer(prev => {
          if (prev >= 90) {
            clearInterval(timer);
            setMatchState('betting');
            setBettingTimer(30);
            return 90;
          }
          return prev + Math.ceil(90 / 40); // increment so 0-90 in 40s
        });
      }, 1000);
    } else if (matchState === 'betting') {
      setBettingTimer(30);
      timer = setInterval(() => {
        setBettingTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setMatchState('next-countdown');
            setCountdown(10);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (matchState === 'next-countdown') {
      if (countdown === 10) {
        timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setMatchState('pre-countdown');
              setCountdown(10);
              return 10;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
    return () => clearInterval(timer);
  }, [matchState]);

  // UPDATE ODDS WHEN ENTERING BETTING PHASE - calculate dynamic odds based on match result
  React.useEffect(() => {
    if (matchState === 'betting' && selectedTimeSlot && matchupsByTimeframe[selectedTimeSlot.toISOString()]) {
      console.log('💰 [ODDS UPDATE] Entering betting phase - recalculating odds based on match results');
      
      // Get the matches for this timeframe
      const matches = matchupsByTimeframe[selectedTimeSlot.toISOString()];
      
      // Calculate odds for each match and store in cache
      const updatedBetTypes: any = {};
      
      matches.forEach((match: any) => {
        const sim = matchSimCache[match.id];
        if (sim) {
          const homeGoals = sim.homeGoals;
          const awayGoals = sim.awayGoals;
          
          console.log(`⚡ Updating odds for ${match.homeTeam.shortName} vs ${match.awayTeam.shortName}: ${homeGoals}-${awayGoals}`);
          
          // Calculate dynamic odds for this match
          const dynamicOdds = calculateDynamicOdds(homeGoals, awayGoals);
          updatedBetTypes[match.id] = dynamicOdds;
        }
      });
      
      // Update the dynamic bet types state with calculated odds
      if (Object.keys(updatedBetTypes).length > 0) {
        // Store per-match odds in a way we can access them
        setSelectedBetTypesByMatch(updatedBetTypes);
        
        // Update default bet types to show the first match's odds
        const firstMatchId = matches[0]?.id;
        if (firstMatchId && updatedBetTypes[firstMatchId]) {
          const firstMatchOdds = updatedBetTypes[firstMatchId]['1X2'];
          setDynamicBetTypes(prev => [
            { type: "1X2", ...firstMatchOdds },
            { type: "BTTS", ...updatedBetTypes[firstMatchId]['BTTS'] },
            { type: "OV/UN 1.5", ...updatedBetTypes[firstMatchId]['OV/UN 1.5'] },
            { type: "OV/UN 2.5", ...updatedBetTypes[firstMatchId]['OV/UN 2.5'] },
            { type: "Total Goals", ...updatedBetTypes[firstMatchId]['Total Goals'] },
            { type: "Time of First Goal", ...updatedBetTypes[firstMatchId]['Time of First Goal'] },
            { type: "Total Goals Odd/Even", ...updatedBetTypes[firstMatchId]['Total Goals Odd/Even'] },
          ]);
          setSelectedBetType({ type: "1X2", ...firstMatchOdds });
        }
        
        console.log('✅ [ODDS UPDATE] Dynamic odds calculated and updated');
      }
    }
  }, [matchState, selectedTimeSlot, matchupsByTimeframe, matchSimCache]);

  // Load history on mount
  React.useEffect(() => {
    setMatchHistory(getMatchHistory());
  }, []);

  // Save results after each match simulation (when match ends)
  React.useEffect(() => {
    if (matchState === 'betting' && selectedTimeSlot && matchupsByTimeframe[selectedTimeSlot.toISOString()] && !resultsSavedForPhase) {
      console.log(`\n🎮 [MATCH FLOW] =====================`);
      console.log(`🎮 [MATCH FLOW] MATCH ENDED - Entering betting phase`);
      console.log(`🎮 [MATCH FLOW] Timestamp: ${new Date().toISOString()}`);
      console.log(`🎮 [MATCH FLOW] =====================\n`);
      
      const handleMatchResults = async () => {
        console.log(`🎮 [MATCH FLOW] Starting match result handler`);
        const matches = matchupsByTimeframe[selectedTimeSlot.toISOString()];
        console.log(`🎮 [MATCH FLOW] Processing ${matches.length} matches from this timeframe`);
        
        // Process all matches for this timeframe
        await Promise.all(matches.map(async (match: any) => {
          const sim = matchSimCache[match.id];
          console.log(`\n🎮 [MATCH FLOW] Match ${match.id}:`);
          console.log(`🎮 [MATCH FLOW]   Teams: ${match.homeTeam.shortName} vs ${match.awayTeam.shortName}`);
          console.log(`🎮 [MATCH FLOW]   Sim cache: ${sim ? `${sim.homeGoals}-${sim.awayGoals}` : 'MISSING! ⚠️'}`);
          if (sim) {
            console.log(`🎮 [MATCH FLOW]   ✓ Processing simulation`);
            saveMatchResult({
              id: match.id,
              homeTeam: match.homeTeam.shortName,
              awayTeam: match.awayTeam.shortName,
              homeGoals: sim.homeGoals,
              awayGoals: sim.awayGoals,
              winner: sim.winner,
              time: new Date().toLocaleString(),
              country: selectedCountry
            });
            console.log(`🎮 [MATCH FLOW]   ✓ Saved to history`);
            
            // CRITICAL: Save match scores back to Supabase so reconciliation worker can find them
            // This updates the matches.raw JSONB field with final scores and 'ft' status
            // AND saves to match_results table for bet resolution
            try {
              console.log(`🎮 [MATCH FLOW]   → Fetching match from DB...`);
              const { data: existingMatch } = await supabase
                .from('matches')
                .select('raw')
                .eq('id', match.id)
                .single();
              console.log(`🎮 [MATCH FLOW]   → Match status: ${existingMatch ? 'FOUND ✓' : 'NOT FOUND ✗'}`);
              
              if (existingMatch) {
                const updatedRaw = {
                  ...(existingMatch.raw || {}),
                  home_score: sim.homeGoals,
                  away_score: sim.awayGoals,
                  homeScore: sim.homeGoals,
                  awayScore: sim.awayGoals,
                  status: 'ft',
                  finished: true,
                  match_finished: true
                };
                
                console.log(`🎮 [MATCH FLOW]   → Updating matches.raw with scores (${sim.homeGoals}-${sim.awayGoals})`);
                await supabase
                  .from('matches')
                  .update({ raw: updatedRaw })
                  .eq('id', match.id);
                console.log(`🎮 [MATCH FLOW]   ✓ matches.raw updated`);
                
                console.log(`🎮 [MATCH FLOW]   → Checking for existing match_results...`);
                const { data: existingResult } = await supabase
                  .from('match_results')
                  .select('id')
                  .eq('match_id', match.id)
                  .single();
                console.log(`🎮 [MATCH FLOW]   → Result status: ${existingResult ? 'EXISTS' : 'NEW'}`);
                
                let resultWinner: 'home' | 'away' | 'draw' = 'draw';
                if (sim.homeGoals > sim.awayGoals) resultWinner = 'home';
                else if (sim.awayGoals > sim.homeGoals) resultWinner = 'away';
                
                if (existingResult) {
                  // Update existing result
                  console.log(`🎮 [MATCH FLOW]   → UPDATING match_results...`);
                  await supabase
                    .from('match_results')
                    .update({
                      home_goals: sim.homeGoals,
                      away_goals: sim.awayGoals,
                      winner: resultWinner,
                      is_final: true
                    })
                    .eq('match_id', match.id);
                  console.log(`🎮 [MATCH FLOW]   ✓ match_results UPDATED`);
                } else {
                  // Insert new result
                  console.log(`🎮 [MATCH FLOW]   → INSERTING match_results...`);
                  await supabase
                    .from('match_results')
                    .insert({
                      match_id: match.id,
                      home_goals: sim.homeGoals,
                      away_goals: sim.awayGoals,
                      winner: resultWinner,
                      is_final: true
                    });
                  console.log(`🎮 [MATCH FLOW]   ✓ match_results INSERTED`);
                }
                
                console.log(`\n✓ Match ${match.id} saved successfully`);
                console.log(`✓   DB: matches + match_results updated`);
                
                // CRITICAL: Automatically resolve all pending bets for this match now that results are finalized
                console.log(`🎯 [BET RESOLUTION] Calling resolveBetsForMatch(${match.id}, ${sim.homeGoals}, ${sim.awayGoals})`);
                const resolutionResult = await resolveBetsForMatch(match.id, sim.homeGoals, sim.awayGoals);
                if (resolutionResult.error) {
                  console.error(`❌ [BET RESOLUTION] Error resolving bets for match ${match.id}:`, resolutionResult.error);
                } else {
                  console.log(`✅ [BET RESOLUTION] Resolved ${resolutionResult.resolved} bets for match ${match.id}`);
                }
              }
            } catch (err) {
              console.error(`❌ [MATCH FLOW] EXCEPTION while processing match ${match.id}`);
              console.error(`❌ [MATCH FLOW] Error: ${err instanceof Error ? err.message : String(err)}`);
              console.error(`❌ [MATCH FLOW] Type: ${err instanceof Error ? err.name : typeof err}`);
            }
          }
        }));
        
        setMatchHistory(getMatchHistory());
        setResultsSavedForPhase(true);
        
        // SAFETY MECHANISM: After all bets are resolved, schedule a timeout check in 95 seconds
        // This ensures no bets stay pending longer than 90 seconds
        const timeoutIds: NodeJS.Timeout[] = [];
        const allMatches = matchupsByTimeframe[selectedTimeSlot.toISOString()];
        if (allMatches) {
          allMatches.forEach((match: any) => {
            const timeoutId = setTimeout(async () => {
              console.log(`\n⏰ [BET TIMEOUT] Safety check triggered (95 seconds after match end) for ${match.id}`);
              const staleCheckResult = await forceResolveStaleBets(match.id);
              if (staleCheckResult.forced > 0) {
                console.warn(`⚠️  [BET TIMEOUT] Safety mechanism force-resolved ${staleCheckResult.forced} stuck bets`);
              }
            }, 95000); // 95 seconds = 90 second match + 5 second safety buffer
            timeoutIds.push(timeoutId);
          });
        }
        
        // Cleanup timeouts when component unmounts or phase changes
        return () => {
          timeoutIds.forEach(id => clearTimeout(id));
        };
      };
      
      handleMatchResults();
    }
    
    // Reset flag when leaving betting phase
    if (matchState !== 'betting') {
      setResultsSavedForPhase(false);
    }
  }, [matchState, selectedTimeSlot, matchupsByTimeframe, matchSimCache, selectedCountry, resultsSavedForPhase]);

  // Poll system state every 2 seconds to detect when admin changes timeframe
  React.useEffect(() => {
    // CHECK: Skip polling if global time system is active
    const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
    if (isGlobalTimeActive) {
      console.log('✅ Global time system is active - SKIPPING system state polling');
      return;
    }

    const pollInterval = setInterval(() => {
      const systemState = getSystemState();
      // If the system's current timeframe changed (admin advanced), update local state
      if (systemState.currentTimeframeIdx !== currentTimeframeIdx) {
        setCurrentTimeframeIdx(systemState.currentTimeframeIdx);
        setLiveTimeframeIdx(systemState.currentTimeframeIdx);
        if (timeSlots[systemState.currentTimeframeIdx]) {
          setSelectedTimeSlot(timeSlots[systemState.currentTimeframeIdx]);
          setSelectedMatchup(null);
        }
      }
    }, 2000);
    return () => clearInterval(pollInterval);
  }, [currentTimeframeIdx, timeSlots]);

  const handlePlaceBet = () => {
    const stakeNum = Number(stake);
    if (!user) {
      alert("You must be logged in to place a bet.");
      return;
    }
    if (!stake || isNaN(stakeNum) || stakeNum < 50) {
      alert("Minimum stake is 50 KES.");
      return;
    }
    if (stakeNum > balance) {
      alert("Insufficient balance.");
      return;
    }
    if (!selectedMatchup || !selectedBetType || selectedSelection === null) return;
    setBetSlip({
      match: selectedMatchup,
      betType: selectedBetType.type,
      selection: selectedBetType.selections[selectedSelection],
      odds: selectedBetType.odds[selectedSelection],
      stake: stakeNum,
      potentialWin: (stakeNum * Number(selectedBetType.odds[selectedSelection])).toFixed(2)
    });
    setShowModal(true);
  };
  const confirmBet = async () => {
    // Check if we're in single-bet mode (modal) or multi-bet mode (betslip array)
    const betsToPlace = betslip && betslip.length > 0 ? betslip : betSlip ? [betSlip] : null;
    
    if (!betsToPlace || betsToPlace.length === 0) {
      alert("Bet slip is empty. Please create a bet first.");
      return;
    }
    
    // Validate user is logged in
    if (!user) {
      alert("You must be logged in to place a bet.");
      return;
    }

    try {
      console.log("🎯 Placing bets atomically, count:", betsToPlace.length);
      
      // Calculate total stake
      const totalStake = betsToPlace.reduce((sum, bet) => sum + (bet.stake || 0), 0);
      console.log("💰 Total stake:", totalStake);

      // Transform bets to the format expected by placeBetsAtomic
      const formattedBets = betsToPlace.map(bet => {
        // Get match ID - handle both formats
        const matchId = bet.match?.id || bet.match_id;
        if (!matchId) {
          throw new Error("Bet missing match_id");
        }
        return {
          match_id: matchId,
          bet_type: bet.betType,
          selection: bet.selection,
          amount: bet.stake,
          odds: bet.odds,
        };
      });

      console.log("📦 Formatted bets:", formattedBets);

      // Use atomic RPC function to place all bets in a single transaction
      // This prevents race conditions and ensures balance consistency
      const response = await placeBetsAtomic(user.id, formattedBets);

      if (response.status === 'ok') {
        console.log("✅ All bets placed atomically!", response);
        
        // Clear bets and show success
        setBetslip([]);
        setStake("");
        setShowModal(false);
        setBetslipOpen(false);
        setBetPlaced(true);
        setTimeout(() => setBetPlaced(false), 2000);
        
        // Balance will update automatically via realtime subscription
        console.log("✓ Waiting for realtime balance update...");
      } else {
        console.error("❌ Atomic bet placement failed:", response.error);
        
        // Handle specific error cases
        if (response.error?.includes("insufficient balance")) {
          alert("Insufficient balance. Please reduce your stake.");
        } else if (response.error?.includes("validation")) {
          alert("Invalid bet. Please check your selections.");
        } else {
          alert(`Failed to place bet: ${response.error || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error("❌ Exception during atomic bet placement:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert("Failed to place bet: " + errorMsg);
    }
  };

  // Circular countdown component
  const CircularCountdown = ({ seconds, label }: { seconds: number; label?: string }) => {
    const radius = 40;
    const stroke = 6;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const percent = seconds / 10;
    const strokeDashoffset = circumference - percent * circumference;
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
          <svg height={radius * 2} width={radius * 2}>
            <circle
              stroke="#e5e7eb"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke="#22c55e"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
          <span className="absolute left-1/2 top-1/2 text-4xl font-bold text-primary" style={{ transform: 'translate(-50%, -50%)' }}>{seconds}</span>
        </div>
        {/* Render label if provided */}
        {label && (
          <span className="mt-2 text-lg text-muted-foreground font-semibold">{label}</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Success Toast Message */}
      {betPlaced && (
        <div className="fixed top-2 sm:top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 sm:px-0">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 sm:px-8 py-2 sm:py-4 rounded-lg shadow-2xl flex items-center gap-2 sm:gap-3 font-bold text-sm sm:text-lg border-2 border-green-300 animate-pulse">
            <span className="text-lg sm:text-2xl">✓</span>
            <span>Bet placed successfully!</span>
          </div>
        </div>
      )}
      <UserNotifications />
      <BettingHeader />
      <NavigationTabs />
      <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 max-w-7xl mx-auto">
        {/* Admin panel - Disabled */}

        {/* History button */}
        <div className="flex justify-end mb-3 sm:mb-4">
          <Button 
            variant="outline" 
            onClick={() => setShowHistory(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-blue-400/50 font-bold shadow-lg hover:shadow-blue-500/50 transition-all duration-300 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
          >
            📊 View Match History
          </Button>
        </div>

        {/* History Modal */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-lg mx-auto bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-blue-500/30 text-white backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">📜 Match History</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-500/30 scrollbar-track-slate-700/20">
              {matchHistory.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-slate-400 text-sm sm:text-base">No match history yet.</div>
              ) : (
                matchHistory.slice().reverse().map((mh, idx) => (
                  <div key={idx} className="border border-blue-500/30 rounded-lg p-2 sm:p-3 flex flex-col bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-blue-400/50 transition-all duration-300">
                    <div className="font-bold text-cyan-300 text-sm sm:text-base">{mh.homeTeam} vs {mh.awayTeam}</div>
                    <div className="text-slate-300 text-xs sm:text-sm">Score: <span className="font-bold text-yellow-400">{mh.homeGoals} - {mh.awayGoals}</span></div>
                    <div className="text-slate-300 text-xs sm:text-sm">Winner: <span className="font-bold text-green-400">{mh.winner}</span></div>
                    <div className="text-xs text-slate-500 mt-1">{mh.time} • {mh.country}</div>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setShowHistory(false)} className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Country selection tabs */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-500/30 scrollbar-track-slate-700/20">
          {leagues.map(league => {
            const isCountrySelected = selectedCountry === league.countryCode;
            const countryBtnClass = isCountrySelected 
              ? "px-5 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400 bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-2 border-cyan-300 shadow-cyan-500/50"
              : "px-5 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400 bg-gradient-to-r from-slate-700 to-slate-800 text-slate-200 hover:from-slate-600 hover:to-slate-700 border-2 border-slate-600/30";
            return (
            <React.Fragment key={league.countryCode}>
              <button 
                onClick={() => { 
                  setSelectedCountry(league.countryCode); 
                  setSelectedMatchup(null);
                  setCurrentTimeframeIdx(liveTimeframeIdx);
                  // When switching countries, auto-select the current live timeframe
                  if (timeSlots.length > liveTimeframeIdx && liveTimeframeIdx >= 0) {
                    setSelectedTimeSlot(timeSlots[liveTimeframeIdx]);
                  }
                }} 
                className={countryBtnClass}
                aria-pressed={isCountrySelected}
              >
                <span className="text-lg mr-2">{league.flag}</span>{league.country}
              </button>
              {league.countryCode === "ke" && (
                <button
                  onClick={() => setShowFixture(true)}
                  className="px-5 py-3 rounded-lg font-bold text-sm whitespace-nowrap bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white ml-2 shadow-lg hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-200"
                >
                  📋 Fixture
                </button>
              )}
            </React.Fragment>
            );
          })}
        </div>


              {/* Fixture Modal */}
              {showFixture && (
                <Dialog open={showFixture} onOpenChange={setShowFixture}>
                  <DialogContent className="max-w-4xl w-[95vw] sm:w-auto mx-auto overflow-y-auto max-h-[90vh] bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-purple-500/30 text-white backdrop-blur-xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl sm:text-2xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">🏆 League Fixtures (Week 1-36)</DialogTitle>
                    </DialogHeader>
                    {/* Country selection tabs for fixture modal */}
                    <div className="flex gap-1 sm:gap-2 mb-3 sm:mb-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-500/30">
                      {leagues.map(league => {
                        const isFixtureCountrySelected = selectedFixtureCountry === league.countryCode;
                        const fixtureBtnClass = isFixtureCountrySelected
                          ? "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 shadow-lg focus:outline-none bg-gradient-to-r from-purple-600 to-pink-600 text-white border-2 border-purple-300 shadow-purple-500/50"
                          : "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 shadow-lg focus:outline-none bg-gradient-to-r from-slate-700 to-slate-800 text-slate-200 hover:from-slate-600 hover:to-slate-700 border-2 border-slate-600/30";
                        return (
                        <button
                          key={league.countryCode}
                          onClick={() => setSelectedFixtureCountry(league.countryCode)}
                          className={fixtureBtnClass}
                          aria-pressed={isFixtureCountrySelected}
                        >
                          <span className="text-lg mr-1">{league.flag}</span>{league.country}
                        </button>
                        );
                      })}
                    </div>
                    <div className="space-y-6">
                      {leagues.filter(l => l.countryCode === selectedFixtureCountry).map(league => (
                        <div key={league.countryCode}>
                          <div className="font-bold text-xl mb-4 text-cyan-300">{league.country} - {league.name}</div>
                          {generateLeagueFixtures(league).map(week => (
                            <div key={week.week} className="mb-5">
                              <div className="font-semibold text-purple-300 mb-2 text-lg">📅 Week {week.week}</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {week.matches.map((m, idx) => (
                                  <div key={idx} className="flex items-center gap-2 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg px-3 py-2 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300">
                                    <img src={getLogoPath(m.home)} alt={m.home.shortName} className="w-6 h-6 object-contain rounded-full border border-slate-600 bg-slate-800" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                                    <span className="font-bold text-sm text-cyan-300">{m.home.shortName}</span>
                                    <span className="mx-2 text-xs text-slate-400">vs</span>
                                    <img src={getLogoPath(m.away)} alt={m.away.shortName} className="w-6 h-6 object-contain rounded-full border border-slate-600 bg-slate-800" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                                    <span className="font-bold text-sm text-cyan-300">{m.away.shortName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <DialogFooter className="flex gap-2 justify-end mt-4">
                      <Button onClick={() => setShowFixture(false)} className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold">Close</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
        {/* Dynamic Time Slots */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-green-500/30 scrollbar-track-slate-700/20">
          {timeSlots.map((slot, idx) => {
            const isSelected = slot.getTime() === selectedTimeSlot.getTime();
            const isLive = idx === liveTimeframeIdx;
            const slotBtnClass = isSelected
              ? "px-5 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-400 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-2 border-green-300 shadow-green-500/50"
              : "px-5 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-400 bg-gradient-to-r from-slate-700 to-slate-800 text-slate-200 hover:from-slate-600 hover:to-slate-700 border-2 border-slate-600/30";
            return (
              <button
                key={slot.toISOString()}
                onClick={() => { 
                  // CHECK: Skip saving if global time system is active
                  const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
                  
                  setSelectedTimeSlot(slot); 
                  setSelectedMatchup(null);
                  setCurrentTimeframeIdx(idx);
                  
                  // Only save to system state if global time system NOT active
                  if (!isGlobalTimeActive) {
                    // Save the synchronized timeframe change so all users see same week
                    const systemState = getSystemState();
                    systemState.currentTimeframeIdx = idx;
                    saveSystemState(systemState);
                  }
                }}
                className={slotBtnClass}
                aria-pressed={isSelected}
              >
                {slot.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                {isLive && (
                  <span className="ml-2 px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold animate-pulse">🔴 LIVE</span>
                )}
              </button>
            );
          })}
        </div>
        {/* Bet Type Selection & Correct Score Button - Only for upcoming matches */}
        {currentTimeframeIdx > liveTimeframeIdx && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-slate-700/20 flex-wrap">
            {betTypes.map((bt) => {
              const isBetTypeSelected = selectedBetType.type === bt.type;
              const betTypeBtnClass = isBetTypeSelected
                ? "px-4 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-2 border-cyan-300 shadow-cyan-500/50"
                : "px-4 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 bg-gradient-to-r from-slate-700 to-slate-800 text-slate-200 hover:from-slate-600 hover:to-slate-700 border-2 border-slate-600/30";
              return (
              <button
                key={bt.type}
                onClick={() => setSelectedBetType(bt)}
                className={betTypeBtnClass}
                aria-pressed={isBetTypeSelected}
              >
                {bt.type}
              </button>
              );
            })}
            <button
              onClick={() => setShowCorrectScore(true)}
              className="px-4 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 shadow-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white border-2 border-orange-400/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900"
              title="Correct Score Betting"
            >
              📊 Correct Score
            </button>
          </div>
        )}
        {/* Bet Slip Preview & Confirmation Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-sm mx-auto bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-cyan-500/30 text-white backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">✓ Confirm Your Bet</DialogTitle>
            </DialogHeader>
            {betSlip && (
              <div className="space-y-3">
                <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg"><span className="text-slate-300">Match:</span> <span className="font-bold text-cyan-300">{betSlip.match.homeTeam.shortName} vs {betSlip.match.awayTeam.shortName}</span></div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg"><span className="text-slate-300">Bet Type:</span> <span className="font-bold text-cyan-300">{betSlip.betType}</span></div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg"><span className="text-slate-300">Selection:</span> <span className="font-bold text-cyan-300">{betSlip.selection}</span></div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg"><span className="text-slate-300">Odds:</span> <span className="font-bold text-yellow-400">{betSlip.odds}</span></div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg"><span className="text-slate-300">Stake:</span> <span className="font-bold text-purple-400">KES {betSlip.stake}</span></div>
                <div className="flex justify-between bg-gradient-to-r from-green-900/30 to-emerald-900/30 p-3 rounded-lg border border-green-500/50"><span className="text-green-300">Potential Win:</span> <span className="font-bold text-green-400 text-lg">KES {betSlip.potentialWin}</span></div>
              </div>
            )}
            <DialogFooter className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowModal(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100">Cancel</Button>
              <Button onClick={confirmBet} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg hover:shadow-green-500/50">Confirm Bet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Show current match week on top of match section */}
        <div className="w-full flex justify-center items-center mb-3 sm:mb-4">
          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">🏟️ Match Week {currentTimeframeIdx + 1}</span>
        </div>
        
        {/* Show upcoming/past matches when viewing non-live timeframe */}
        {currentTimeframeIdx !== liveTimeframeIdx && selectedTimeSlot && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-10">
            <div className="w-full">
              {selectedTimeSlot && matchupsByTimeframe[selectedTimeSlot.toISOString()] && matchupsByTimeframe[selectedTimeSlot.toISOString()].length > 0 ? (
                <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 p-4 sm:p-6 rounded-xl mb-3 sm:mb-4 border-2 border-blue-500/30 shadow-lg">
                  <div className="text-center mb-4 sm:mb-6">
                    <p className="text-sm sm:text-lg font-bold text-blue-300">
                      {currentTimeframeIdx < liveTimeframeIdx ? '📅 BetXPesa wins' : '📊 Final Results'}
                    </p>
                  </div>
                  {/* Filter matches by selected country */}
                  {(() => {
                    const allMatches = matchupsByTimeframe[selectedTimeSlot.toISOString()];
                    const filteredMatches = getMatchesByCountry(allMatches, selectedCountry);
                    
                    if (filteredMatches.length === 0) {
                      return <div className="text-center text-slate-400 py-4">🏟️ Matches loading for {selectedCountry.toUpperCase()}...</div>;
                    }
                    
                    return filteredMatches.map((match, idx) => {
                    // Show results only for past matches, betting options for upcoming matches
                    const currentAdminSettings = getAdminSettings();
                    const manualOutcome = currentAdminSettings.manualOutcomes?.[match.id];
                    
                    // For past matches, check if we have a stored result
                    let homeGoals, awayGoals, winner;
                    if (currentTimeframeIdx < liveTimeframeIdx) {
                      // Past match - ONLY use stored result, don't re-simulate
                      const storedResult = matchHistory.find(mh => mh.id === match.id);
                      if (storedResult) {
                        homeGoals = storedResult.homeGoals;
                        awayGoals = storedResult.awayGoals;
                        winner = storedResult.winner;
                      } else {
                        // No stored result for this past match - this shouldn't happen in normal flow
                        // but if it does, use manual override only (don't re-simulate)
                        if (manualOutcome) {
                          homeGoals = manualOutcome.homeGoals || 0;
                          awayGoals = manualOutcome.awayGoals || 0;
                          winner = manualOutcome.winner || 'draw';
                        } else {
                          // Default: treat as unknown result
                          homeGoals = '?';
                          awayGoals = '?';
                          winner = null;
                        }
                      }
                    } else {
                      // Current/Future match - use simulation for display purposes only
                      const result = simulateMatch(match.id, 40, manualOutcome);
                      homeGoals = result.homeGoals;
                      awayGoals = result.awayGoals;
                      winner = result.winner;
                    }
                    
                    return currentTimeframeIdx > liveTimeframeIdx ? (
                      // Show BETTING OPTIONS for upcoming matches
                      <div key={match.id} className="flex flex-col sm:flex-row gap-2 sm:gap-3 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-3 sm:p-4 mb-2 sm:mb-3 shadow-lg border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 w-full">
                        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 flex-1">
                          {/* LEFT SIDE: Teams */}
                          <div className="flex flex-col gap-1 sm:gap-2 min-w-max">
                            <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-slate-900 to-slate-950 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-700/50">
                              <img src={getLogoPath(match.homeTeam)} alt={match.homeTeam.shortName} className="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded-full border border-slate-600 bg-slate-800" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                              <span className="font-bold text-sm sm:text-lg text-cyan-300">{match.homeTeam.shortName}</span>
                            </div>
                            <span className="text-xs text-slate-400 font-semibold text-center">vs</span>
                            <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-slate-900 to-slate-950 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-700/50">
                              <img src={getLogoPath(match.awayTeam)} alt={match.awayTeam.shortName} className="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded-full border border-slate-600 bg-slate-800" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                              <span className="font-bold text-sm sm:text-lg text-cyan-300">{match.awayTeam.shortName}</span>
                            </div>
                          </div>
                          
                          {/* RIGHT SIDE: Outcomes */}
                          <div className="flex gap-1 sm:gap-2 flex-wrap flex-1 justify-end sm:justify-start">
                            {(() => {
                              // Get match-specific odds if in betting phase, otherwise use default
                              const matchOdds = selectedBetTypesByMatch[match.id]?.[selectedBetType.type];
                              const displayOdds = matchOdds || selectedBetType;
                              return displayOdds.selections.map((sel, selIdx) => {
                                const btnTitle = "Add " + selectedBetType.type + ": " + sel + " @ " + displayOdds.odds[selIdx];
                                return (
                                <button
                                  key={sel}
                                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg hover:shadow-cyan-500/50 border border-cyan-400/30"
                                  onClick={() => {
                                    // Add bet to betslip with selected bet type
                                    setBetslip(prev => {
                                      // Prevent duplicate bets for same match and bet type
                                      const filtered = prev.filter(b => !(b.match.id === match.id && b.betType === selectedBetType.type));
                                      return [
                                        ...filtered,
                                        {
                                          match,
                                          betType: selectedBetType.type,
                                          selection: displayOdds.selections[selIdx],
                                          odds: displayOdds.odds[selIdx],
                                          stake: 50,
                                        }
                                      ];
                                    });
                                  }}
                                  title={btnTitle}
                                >
                                  {sel} <span className="text-yellow-300">@{displayOdds.odds[selIdx]}</span>
                                </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Show RESULTS for past matches - COMPACT VIEW
                      <div key={match.id} className="flex items-center justify-between gap-3 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-3 mb-2 shadow-lg border border-green-500/30 w-full">
                        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                          <img src={getLogoPath(match.homeTeam)} alt={match.homeTeam.shortName} className="w-6 h-6 object-contain rounded-full border border-slate-600 bg-slate-800" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                          <span className="font-bold text-sm text-cyan-300 truncate">{match.homeTeam.shortName}</span>
                        </div>
                        <div className="text-center flex-shrink-0">
                          <div className="px-3 py-1 bg-gradient-to-r from-yellow-600/80 to-amber-600/80 text-white rounded-lg text-lg font-bold border border-yellow-400/50 shadow-lg">
                            {homeGoals}-{awayGoals}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                          <span className="font-bold text-sm text-cyan-300 truncate">{match.awayTeam.shortName}</span>
                          <img src={getLogoPath(match.awayTeam)} alt={match.awayTeam.shortName} className="w-6 h-6 object-contain rounded-full border border-slate-600 bg-slate-800" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                        </div>
                        <div className="text-xs text-yellow-400 font-bold flex-shrink-0">
                          {winner === 'home' ? '✓' : winner === 'away' ? '✗' : '='}
                        </div>
                      </div>
                    );
                    });
                    })()}
                  
                  {/* Floating Betslip for non-live timeframe */}
                  {betslip.length > 0 && betslipOpen ? (
                    <div className="fixed md:bottom-6 md:right-6 bottom-2 left-1/2 md:left-auto transform md:translate-x-0 -translate-x-1/2 z-50 bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-purple-500/50 rounded-xl shadow-2xl p-3 sm:p-5 w-[95vw] sm:w-full max-w-xs md:max-w-sm md:w-96 backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-2 sm:mb-4">
                          <div className="font-bold text-sm sm:text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">🎫 Bet Slip</div>
                          <button className="text-xl sm:text-2xl text-red-500 font-bold px-1 sm:px-2 hover:text-red-400 transition" onClick={() => setBetslipOpen(false)} title="Hide betslip">×</button>
                        </div>
                        <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-slate-700/20">
                          {betslip.map((bet, idx) => (
                            <div key={idx} className="flex flex-col border-b border-slate-700/50 pb-2 sm:pb-3 mb-1 sm:mb-2">
                              <div className="flex justify-between text-slate-300 font-semibold text-xs sm:text-sm"><span>Match:</span> <span className="text-cyan-300 text-xs sm:text-sm">{bet.match.homeTeam.shortName} vs {bet.match.awayTeam.shortName}</span></div>
                              <div className="flex justify-between text-slate-300 font-semibold text-xs sm:text-sm"><span>Selection:</span> <span className="text-cyan-300 text-xs sm:text-sm">{bet.selection}</span></div>
                              <div className="flex justify-between text-slate-300 font-semibold text-xs sm:text-sm"><span>Odds:</span> <span className="text-yellow-400 font-bold">{bet.odds}</span></div>
                              <div className="flex justify-between items-center text-slate-300 font-semibold gap-1 sm:gap-2 text-xs sm:text-sm"><span>Stake:</span> <input type="number" min="50" value={bet.stake} onChange={(e) => { const updated = [...betslip]; updated[idx].stake = Number(e.target.value); setBetslip(updated); }} className="border-2 border-slate-600 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 w-16 sm:w-20 text-xs text-slate-200 bg-slate-800/50 focus:border-purple-500 focus:outline-none" /> KES</div>
                              <button className="text-xs text-red-500 hover:text-red-400 mt-1 sm:mt-2 self-end font-bold transition" onClick={() => setBetslip(betslip.filter((_, i) => i !== idx))}>🗑️ Remove</button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 sm:mt-4 border-t border-slate-700/50 pt-2 sm:pt-3 flex justify-between font-bold text-slate-300 text-xs sm:text-sm">
                          <span>Total Stake:</span>
                          <span className="text-purple-400">KES {betslip.reduce((sum, b) => sum + b.stake, 0)}</span>
                        </div>
                        <div className="flex gap-1 sm:gap-2 justify-end mt-2 sm:mt-4">
                          <Button variant="outline" onClick={() => setShowBetSlipHistory(true)} className="border-slate-600 text-slate-300 hover:bg-slate-800 text-xs px-2 sm:px-3 py-1 sm:py-2">📋 History</Button>
                          <Button variant="outline" onClick={() => setShowSaveDialog(true)} className="border-slate-600 text-slate-300 hover:bg-slate-800 text-xs px-2 sm:px-3 py-1 sm:py-2">💾 Save</Button>
                          <Button variant="outline" onClick={() => setBetslipOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800 text-xs px-2 sm:px-3 py-1 sm:py-2">Close</Button>
                          <Button
                            onClick={async () => {
                              if (!user) {
                                window.location.href = "/login";
                                return;
                              }
                              const totalStake = betslip.reduce((sum, b) => sum + b.stake, 0);
                              if (totalStake > balance) {
                                alert("Insufficient balance.");
                                return;
                              }
                              if (betslip.some(b => b.stake < 50)) {
                                alert("Minimum stake per bet is 50 KES.");
                                return;
                              }
                              // Proceed with bet placement
                              confirmBet();
                            }}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm"
                          >
                            Place Bets
                          </Button>
                        </div>
                      </div>
                  ) : betslip.length > 0 ? (
                    <button
                      onClick={() => setBetslipOpen(true)}
                      className="fixed md:bottom-6 md:right-6 bottom-2 right-2 sm:bottom-4 sm:right-4 md:left-auto z-50 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-2 sm:px-4 py-1.5 sm:py-3 rounded-full shadow-lg hover:shadow-purple-500/50 transition-all text-xs sm:text-sm"
                    >
                      🎫 {betslip.length} Bets
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">⏳ Check back soon for upcoming matches</div>
              )}
            </div>
          </div>
        )}

        {/* Correct Score Modal for Current Match */}
        {showCorrectScoreForMatch && matchupsByTimeframe[selectedTimeSlot?.toISOString()]?.find(m => m.id === showCorrectScoreForMatch) && (
          <Dialog open={!!showCorrectScoreForMatch} onOpenChange={() => setShowCorrectScoreForMatch(null)}>
            <DialogContent className="max-w-sm sm:max-w-md md:max-w-2xl w-[95vw] sm:w-auto bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-orange-500/30 text-white backdrop-blur-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-2xl bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  📊 Correct Score - {matchupsByTimeframe[selectedTimeSlot?.toISOString()]?.find(m => m.id === showCorrectScoreForMatch)?.homeTeam.shortName} vs {matchupsByTimeframe[selectedTimeSlot?.toISOString()]?.find(m => m.id === showCorrectScoreForMatch)?.awayTeam.shortName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm text-slate-400">Select the correct final score for this match:</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 sm:gap-2">
                  {correctScoreOptions.map((cs, csIdx) => {
                    const scoreTitle = "Score " + cs.score + " @ " + cs.odds;
                    return (
                    <button
                      key={csIdx}
                      onClick={() => {
                        const match = matchupsByTimeframe[selectedTimeSlot?.toISOString()]?.find(m => m.id === showCorrectScoreForMatch);
                        if (match) {
                          setBetslip(prev => {
                            const filtered = prev.filter(b => !(b.match.id === match.id && b.betType === "Correct Score"));
                            return [
                              ...filtered,
                              {
                                match,
                                betType: "Correct Score",
                                selection: cs.score,
                                odds: cs.odds,
                                stake: 50,
                              }
                            ];
                          });
                          setShowCorrectScoreForMatch(null);
                        }
                      }}
                      className="bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-1.5 sm:px-3 py-2 sm:py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-orange-500/50 border border-orange-400/30 flex flex-col items-center gap-0.5 sm:gap-1"
                      title={scoreTitle}
                    >
                      <span className="text-xs sm:text-lg font-bold">{cs.score}</span>
                      <span className="text-orange-200 text-xs">@{cs.odds}</span>
                    </button>
                    );
                  })}
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCorrectScoreForMatch(null)} 
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Correct Score Modal from Main Betting Section */}
        <Dialog open={showCorrectScore} onOpenChange={setShowCorrectScore}>
          <DialogContent className="max-w-4xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-orange-500/30 text-white backdrop-blur-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">📊 Correct Score Betting</DialogTitle>
              <p className="text-sm text-slate-400 mt-2">Select a league → Select a week → Choose a match → Pick the correct score</p>
            </DialogHeader>
            <div className="space-y-6">
              {/* League Selection */}
              <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 p-4 rounded-lg border border-slate-700/50">
                <p className="text-sm font-semibold text-slate-300 mb-3">1️⃣ Select League:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {leagues.map((league) => {
                    const isLeagueSelected = selectedCorrectScoreLeague?.name === league.name;
                    const leagueBtnClass = isLeagueSelected
                      ? "p-3 rounded-lg font-semibold text-sm transition-all duration-200 border-2 bg-gradient-to-r from-orange-600 to-red-600 border-orange-300 text-white shadow-lg shadow-orange-500/50"
                      : "p-3 rounded-lg font-semibold text-sm transition-all duration-200 border-2 bg-gradient-to-r from-slate-700 to-slate-800 border-slate-600 text-slate-300 hover:from-slate-600 hover:to-slate-700";
                    return (
                    <button
                      key={league.name}
                      onClick={() => {
                        setSelectedCorrectScoreLeague(league);
                        setSelectedCorrectScoreMatch(null);
                      }}
                      className={leagueBtnClass}
                    >
                      {league.flag} {league.name}
                    </button>
                    );
                  })}
                </div>
              </div>

              {/* Week Selection */}
              {selectedCorrectScoreLeague ? (
                <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 p-4 rounded-lg border border-slate-700/50">
                  <p className="text-sm font-semibold text-slate-300 mb-3">2️⃣ Select Week:</p>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2 max-h-40 overflow-y-auto pb-2">
                    {Array.from({ length: 36 }, (_, i) => i + 1).map((week) => {
                      const isWeekSelected = selectedCorrectScoreMatch?.weekNum === week;
                      const weekBtnClass = isWeekSelected
                        ? "p-2 rounded-lg font-bold text-sm transition-all duration-200 border-2 bg-gradient-to-r from-orange-600 to-red-600 border-orange-300 text-white shadow-lg shadow-orange-500/50"
                        : "p-2 rounded-lg font-bold text-sm transition-all duration-200 border-2 bg-gradient-to-r from-slate-700 to-slate-800 border-slate-600 text-slate-300 hover:from-slate-600 hover:to-slate-700";
                      return (
                      <button
                        key={week}
                        onClick={() => {
                          setSelectedCorrectScoreMatch({ weekNum: week });
                        }}
                        className={weekBtnClass}
                      >
                        W{week}
                      </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Matches in Selected Week */}
              {selectedCorrectScoreLeague && selectedCorrectScoreMatch?.weekNum ? (
                <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 p-4 rounded-lg border border-slate-700/50">
                  <p className="text-sm font-semibold text-slate-300 mb-4">3️⃣ Week {selectedCorrectScoreMatch.weekNum} - Select Match:</p>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {generateLeagueFixtures(selectedCorrectScoreLeague)[selectedCorrectScoreMatch.weekNum - 1]?.matches.map((m, idx) => {
                      const isMatchSelected = selectedCorrectScoreMatch?.selectedMatch?.home?.name === m.home.name;
                      const matchBtnClass = isMatchSelected
                        ? "w-full p-3 rounded-lg font-semibold text-sm transition-all duration-200 border-2 flex items-center justify-between bg-gradient-to-r from-orange-600 to-red-600 border-orange-300 text-white shadow-lg shadow-orange-500/50"
                        : "w-full p-3 rounded-lg font-semibold text-sm transition-all duration-200 border-2 flex items-center justify-between bg-gradient-to-r from-slate-700 to-slate-800 border-slate-600 text-slate-300 hover:from-slate-600 hover:to-slate-700";
                      return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedCorrectScoreMatch({
                            weekNum: selectedCorrectScoreMatch.weekNum,
                            selectedMatch: { home: m.home, away: m.away }
                          });
                        }}
                        className={matchBtnClass}
                      >
                        <span className="flex items-center gap-2">
                          <img src={getLogoPath(m.home)} alt={m.home.shortName} className="w-6 h-6 object-contain rounded-full border border-slate-500 bg-slate-800" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                          {m.home.shortName}
                        </span>
                        <span className="text-xs text-slate-400">vs</span>
                        <span className="flex items-center gap-2">
                          {m.away.shortName}
                          <img src={getLogoPath(m.away)} alt={m.away.shortName} className="w-6 h-6 object-contain rounded-full border border-slate-500 bg-slate-800" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                        </span>
                      </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Correct Score Selection */}
              {selectedCorrectScoreMatch?.selectedMatch ? (
                <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 p-4 rounded-lg border border-slate-700/50">
                  <p className="text-sm font-semibold text-slate-300 mb-4">4️⃣ Pick Correct Score for <span className="text-orange-400">{selectedCorrectScoreMatch.selectedMatch.home.shortName} vs {selectedCorrectScoreMatch.selectedMatch.away.shortName}</span>:</p>
                  <div className="grid grid-cols-5 gap-2 max-h-80 overflow-y-auto">
                    {correctScoreOptions.map((cs, sidx) => (
                      <button
                        key={sidx}
                        onClick={() => {
                          const homeName = selectedCorrectScoreMatch.selectedMatch.home.name;
                          const awayName = selectedCorrectScoreMatch.selectedMatch.away.name;
                          const weekNum = selectedCorrectScoreMatch.weekNum;
                          const match = {
                            id: homeName + "-" + awayName + "-w" + weekNum,
                            homeTeam: selectedCorrectScoreMatch.selectedMatch.home,
                            awayTeam: selectedCorrectScoreMatch.selectedMatch.away,
                          };
                          setBetslip(prev => {
                            const filtered = prev.filter(b => !(b.match.id === match.id && b.betType === "Correct Score"));
                            return [
                              ...filtered,
                              {
                                match,
                                betType: "Correct Score",
                                selection: cs.score,
                                odds: cs.odds,
                                stake: 50,
                              }
                            ];
                          });
                          const homeTeam = selectedCorrectScoreMatch.selectedMatch.home.shortName;
                          const awayTeam = selectedCorrectScoreMatch.selectedMatch.away.shortName;
                          alert("✓ Added: " + homeTeam + " " + cs.score + " " + awayTeam + " @ " + cs.odds);
                        }}
                        className="bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-2 py-2 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-orange-500/50 border border-orange-400/30 flex flex-col items-center justify-center gap-0.5"
                        title={cs.score + " @ " + cs.odds}
                      >
                        <span className="text-sm font-bold">{cs.score}</span>
                        <span className="text-xs text-orange-200">@{cs.odds}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <DialogFooter className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCorrectScore(false);
                  setSelectedCorrectScoreLeague(null);
                  setSelectedCorrectScoreMatch(null);
                }} 
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  setShowCorrectScore(false);
                  setSelectedCorrectScoreLeague(null);
                  setSelectedCorrectScoreMatch(null);
                  setBetslipOpen(true);
                }} 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold"
              >
                View Betslip ({betslip.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Match state UI logic - only shows for LIVE timeframe */}
        {currentTimeframeIdx === liveTimeframeIdx && matchState === 'pre-countdown' && countdown > 0 && (
          <div className="flex flex-col items-center justify-center py-12 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl border-2 border-blue-500/30 mb-4">
            <CircularCountdown seconds={countdown} />
            <span className="text-xl text-slate-300 mt-4 font-semibold">⏱️ Match starts in</span>
          </div>
        )}
        {matchState === 'playing' && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 sm:p-6 rounded-xl mb-4 border-2 border-green-500/30 shadow-lg" style={{ willChange: 'contents' }}>
            <div className="w-full flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-4" style={{ willChange: 'contents' }}>
                <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">⚽ Match Time: {matchTimer}'</span>
                <div className="w-full sm:w-40 h-3 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                  <div className="h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000" style={{ width: ((matchTimer / 90) * 100) + "%", willChange: 'width' }}></div>
                </div>
              </div>
              {/* Only show matches for the selected timeframe and country */}
              {selectedTimeSlot && matchupsByTimeframe[selectedTimeSlot.toISOString()] && (() => {
                const allMatches = matchupsByTimeframe[selectedTimeSlot.toISOString()];
                const filteredMatches = getMatchesByCountry(allMatches, selectedCountry);
                if (filteredMatches.length === 0) {
                  return <div className="text-center text-slate-400 py-4">⚽ Get ready for the match</div>;
                }
                return filteredMatches.map((match, idx) => {
                  const currentAdminSettings = getAdminSettings();
                  let outcome = null;
                  if (currentAdminSettings.manualOutcomes && currentAdminSettings.manualOutcomes[match.id]) {
                    outcome = currentAdminSettings.manualOutcomes[match.id];
                  }
                  // Use cached simulation for this match
                  const sim = matchSimCache[match.id] || { homeGoals: 0, awayGoals: 0, winner: null, events: [] };
                  let displayWinner = outcome ? outcome.winner || sim.winner : sim.winner;
                  // Get progressive score for current match minute
                  const progressiveScore = getProgressiveScore(sim.events, matchTimer);
                  
                  // If admin set specific scores, use those
                  const displayScore = outcome && (outcome.homeGoals !== undefined || outcome.awayGoals !== undefined)
                    ? { home: outcome.homeGoals ?? 0, away: outcome.awayGoals ?? 0 }
                    : progressiveScore;
                  
                return (
                  <div key={match.id} className="flex flex-col gap-3 mb-3">
                    <div className="flex items-center gap-2 sm:gap-4 justify-center bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-3 sm:p-4 shadow-lg border border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300" style={{ willChange: 'contents' }}>
                      {/* Home Team - Left */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-start">
                        <div className="flex flex-col items-end flex-1">
                          <span className="font-bold text-sm sm:text-lg text-cyan-300 truncate">{match.homeTeam.shortName}</span>
                        </div>
                        <img src={getLogoPath(match.homeTeam)} alt={match.homeTeam.shortName} className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-full border border-slate-600 bg-slate-800 flex-shrink-0" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                      </div>

                      {/* Score - Middle */}
                      <div className="px-4 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-yellow-600/80 to-amber-600/80 text-white rounded-lg text-xl sm:text-3xl font-bold border-2 border-yellow-400/50 shadow-lg flex-shrink-0" style={{ willChange: 'contents' }}>{displayScore.home} - {displayScore.away}</div>

                      {/* Away Team - Right */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
                        <img src={getLogoPath(match.awayTeam)} alt={match.awayTeam.shortName} className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-full border border-slate-600 bg-slate-800 flex-shrink-0" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                        <div className="flex flex-col items-start flex-1">
                          <span className="font-bold text-sm sm:text-lg text-cyan-300 truncate">{match.awayTeam.shortName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
                });
              })()}
            </div>
          </div>
        )}
        {matchState === 'betting' && bettingTimer > 0 && (
          <div className="flex flex-col items-center justify-center py-10">
            <CircularCountdown seconds={bettingTimer} label="Place your bets" />
            <div className="w-full mt-8">
              {/* Betting UI - 1X2 Only */}
              {matchupsByTimeframe[selectedTimeSlot.toISOString()] && (
                <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 p-6 rounded-xl mb-4 border-2 border-cyan-500/30 shadow-lg">
                  {/* Bet Type Selection - Top Bar */}
                  <div className="flex gap-2 flex-wrap mb-6 pb-4 border-b border-slate-700/50 overflow-x-auto scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-slate-700/20">
                    {betTypes.map((bt) => {
                      const isBetTypeSelected2 = selectedBetType.type === bt.type;
                      const betTypeBtnClass2 = isBetTypeSelected2
                        ? "px-3 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 whitespace-nowrap flex-shrink-0 bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-2 border-cyan-300 shadow-cyan-500/50"
                        : "px-3 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 whitespace-nowrap flex-shrink-0 bg-gradient-to-r from-slate-700 to-slate-800 text-slate-200 hover:from-slate-600 hover:to-slate-700 border-2 border-slate-600/30";
                      return (
                      <button
                        key={bt.type}
                        onClick={() => setSelectedBetType(bt)}
                        className={betTypeBtnClass2}
                        aria-pressed={isBetTypeSelected2}
                      >
                        {bt.type}
                      </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const allMatches = matchupsByTimeframe[selectedTimeSlot.toISOString()];
                    const filteredMatches = getMatchesByCountry(allMatches, selectedCountry);
                    if (filteredMatches.length === 0) {
                      return <div className="text-center text-slate-400 py-4">💰 Place your bets on upcoming matches</div>;
                    }
                    return filteredMatches.map((match, idx) => {
                    
                    return (
                      <div key={match.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-4 sm:p-6 mb-4 shadow-lg border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300">
                        {/* Two Sections Layout: Teams (Left) | Odds (Right) */}
                        <div className="grid grid-cols-2 gap-4 sm:gap-6">
                          {/* LEFT SECTION - Teams */}
                          <div className="flex flex-col gap-3 justify-center">
                            {/* Home Team */}
                            <div className="flex items-center gap-2 sm:gap-3 p-3 bg-gradient-to-r from-slate-900 to-slate-950 rounded-lg border border-slate-700/50">
                              <img src={getLogoPath(match.homeTeam)} alt={match.homeTeam.shortName} className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-full border border-slate-600 bg-slate-800 flex-shrink-0" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                              <span className="font-bold text-xs sm:text-sm text-cyan-300 truncate">{match.homeTeam.shortName}</span>
                            </div>
                            
                            {/* Away Team */}
                            <div className="flex items-center gap-2 sm:gap-3 p-3 bg-gradient-to-r from-slate-900 to-slate-950 rounded-lg border border-slate-700/50">
                              <img src={getLogoPath(match.awayTeam)} alt={match.awayTeam.shortName} className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-full border border-slate-600 bg-slate-800 flex-shrink-0" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = defaultLogo; }} />
                              <span className="font-bold text-xs sm:text-sm text-cyan-300 truncate">{match.awayTeam.shortName}</span>
                            </div>
                          </div>

                          {/* RIGHT SECTION - Betting Odds */}
                          <div className="flex flex-col gap-2 justify-center">
                            {selectedBetType.selections.map((sel, idx) => (
                              <button
                                key={sel}
                                onClick={() => {
                                  setBetslip(prev => {
                                    const filtered = prev.filter(b => b.match.id !== match.id);
                                    return [
                                      ...filtered,
                                      {
                                        match,
                                        betType: selectedBetType.type,
                                        selection: sel,
                                        odds: selectedBetType.odds[idx],
                                        stake: 50,
                                      }
                                    ];
                                  });
                                }}
                                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg hover:shadow-cyan-500/50 border border-cyan-400/30 flex flex-col items-center gap-0.5"
                                title={sel + " @ " + selectedBetType.odds[idx]}
                              >
                                <div className="font-bold text-xs sm:text-sm">{sel}</div>
                                <div className="text-yellow-300 font-bold text-xs">@{selectedBetType.odds[idx]}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Correct Score Button - Below Main Betting */}
                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                          <button
                            onClick={() => setShowCorrectScoreForMatch(match.id)}
                            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg hover:shadow-orange-500/50 border border-orange-400/30"
                          >
                            📊 Correct Score
                          </button>
                        </div>
                      </div>
                    );
                    });
                  })()}
                      {/* Floating Betslip - responsive, compressible, icon toggle, team names and odds in black */}
                      {betslip.length > 0 && (
                        betslipOpen ? (
                          <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:w-96 z-50 bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-purple-500/50 rounded-xl shadow-2xl p-4 sm:p-5 w-auto backdrop-blur-xl max-h-[60vh] flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                              <div className="font-bold text-lg sm:text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">🎫 Bet Slip</div>
                              <button className="text-2xl text-red-500 font-bold px-2 hover:text-red-400 transition" onClick={() => setBetslipOpen(false)} title="Hide betslip">×</button>
                            </div>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-slate-700/20 flex-1">
                              {betslip.map((bet, idx) => (
                                <div key={idx} className="flex flex-col border-b border-slate-700/50 pb-3 mb-2 text-xs sm:text-sm">
                                  <div className="flex justify-between text-slate-300 font-semibold"><span>Match:</span> <span className="text-cyan-300 text-right">{bet.match.homeTeam.shortName} vs {bet.match.awayTeam.shortName}</span></div>
                                  <div className="flex justify-between text-slate-300 font-semibold"><span>Selection:</span> <span className="text-cyan-300">{bet.selection}</span></div>
                                  <div className="flex justify-between text-slate-300 font-semibold"><span>Odds:</span> <span className="text-yellow-400 font-bold">{bet.odds}</span></div>
                                  <div className="flex justify-between items-center text-slate-300 font-semibold gap-2"><span>Stake:</span> <input type="number" min="50" value={bet.stake} onChange={(e) => { const updated = [...betslip]; updated[idx].stake = Number(e.target.value); setBetslip(updated); }} className="border-2 border-slate-600 rounded-lg px-2 py-1 w-16 sm:w-20 text-xs text-slate-200 bg-slate-800/50 focus:border-purple-500 focus:outline-none" /> KES</div>
                                  <button className="text-xs text-red-500 hover:text-red-400 mt-2 self-end font-bold transition" onClick={() => setBetslip(betslip.filter((_, i) => i !== idx))}>🗑️ Remove</button>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 border-t border-slate-700/50 pt-3 flex justify-between font-bold text-slate-300 text-xs sm:text-sm">
                              <span>Total Stake:</span>
                              <span className="text-purple-400">KES {betslip.reduce((sum, b) => sum + b.stake, 0)}</span>
                            </div>
                            <div className="flex gap-2 justify-end mt-4 flex-wrap">
                              <Button
                                onClick={async () => {
                                  if (!user) {
                                    window.location.href = "/login";
                                    return;
                                  }
                                  const totalStake = betslip.reduce((sum, b) => sum + b.stake, 0);
                                  if (totalStake > balance) {
                                    alert("Insufficient balance.");
                                    return;
                                  }
                                  if (betslip.some(b => b.stake < 50)) {
                                    alert("Minimum stake per bet is 50 KES.");
                                    return;
                                  }
                                  const { saveBetToSupabase } = await import("@/lib/supabaseBets");
                                  let saveErrors = false;
                                  for (const bet of betslip) {
                                    const error = await saveBetToSupabase(bet, user.id);
                                    if (error) {
                                      console.error("Error saving bet:", error);
                                      saveErrors = true;
                                    }
                                  }
                                  
                                  if (!saveErrors) {
                                    const { supabase } = await import("@/lib/supabaseClient");
                                    await supabase.from("users").update({ balance: balance - totalStake }).eq("id", user.id);
                                    setBalance(balance - totalStake);
                                    setBetslip([]);
                                    setBetslipOpen(false);
                                    setBetPlaced(true);
                                    setTimeout(() => setBetPlaced(false), 2000);
                                  } else {
                                    alert("Some bets failed to save. Please try again.");
                                  }
                                }}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold px-4 sm:px-6 py-2 rounded-lg shadow-lg hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-105 text-sm"
                              >💰 Place Bet</Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full shadow-2xl flex items-center justify-center font-bold transition-all duration-300 transform hover:scale-110 hover:shadow-purple-500/50"
                            style={{ width: '48px', height: '48px' }}
                            onClick={() => setBetslipOpen(true)}
                            title="Open betslip"
                            aria-label="Open betslip"
                          >
                            <span className="text-lg sm:text-2xl">🧾</span>
                          </button>
                        )
                      )}
                </div>
              )}
            </div>
          </div>
        )}
        {matchState === 'next-countdown' && countdown > 0 && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl border-2 border-indigo-500/30 mb-4">
            <CircularCountdown seconds={countdown} />
            <span className="text-lg sm:text-xl text-slate-300 mt-3 sm:mt-4 font-semibold text-center">⏱️ Next match starts in</span>
          </div>
        )}

        {/* Bet Slip History Dialog */}
        <BetSlipHistory 
          open={showBetSlipHistory} 
          onOpenChange={setShowBetSlipHistory}
          onLoadBetSlip={(savedSlip) => {
            setBetslip(savedSlip.bets);
            setBetslipOpen(true);
          }}
        />

        {/* Save Bet Slip Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6 w-full max-w-xs sm:max-w-sm shadow-2xl">
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4">Save Bet Slip</h3>
              <input
                type="text"
                placeholder="Enter a name for this bet slip"
                value={betSlipName}
                onChange={(e) => setBetSlipName(e.target.value)}
                className="w-full border border-input rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-foreground bg-background mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setBetSlipName('');
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-border hover:bg-muted transition text-xs sm:text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (betslip.length > 0) {
                      saveBetSlip(betslip, betSlipName || undefined);
                      alert('Bet slip saved!');
                      setShowSaveDialog(false);
                      setBetSlipName('');
                    }
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition font-bold text-xs sm:text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default BetXPesa;
