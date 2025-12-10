import { Match, Team, League, AdminSettings } from "@/types/betting";
import { leagues } from "@/data/leagues";

const STORAGE_KEY = "betting_admin_settings";
const MATCHES_KEY = "betting_matches";
const SHUFFLED_FIXTURES_KEY = "betting_shuffled_fixtures";

export const getAdminSettings = (): AdminSettings => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    autoGenerate: true,
    generationInterval: 5,
    manualOutcomes: {},
  };
};

export const saveAdminSettings = (settings: AdminSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const generateRandomOdds = () => {
  const overOdds = (1.2 + Math.random() * 0.15).toFixed(2);
  const underOdds = (3.4 + Math.random() * 0.9).toFixed(2);
  return { overOdds, underOdds };
};

const generateRandomOutcome = (): "over" | "under" => {
  return Math.random() < 0.5 ? "over" : "under";
};

// Generate shuffled fixtures for a league
export const generateShuffledFixtures = (league: League, weeks: number = 36) => {
  const fixtures: { [week: number]: Array<{ home: Team; away: Team }> } = {};
  const teams = [...league.teams];
  
  for (let week = 1; week <= weeks; week++) {
    const weekMatches = [];
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffledTeams.length - 1; i += 2) {
      weekMatches.push({
        home: shuffledTeams[i],
        away: shuffledTeams[i + 1],
      });
    }
    
    fixtures[week] = weekMatches;
  }
  
  return fixtures;
};

// Store shuffled fixtures for a league
export const storeShuffledFixtures = (countryCode: string, fixtures: any) => {
  const allFixtures = JSON.parse(localStorage.getItem(SHUFFLED_FIXTURES_KEY) || "{}");
  allFixtures[countryCode] = fixtures;
  localStorage.setItem(SHUFFLED_FIXTURES_KEY, JSON.stringify(allFixtures));
};

// Get stored shuffled fixtures for a league
export const getStoredShuffledFixtures = (countryCode: string) => {
  const allFixtures = JSON.parse(localStorage.getItem(SHUFFLED_FIXTURES_KEY) || "{}");
  return allFixtures[countryCode] || null;
};

// Clear all shuffled fixtures
export const clearAllShuffledFixtures = () => {
  localStorage.removeItem(SHUFFLED_FIXTURES_KEY);
};

export const generateMatches = (league: League, count: number = 10): Match[] => {
  const matches: Match[] = [];
  const teams = [...league.teams];
  const now = new Date();
  const settings = getAdminSettings();
  for (let i = 0; i < count; i++) {
    if (teams.length < 2) break;
    const homeIndex = Math.floor(Math.random() * teams.length);
    const homeTeam = teams.splice(homeIndex, 1)[0];
    const awayIndex = Math.floor(Math.random() * teams.length);
    const awayTeam = teams.splice(awayIndex, 1)[0];
    const kickoffTime = new Date(now.getTime() + (i * 2 + Math.random() * 3) * 60000);
    const { overOdds, underOdds } = generateRandomOdds();
    const id = `${league.countryCode}-${Date.now()}-${i}`;
    let outcome: "over" | "under" = generateRandomOutcome();
    if (
      settings.manualOutcomes &&
      settings.manualOutcomes[id] &&
      typeof settings.manualOutcomes[id] === "object" &&
      settings.manualOutcomes[id]["over"]
    ) {
      outcome = settings.manualOutcomes[id]["over"] as "over" | "under";
    }
    matches.push({
      id,
      homeTeam,
      awayTeam,
      kickoffTime,
      overOdds,
      underOdds,
      outcome,
    });
  }
  return matches;
};

export const getStoredMatches = (countryCode: string): Match[] | null => {
  const stored = localStorage.getItem(`${MATCHES_KEY}_${countryCode}`);
  if (stored) {
    const matches = JSON.parse(stored);
    return matches.map((m: any) => ({
      ...m,
      kickoffTime: new Date(m.kickoffTime),
    }));
  }
  return null;
};

export const storeMatches = (countryCode: string, matches: Match[]) => {
  localStorage.setItem(`${MATCHES_KEY}_${countryCode}`, JSON.stringify(matches));
};

export const regenerateMatchesIfNeeded = (countryCode: string): Match[] => {
  const league = leagues.find((l) => l.countryCode === countryCode);
  if (!league) return [];

  const settings = getAdminSettings();
  const stored = getStoredMatches(countryCode);

  // If auto-generation is disabled, keep existing matches or generate once
  if (!settings.autoGenerate) {
    if (stored && stored.length > 0) {
      return stored;
    }
    const matches = generateMatches(league);
    storeMatches(countryCode, matches);
    return matches;
  }

  // When auto-generation is enabled, always rotate matches to keep them fresh
  const newMatches = generateMatches(league);
  storeMatches(countryCode, newMatches);
  return newMatches;
};

// ==========================================
// AUTO-RESHUFFLE ON WEEK 36
// ==========================================

// Track when reshuffle was last triggered (to prevent duplicate reshuffles)
const RESHUFFLE_TRACKER_KEY = "betting_last_reshuffle_week";

export const getLastReshuffleWeek = (): number => {
  const stored = localStorage.getItem(RESHUFFLE_TRACKER_KEY);
  return stored ? parseInt(stored) : 0;
};

export const setLastReshuffleWeek = (week: number) => {
  localStorage.setItem(RESHUFFLE_TRACKER_KEY, week.toString());
};

// Check if week 36 has been reached and auto-reshuffle if needed
export const checkAndAutoReshuffle = (currentWeek: number): boolean => {
  const lastReshuffle = getLastReshuffleWeek();
  
  // If we've reached week 36 and haven't reshuffled for this season yet
  if (currentWeek >= 36 && lastReshuffle < 36) {
    console.log("🔄 Week 36 reached! Auto-reshuffling fixtures for next season...");
    
    // Generate new shuffled fixtures for all leagues
    leagues.forEach(league => {
      const shuffledFixtures = generateShuffledFixtures(league);
      storeShuffledFixtures(league.countryCode, shuffledFixtures);
    });
    
    // Clear fixture overrides
    const adminSettings = getAdminSettings();
    saveAdminSettings({
      ...adminSettings,
      fixtureOverrides: {}
    });
    
    // Mark that we've reshuffled for this season
    setLastReshuffleWeek(36);
    
    return true;
  }
  
  return false;
};

// Manually trigger reshuffle (called by admin button)
export const triggerManualReshuffle = () => {
  console.log("🔄 Manual reshuffle triggered by admin");
  
  leagues.forEach(league => {
    const shuffledFixtures = generateShuffledFixtures(league);
    storeShuffledFixtures(league.countryCode, shuffledFixtures);
  });
  
  // Clear fixture overrides
  const adminSettings = getAdminSettings();
  saveAdminSettings({
    ...adminSettings,
    fixtureOverrides: {}
  });
  
  return true;
};
