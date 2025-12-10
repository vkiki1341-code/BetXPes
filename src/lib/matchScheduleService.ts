/**
 * Global Match Schedule Service
 * Manages a universal reference time for all matches
 * All matches are scheduled based on this reference epoch
 * This allows users to predict matches at any future time
 */

import { Match } from '@/types/betting';

export interface GlobalSchedule {
  referenceEpoch: number; // Unix timestamp of reference time
  matchInterval: number; // Minutes between each match (e.g., 30, 45, 60)
  timezone: string; // Reference timezone
  lastUpdated: number;
}

export interface ScheduledMatch {
  matchId: string;
  scheduleIndex: number; // Which match in the sequence (0, 1, 2, ...)
  scheduledStartTime: number; // Unix timestamp
  homeTeam: string;
  awayTeam: string;
}

const STORAGE_KEY = 'global_match_schedule';
const DEFAULT_INTERVAL = 30; // Default 30 minutes between matches

/**
 * Initialize or get the global schedule
 * This should be called once when the system starts
 */
export const initializeGlobalSchedule = (
  referenceTime?: Date,
  matchInterval: number = DEFAULT_INTERVAL,
  timezone: string = 'UTC'
): GlobalSchedule => {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    return JSON.parse(stored);
  }

  // Create new schedule with reference time
  const schedule: GlobalSchedule = {
    referenceEpoch: referenceTime ? referenceTime.getTime() : Date.now(),
    matchInterval,
    timezone,
    lastUpdated: Date.now(),
  };

  saveGlobalSchedule(schedule);
  return schedule;
};

/**
 * Get current global schedule
 */
export const getGlobalSchedule = (): GlobalSchedule => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return initializeGlobalSchedule();
  }
  return JSON.parse(stored);
};

/**
 * Save global schedule
 */
export const saveGlobalSchedule = (schedule: GlobalSchedule): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
};

/**
 * Update reference time (if needed to adjust globally)
 */
export const updateReferenceTime = (newTime: Date): GlobalSchedule => {
  const schedule = getGlobalSchedule();
  schedule.referenceEpoch = newTime.getTime();
  schedule.lastUpdated = Date.now();
  saveGlobalSchedule(schedule);
  return schedule;
};

/**
 * Update match interval (minutes between matches)
 */
export const updateMatchInterval = (minutes: number): GlobalSchedule => {
  const schedule = getGlobalSchedule();
  schedule.matchInterval = minutes;
  schedule.lastUpdated = Date.now();
  saveGlobalSchedule(schedule);
  return schedule;
};

/**
 * Calculate the scheduled start time for a match given its index
 * Schedule Index 0 = referenceEpoch
 * Schedule Index 1 = referenceEpoch + matchInterval
 * Schedule Index N = referenceEpoch + (N * matchInterval)
 */
export const calculateScheduledTime = (
  scheduleIndex: number,
  schedule?: GlobalSchedule
): Date => {
  const sched = schedule || getGlobalSchedule();
  const milliseconds = sched.referenceEpoch + scheduleIndex * sched.matchInterval * 60000;
  return new Date(milliseconds);
};

/**
 * Find which schedule index a given time falls into
 * Returns the schedule index that is currently active or upcoming
 */
export const findScheduleIndexForTime = (
  time: Date,
  schedule?: GlobalSchedule
): number => {
  const sched = schedule || getGlobalSchedule();
  const timeDiff = time.getTime() - sched.referenceEpoch;
  const indexDiff = timeDiff / (sched.matchInterval * 60000);
  
  // Round down to get the current/most recent schedule index
  return Math.floor(indexDiff);
};

/**
 * Get all matches scheduled for a specific date
 */
export const getMatchesForDate = (
  date: Date,
  allMatches: Match[],
  schedule?: GlobalSchedule
): ScheduledMatch[] => {
  const sched = schedule || getGlobalSchedule();
  
  // Calculate start and end of day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  const startIndex = findScheduleIndexForTime(dayStart, sched);
  const endIndex = findScheduleIndexForTime(dayEnd, sched);
  
  const matchesOnDate: ScheduledMatch[] = [];
  
  for (let i = 0; i < allMatches.length; i++) {
    const match = allMatches[i];
    const scheduleIndex = i % 1000; // Cycle through indices
    const scheduledTime = calculateScheduledTime(scheduleIndex, sched);
    
    if (scheduledTime >= dayStart && scheduledTime <= dayEnd) {
      matchesOnDate.push({
        matchId: match.id,
        scheduleIndex,
        scheduledStartTime: scheduledTime.getTime(),
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
      });
    }
  }
  
  return matchesOnDate.sort((a, b) => a.scheduledStartTime - b.scheduledStartTime);
};

/**
 * Get match scheduled for a specific time slot
 * Returns which match is playing at this exact time
 */
export const getMatchAtTime = (
  time: Date,
  allMatches: Match[],
  schedule?: GlobalSchedule
): ScheduledMatch | null => {
  const sched = schedule || getGlobalSchedule();
  
  // Find which schedule index this time falls into
  const scheduleIndex = findScheduleIndexForTime(time, sched);
  
  if (scheduleIndex < 0) {
    return null; // Time is before schedule start
  }
  
  // Map schedule index to match index
  const matchIndex = scheduleIndex % allMatches.length;
  const match = allMatches[matchIndex];
  
  if (!match) {
    return null;
  }
  
  const scheduledTime = calculateScheduledTime(scheduleIndex, sched);
  
  return {
    matchId: match.id,
    scheduleIndex,
    scheduledStartTime: scheduledTime.getTime(),
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
  };
};

/**
 * Get next N matches from a given time
 */
export const getUpcomingMatches = (
  fromTime: Date,
  count: number,
  allMatches: Match[],
  schedule?: GlobalSchedule
): ScheduledMatch[] => {
  const sched = schedule || getGlobalSchedule();
  
  const upcoming: ScheduledMatch[] = [];
  let currentIndex = findScheduleIndexForTime(fromTime, sched);
  
  for (let i = 0; i < count; i++) {
    const scheduleIndex = currentIndex + i;
    if (scheduleIndex < 0) continue;
    
    const matchIndex = scheduleIndex % allMatches.length;
    const match = allMatches[matchIndex];
    
    if (!match) continue;
    
    const scheduledTime = calculateScheduledTime(scheduleIndex, sched);
    
    upcoming.push({
      matchId: match.id,
      scheduleIndex,
      scheduledStartTime: scheduledTime.getTime(),
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
    });
  }
  
  return upcoming;
};

/**
 * Get previous N matches from a given time
 */
export const getPastMatches = (
  fromTime: Date,
  count: number,
  allMatches: Match[],
  schedule?: GlobalSchedule
): ScheduledMatch[] => {
  const sched = schedule || getGlobalSchedule();
  
  const past: ScheduledMatch[] = [];
  let currentIndex = findScheduleIndexForTime(fromTime, sched);
  
  for (let i = 1; i <= count; i++) {
    const scheduleIndex = currentIndex - i;
    if (scheduleIndex < 0) continue;
    
    const matchIndex = scheduleIndex % allMatches.length;
    const match = allMatches[matchIndex];
    
    if (!match) continue;
    
    const scheduledTime = calculateScheduledTime(scheduleIndex, sched);
    
    past.unshift({
      matchId: match.id,
      scheduleIndex,
      scheduledStartTime: scheduledTime.getTime(),
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
    });
  }
  
  return past;
};

/**
 * Format scheduled time for display
 */
export const formatScheduledTime = (timestamp: number, locale?: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString(locale || 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Get schedule statistics
 */
export const getScheduleStats = (
  schedule?: GlobalSchedule
): { referenceTime: string; interval: string; timezone: string } => {
  const sched = schedule || getGlobalSchedule();
  return {
    referenceTime: new Date(sched.referenceEpoch).toISOString(),
    interval: `${sched.matchInterval} minutes`,
    timezone: sched.timezone,
  };
};
