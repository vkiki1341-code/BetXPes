/**
 * Hook: useCurrentMatch
 * Real-time tracking of current and upcoming matches based on global time
 * Automatically updates as time progresses
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Match } from '@/types/betting';
import {
  getMatchAtTime,
  getUpcomingMatches,
  getGlobalSchedule,
  ScheduledMatch,
} from '@/lib/matchScheduleService';

export interface CurrentMatchInfo {
  current: ScheduledMatch | null;
  upcoming: ScheduledMatch[];
  currentTime: Date;
  minutesUntilNextMatch: number;
  isLoading: boolean;
}

export const useCurrentMatch = (
  allMatches: Match[],
  updateInterval: number = 1000 // Update every second by default
): CurrentMatchInfo => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [matchInfo, setMatchInfo] = useState<CurrentMatchInfo>({
    current: null,
    upcoming: [],
    currentTime: new Date(),
    minutesUntilNextMatch: 0,
    isLoading: true,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scheduleRef = useRef(getGlobalSchedule());

  // Update current time and calculate matches
  const updateMatches = useCallback(() => {
    const now = new Date();
    setCurrentTime(now);

    const schedule = scheduleRef.current;
    const current = getMatchAtTime(now, allMatches, schedule);
    const upcoming = getUpcomingMatches(now, 5, allMatches, schedule);

    let minutesUntilNextMatch = 0;
    if (upcoming.length > 0) {
      const nextMatchTime = upcoming[0].scheduledStartTime;
      const diffMs = nextMatchTime - now.getTime();
      minutesUntilNextMatch = Math.ceil(diffMs / 60000);
    }

    setMatchInfo({
      current,
      upcoming,
      currentTime: now,
      minutesUntilNextMatch,
      isLoading: false,
    });
  }, [allMatches]);

  // Set up interval for updates
  useEffect(() => {
    // Initial update
    updateMatches();

    // Set up timer for continuous updates
    timerRef.current = setInterval(updateMatches, updateInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [updateMatches, updateInterval]);

  return matchInfo;
};

/**
 * Hook: useMatchAtTime
 * Get match scheduled for a specific time (useful for predictions)
 */
export const useMatchAtTime = (
  time: Date,
  allMatches: Match[]
): ScheduledMatch | null => {
  const [scheduledMatch, setScheduledMatch] = useState<ScheduledMatch | null>(
    null
  );

  useEffect(() => {
    const schedule = getGlobalSchedule();
    const match = getMatchAtTime(time, allMatches, schedule);
    setScheduledMatch(match);
  }, [time, allMatches]);

  return scheduledMatch;
};

/**
 * Hook: useUpcomingMatches
 * Get next N matches from current time
 */
export const useUpcomingMatches = (
  count: number = 10,
  allMatches: Match[]
): ScheduledMatch[] => {
  const [upcoming, setUpcoming] = useState<ScheduledMatch[]>([]);

  useEffect(() => {
    const schedule = getGlobalSchedule();
    const matches = getUpcomingMatches(new Date(), count, allMatches, schedule);
    setUpcoming(matches);

    // Update every minute to keep fresh
    const interval = setInterval(() => {
      const freshMatches = getUpcomingMatches(
        new Date(),
        count,
        allMatches,
        schedule
      );
      setUpcoming(freshMatches);
    }, 60000);

    return () => clearInterval(interval);
  }, [count, allMatches]);

  return upcoming;
};

/**
 * Hook: useScheduleInfo
 * Get information about a match's scheduled time
 */
export interface MatchScheduleInfo {
  scheduledTime: Date;
  dayOfWeek: string;
  formattedTime: string;
  formattedDate: string;
  nextOccurrence: Date;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export const useScheduleInfo = (
  scheduledMatch: ScheduledMatch | null
): MatchScheduleInfo | null => {
  const [info, setInfo] = useState<MatchScheduleInfo | null>(null);

  useEffect(() => {
    if (!scheduledMatch) {
      setInfo(null);
      return;
    }

    const scheduledDate = new Date(scheduledMatch.scheduledStartTime);
    const now = new Date();

    const dayOfWeek = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const matchDate = new Date(scheduledDate);
    matchDate.setHours(0, 0, 0, 0);

    const isToday = matchDate.getTime() === today.getTime();
    const isPast = scheduledDate < now;
    const isFuture = scheduledDate > now;

    setInfo({
      scheduledTime: scheduledDate,
      dayOfWeek,
      formattedTime,
      formattedDate,
      nextOccurrence: scheduledDate,
      isPast,
      isToday,
      isFuture,
    });
  }, [scheduledMatch]);

  return info;
};

/**
 * Hook: useRealTimeCountdown
 * Get real-time countdown to next match
 */
export interface CountdownInfo {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  displayText: string;
}

export const useRealTimeCountdown = (
  targetTime: Date | null,
  updateInterval: number = 1000
): CountdownInfo | null => {
  const [countdown, setCountdown] = useState<CountdownInfo | null>(null);

  useEffect(() => {
    if (!targetTime) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      let displayText = '';
      if (days > 0) {
        displayText = `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        displayText = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        displayText = `${minutes}m ${seconds}s`;
      } else {
        displayText = `${seconds}s`;
      }

      setCountdown({
        days,
        hours,
        minutes,
        seconds,
        totalSeconds,
        displayText,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, updateInterval);

    return () => clearInterval(interval);
  }, [targetTime, updateInterval]);

  return countdown;
};
