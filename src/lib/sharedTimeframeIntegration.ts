/**
 * Global Time Match Integration for SharedTimeframesBetting
 * Provides helper functions to use global time matches alongside existing system
 */

import { getCurrentMatch, getUpcomingMatches } from '@/utils/globalTimeMatchSystem';
import { Match } from '@/types/betting';

/**
 * Get current match from global time system
 * Falls back to existing system if needed
 */
export const getCurrentBettingMatch = (): Match | null => {
  try {
    const match = getCurrentMatch();
    return match;
  } catch (error) {
    console.error('Error getting global time match:', error);
    return null;
  }
};

/**
 * Get upcoming matches from global time system
 * Falls back gracefully
 */
export const getUpcomingBettingMatches = (count: number = 5): Match[] => {
  try {
    return getUpcomingMatches(count);
  } catch (error) {
    console.error('Error getting upcoming global time matches:', error);
    return [];
  }
};

/**
 * Format time for display in betting context
 */
export const formatTimeForBetting = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get time remaining until next match in seconds
 */
export const getTimeUntilNextBettingMatch = (): number => {
  try {
    const { getTimeUntilNextMatch } = require('@/utils/globalTimeMatchSystem');
    return getTimeUntilNextMatch();
  } catch (error) {
    console.error('Error calculating time to next match:', error);
    return 0;
  }
};

/**
 * Check if we should show global time match info
 */
export const shouldShowGlobalTimeInfo = (): boolean => {
  try {
    return localStorage.getItem('global_match_schedule_initialized') !== null;
  } catch {
    return false;
  }
};
