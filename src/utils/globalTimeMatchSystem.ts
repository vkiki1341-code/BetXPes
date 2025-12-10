/**
 * Global Time-Based Match System
 * Replaces random match generation with time-based scheduling
 * All users see the same match at the same time, globally
 */

import { Match, League } from "@/types/betting";
import { leagues } from "@/data/leagues";
import {
  getGlobalSchedule,
  findScheduleIndexForTime,
  calculateScheduledTime,
} from "@/lib/matchScheduleService";

const SCHEDULE_INIT_KEY = "global_match_schedule_initialized";

/**
 * Initialize global matching system on first load
 * Sets up a reference epoch that never changes
 */
export const initializeGlobalMatchSystem = (): void => {
  const isInitialized = localStorage.getItem(SCHEDULE_INIT_KEY);
  if (!isInitialized) {
    // Initialize with current time as reference
    getGlobalSchedule(); // This initializes if not present
    localStorage.setItem(SCHEDULE_INIT_KEY, Date.now().toString());
    console.log("✅ Global match scheduling system initialized");
  }
};

/**
 * Get all available matches (from all leagues combined and shuffled)
 * These matches will cycle repeatedly based on global time
 */
export const getAllAvailableMatches = (): Match[] => {
  const allMatches: Match[] = [];

  // Collect all teams from all leagues and create comprehensive match combinations
  leagues.forEach((league) => {
    const teams = [...league.teams];
    let leagueMatchCount = 0;

    // Create matches by pairing all combinations to ensure max variety
    // This ensures enough matches for all timeframes
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const homeTeam = teams[i];
        const awayTeam = teams[j];

        allMatches.push({
          id: `${league.countryCode}-${homeTeam.shortName}-vs-${awayTeam.shortName}`,
          homeTeam,
          awayTeam,
          kickoffTime: new Date(), // Will be overridden by scheduling
          overOdds: (1.2 + Math.random() * 0.15).toFixed(2),
          underOdds: (3.4 + Math.random() * 0.9).toFixed(2),
        });
        leagueMatchCount++;
      }
    }
    console.log(`📊 ${league.country} (${league.countryCode}): ${leagueMatchCount} matches created`);
  });

  // Shuffle to add variety
  const shuffled = allMatches.sort(() => Math.random() - 0.5);
  console.log(`📊 Total matches from all leagues: ${shuffled.length}`);
  
  // Ensure we have enough matches for cycling - minimum 54 for 6+ timeframes * 9 matches
  // If we have fewer, duplicate some to ensure variety
  if (shuffled.length < 54) {
    const duplicatedMatches = [...shuffled];
    while (duplicatedMatches.length < 54) {
      duplicatedMatches.push(...shuffled);
    }
    console.log(`⚠️ Duplicated matches to reach minimum of 54`);
    return duplicatedMatches.slice(0, 54);
  }
  
  return shuffled;
};

/**
 * Get the current match playing RIGHT NOW
 * This is what users should see when they open the app
 */
export const getCurrentMatch = (): Match | null => {
  const allMatches = getAllAvailableMatches();
  if (allMatches.length === 0) return null;

  const schedule = getGlobalSchedule();
  const now = new Date();
  const currentIndex = findScheduleIndexForTime(now, schedule);

  if (currentIndex < 0) return null;

  // Map schedule index to match using modulo (cycling through all matches)
  const matchIndex = currentIndex % allMatches.length;
  const match = allMatches[matchIndex];

  // Update the kickoff time to be the scheduled start time for this index
  const scheduledTime = calculateScheduledTime(currentIndex, schedule);

  return {
    ...match,
    kickoffTime: scheduledTime,
    id: `${match.id}-${currentIndex}`, // Add index to make ID unique
  };
};

/**
 * Get upcoming matches from now
 * Users can see what's coming next
 */
export const getUpcomingMatches = (count: number = 5): Match[] => {
  const allMatches = getAllAvailableMatches();
  if (allMatches.length === 0) return [];

  const schedule = getGlobalSchedule();
  const now = new Date();
  const currentIndex = findScheduleIndexForTime(now, schedule);

  const upcoming: Match[] = [];

  for (let i = 1; i <= count; i++) {
    const scheduleIndex = currentIndex + i;
    if (scheduleIndex < 0) continue;

    const matchIndex = scheduleIndex % allMatches.length;
    const match = allMatches[matchIndex];
    const scheduledTime = calculateScheduledTime(scheduleIndex, schedule);

    upcoming.push({
      ...match,
      kickoffTime: scheduledTime,
      id: `${match.id}-${scheduleIndex}`,
    });
  }

  return upcoming;
};

/**
 * Get match at a specific time
 * Useful for users to predict what match will play at a certain time/date
 */
export const getMatchAtTime = (time: Date): Match | null => {
  const allMatches = getAllAvailableMatches();
  if (allMatches.length === 0) return null;

  const schedule = getGlobalSchedule();
  const scheduleIndex = findScheduleIndexForTime(time, schedule);

  if (scheduleIndex < 0) return null;

  const matchIndex = scheduleIndex % allMatches.length;
  const match = allMatches[matchIndex];
  const scheduledTime = calculateScheduledTime(scheduleIndex, schedule);

  return {
    ...match,
    kickoffTime: scheduledTime,
    id: `${match.id}-${scheduleIndex}`,
  };
};

/**
 * Get time until next match
 */
export const getTimeUntilNextMatch = (): number => {
  const schedule = getGlobalSchedule();
  const now = new Date();
  const currentIndex = findScheduleIndexForTime(now, schedule);
  const nextMatchTime = calculateScheduledTime(currentIndex + 1, schedule);
  const diffMs = nextMatchTime.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / 1000)); // Return seconds
};

/**
 * Format match display with scheduled time
 */
export const formatMatchWithTime = (match: Match): string => {
  const time = match.kickoffTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = match.kickoffTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${match.homeTeam.shortName} vs ${match.awayTeam.shortName} - ${date} ${time}`;
};

/**
 * Check if a match is currently live
 */
export const isMatchLive = (match: Match): boolean => {
  const now = new Date();
  const matchEnd = new Date(match.kickoffTime.getTime() + 90 * 60000); // 90 mins
  return now >= match.kickoffTime && now < matchEnd;
};

/**
 * Get match duration in minutes until it ends
 */
export const getMatchDuration = (match: Match): number => {
  const now = new Date();
  const matchEnd = new Date(match.kickoffTime.getTime() + 90 * 60000);
  const remaining = matchEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / 60000));
};

/**
 * Get schedule stats for display
 */
export const getScheduleStats = () => {
  const schedule = getGlobalSchedule();
  const now = new Date();
  const currentMatch = getCurrentMatch();
  const upcomingMatches = getUpcomingMatches(3);

  return {
    referenceEpoch: schedule.referenceEpoch,
    matchInterval: schedule.matchInterval,
    currentMatch,
    upcomingMatches,
    timeUntilNextMatch: getTimeUntilNextMatch(),
    totalAvailableMatches: getAllAvailableMatches().length,
  };
};
