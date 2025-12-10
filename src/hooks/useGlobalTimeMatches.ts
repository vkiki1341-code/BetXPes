/**
 * Hook: useGlobalTimeMatches
 * Real-time tracking of current and upcoming matches based on global time scheduling
 * Automatically updates as time progresses - all users see the same match
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Match } from '@/types/betting';
import {
  getCurrentMatch,
  getUpcomingMatches,
  getTimeUntilNextMatch,
  getAllAvailableMatches,
} from '@/utils/globalTimeMatchSystem';

export interface GlobalTimeMatchState {
  currentMatch: Match | null;
  upcomingMatches: Match[];
  timeUntilNextMatch: number; // in seconds
  currentTime: Date;
  isLoading: boolean;
  scheduleIndex: number;
}

/**
 * Hook to get real-time current match and upcoming matches
 * Updates continuously to always show what's playing NOW
 */
export const useGlobalTimeMatches = (updateInterval: number = 1000): GlobalTimeMatchState => {
  const [state, setState] = useState<GlobalTimeMatchState>({
    currentMatch: null,
    upcomingMatches: [],
    timeUntilNextMatch: 0,
    currentTime: new Date(),
    isLoading: true,
    scheduleIndex: 0,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateMatchState = useCallback(() => {
    const now = new Date();
    const current = getCurrentMatch();
    const upcoming = getUpcomingMatches(5);
    const timeUntil = getTimeUntilNextMatch();

    // Calculate schedule index for reference
    const allMatches = getAllAvailableMatches();
    let scheduleIndex = 0;
    if (current && allMatches.length > 0) {
      scheduleIndex = allMatches.findIndex((m) => m.id === current.id.split('-')[0]);
    }

    setState({
      currentMatch: current,
      upcomingMatches: upcoming,
      timeUntilNextMatch: timeUntil,
      currentTime: now,
      isLoading: false,
      scheduleIndex,
    });
  }, []);

  // Set up interval for continuous updates
  useEffect(() => {
    // Initial update
    updateMatchState();

    // Set up timer
    timerRef.current = setInterval(updateMatchState, updateInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [updateMatchState, updateInterval]);

  return state;
};

/**
 * Hook: useMatchAtSpecificTime
 * Get the match that will be playing at a specific time
 * Useful for "match predictor" features
 */
export const useMatchAtSpecificTime = (targetTime: Date | null): Match | null => {
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (!targetTime) {
      setMatch(null);
      return;
    }

    // Import here to avoid circular dependency
    const { getMatchAtTime } = require('@/utils/globalTimeMatchSystem');
    const foundMatch = getMatchAtTime(targetTime);
    setMatch(foundMatch);
  }, [targetTime]);

  return match;
};

/**
 * Hook: useCountdownToNextMatch
 * Get countdown timer to next match
 */
export interface CountdownData {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  displayText: string;
  totalSeconds: number;
}

export const useCountdownToNextMatch = (updateInterval: number = 1000): CountdownData => {
  const [countdown, setCountdown] = useState<CountdownData>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    displayText: '00:00',
    totalSeconds: 0,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateCountdown = useCallback(() => {
    const timeUntil = getTimeUntilNextMatch();

    const days = Math.floor(timeUntil / (24 * 3600));
    const hours = Math.floor((timeUntil % (24 * 3600)) / 3600);
    const minutes = Math.floor((timeUntil % 3600) / 60);
    const seconds = timeUntil % 60;

    let displayText = '';
    if (days > 0) {
      displayText = `${days}d ${hours}h`;
    } else if (hours > 0) {
      displayText = `${hours}h ${minutes}m`;
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
      totalSeconds: timeUntil,
      displayText,
    });
  }, []);

  useEffect(() => {
    updateCountdown();
    timerRef.current = setInterval(updateCountdown, updateInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [updateCountdown, updateInterval]);

  return countdown;
};

/**
 * Hook: useMatchScheduleInfo
 * Get detailed scheduling information about a match
 */
export interface MatchScheduleInfo {
  scheduledTime: Date;
  dayOfWeek: string;
  formattedDate: string;
  formattedTime: string;
  isToday: boolean;
  isTomorrow: boolean;
  isFuture: boolean;
  isPast: boolean;
  minutesRemaining: number;
  matchDurationMinutes: number;
}

export const useMatchScheduleInfo = (match: Match | null): MatchScheduleInfo | null => {
  const [info, setInfo] = useState<MatchScheduleInfo | null>(null);

  useEffect(() => {
    if (!match) {
      setInfo(null);
      return;
    }

    const kickoff = new Date(match.kickoffTime);
    const now = new Date();

    const dayOfWeek = kickoff.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = kickoff.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = kickoff.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);

    const matchDate = new Date(kickoff);
    matchDate.setHours(0, 0, 0, 0);

    const isToday = matchDate.getTime() === today.getTime();
    const isTomorrow = matchDate.getTime() === tomorrow.getTime();
    const isPast = kickoff < now;
    const isFuture = kickoff > now;

    const matchEnd = new Date(kickoff.getTime() + 90 * 60000);
    const minutesRemaining = Math.max(0, Math.ceil((matchEnd.getTime() - now.getTime()) / 60000));
    const matchDurationMinutes = 90;

    setInfo({
      scheduledTime: kickoff,
      dayOfWeek,
      formattedDate,
      formattedTime,
      isToday,
      isTomorrow,
      isFuture,
      isPast,
      minutesRemaining,
      matchDurationMinutes,
    });
  }, [match]);

  return info;
};
