/**
 * Schedule Generator
 * Generates realistic match schedules based on global reference time
 * Creates fixtures with proper timing and cycling
 */

import { Match, League } from '@/types/betting';
import {
  getGlobalSchedule,
  calculateScheduledTime,
  findScheduleIndexForTime,
} from '@/lib/matchScheduleService';

export interface GeneratedSchedule {
  referenceTime: Date;
  matches: ScheduledMatchData[];
  totalSchedules: number; // Total unique match cycles
}

export interface ScheduledMatchData extends Match {
  scheduleIndex: number;
  scheduledStartTime: Date;
  matchDayOfWeek: string; // Monday, Tuesday, etc.
  matchDate: string; // YYYY-MM-DD
  matchTime: string; // HH:mm
}

/**
 * Generate a realistic schedule where matches repeat in a cycle
 * For example, with 10 matches and 30-minute intervals,
 * every 5 hours (10 * 30 mins) the cycle repeats
 */
export const generateScheduledMatches = (
  matches: Match[],
  scheduleCount: number = 1000
): ScheduledMatchData[] => {
  const schedule = getGlobalSchedule();
  const scheduledMatches: ScheduledMatchData[] = [];

  for (let scheduleIndex = 0; scheduleIndex < scheduleCount; scheduleIndex++) {
    // Map schedule index to match using modulo (cycling)
    const matchIndex = scheduleIndex % matches.length;
    const baseMatch = matches[matchIndex];

    const scheduledTime = calculateScheduledTime(scheduleIndex, schedule);
    const dayOfWeek = scheduledTime.toLocaleDateString('en-US', {
      weekday: 'long',
    });
    const dateStr = scheduledTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const timeStr = scheduledTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    scheduledMatches.push({
      ...baseMatch,
      scheduleIndex,
      scheduledStartTime: scheduledTime,
      matchDayOfWeek: dayOfWeek,
      matchDate: dateStr,
      matchTime: timeStr,
    });
  }

  return scheduledMatches;
};

/**
 * Generate only matches for a specific date range
 */
export const generateScheduleForDateRange = (
  matches: Match[],
  startDate: Date,
  endDate: Date
): ScheduledMatchData[] => {
  const schedule = getGlobalSchedule();
  const scheduledMatches: ScheduledMatchData[] = [];

  let startIndex = Math.max(0, findScheduleIndexForTime(startDate, schedule));
  const endIndex = findScheduleIndexForTime(endDate, schedule);

  for (let scheduleIndex = startIndex; scheduleIndex <= endIndex; scheduleIndex++) {
    const matchIndex = scheduleIndex % matches.length;
    const baseMatch = matches[matchIndex];

    const scheduledTime = calculateScheduledTime(scheduleIndex, schedule);

    const dayOfWeek = scheduledTime.toLocaleDateString('en-US', {
      weekday: 'long',
    });
    const dateStr = scheduledTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const timeStr = scheduledTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    scheduledMatches.push({
      ...baseMatch,
      scheduleIndex,
      scheduledStartTime: scheduledTime,
      matchDayOfWeek: dayOfWeek,
      matchDate: dateStr,
      matchTime: timeStr,
    });
  }

  return scheduledMatches;
};

/**
 * Generate schedule for a specific league with custom interval
 */
export const generateLeagueSchedule = (
  league: League,
  matches: Match[],
  weeksAhead: number = 4
): ScheduledMatchData[] => {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + weeksAhead * 7);

  return generateScheduleForDateRange(matches, startDate, endDate);
};

/**
 * Get all unique dates that have matches scheduled
 */
export const getScheduledDates = (
  scheduledMatches: ScheduledMatchData[]
): string[] => {
  const dates = new Set<string>();
  scheduledMatches.forEach((match) => {
    dates.add(match.matchDate);
  });
  return Array.from(dates).sort();
};

/**
 * Group scheduled matches by date
 */
export const groupByDate = (
  scheduledMatches: ScheduledMatchData[]
): { [date: string]: ScheduledMatchData[] } => {
  const grouped: { [date: string]: ScheduledMatchData[] } = {};

  scheduledMatches.forEach((match) => {
    if (!grouped[match.matchDate]) {
      grouped[match.matchDate] = [];
    }
    grouped[match.matchDate].push(match);
  });

  // Sort matches within each date by time
  Object.keys(grouped).forEach((date) => {
    grouped[date].sort(
      (a, b) =>
        new Date(a.scheduledStartTime).getTime() -
        new Date(b.scheduledStartTime).getTime()
    );
  });

  return grouped;
};

/**
 * Get matches for a specific day of week (e.g., all Mondays)
 */
export const getMatchesByDayOfWeek = (
  scheduledMatches: ScheduledMatchData[],
  dayOfWeek: string // 'Monday', 'Tuesday', etc.
): ScheduledMatchData[] => {
  return scheduledMatches.filter((match) => match.matchDayOfWeek === dayOfWeek);
};

/**
 * Get schedule summary for a period
 */
export const getScheduleSummary = (
  scheduledMatches: ScheduledMatchData[]
): {
  totalMatches: number;
  uniqueDates: number;
  earliestMatch: Date;
  latestMatch: Date;
  uniqueTeams: Set<string>;
} => {
  if (scheduledMatches.length === 0) {
    return {
      totalMatches: 0,
      uniqueDates: 0,
      earliestMatch: new Date(),
      latestMatch: new Date(),
      uniqueTeams: new Set(),
    };
  }

  const uniqueTeams = new Set<string>();
  scheduledMatches.forEach((match) => {
    uniqueTeams.add(match.homeTeam.name);
    uniqueTeams.add(match.awayTeam.name);
  });

  const sorted = [...scheduledMatches].sort(
    (a, b) =>
      new Date(a.scheduledStartTime).getTime() -
      new Date(b.scheduledStartTime).getTime()
  );

  return {
    totalMatches: scheduledMatches.length,
    uniqueDates: new Set(scheduledMatches.map((m) => m.matchDate)).size,
    earliestMatch: sorted[0].scheduledStartTime,
    latestMatch: sorted[sorted.length - 1].scheduledStartTime,
    uniqueTeams,
  };
};

/**
 * Export schedule as CSV
 */
export const exportScheduleAsCSV = (
  scheduledMatches: ScheduledMatchData[],
  filename: string = 'match-schedule.csv'
): void => {
  const headers = [
    'Schedule Index',
    'Date',
    'Day of Week',
    'Time',
    'Home Team',
    'Away Team',
    'Over Odds',
    'Under Odds',
  ];

  const rows = scheduledMatches.map((match) => [
    match.scheduleIndex,
    match.matchDate,
    match.matchDayOfWeek,
    match.matchTime,
    match.homeTeam.name,
    match.awayTeam.name,
    match.overOdds,
    match.underOdds,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
