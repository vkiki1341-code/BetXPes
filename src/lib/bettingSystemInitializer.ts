/**
 * Enhanced BetXPesa Component Initialization
 * Ensures global time-based system is used instead of week-based system
 * This file provides initialization helpers for the main betting page
 */

import { initializeGlobalMatchSystem, getCurrentMatch, getUpcomingMatches } from '@/utils/globalTimeMatchSystem';
import { getGlobalSchedule } from '@/lib/matchScheduleService';

/**
 * Initialize betting system to use global time instead of weeks
 * Call this in useEffect on component mount, BEFORE any state initialization
 */
export const initializeBettingWithGlobalTime = async (): Promise<void> => {
  try {
    // Initialize global time system first
    initializeGlobalMatchSystem();
    
    // Get the current schedule
    const schedule = getGlobalSchedule();
    
    console.log('✅ Betting initialized with global time system');
    console.log('📅 Reference Epoch:', new Date(schedule.referenceEpoch).toISOString());
    console.log('⏱️ Match Interval:', schedule.matchInterval, 'minutes');
    
    return;
  } catch (error) {
    console.error('Failed to initialize global time betting system:', error);
    throw error;
  }
};

/**
 * Get the current match for betting
 */
export const getCurrentBettingMatch = () => {
  try {
    return getCurrentMatch();
  } catch (error) {
    console.error('Error getting current betting match:', error);
    return null;
  }
};

/**
 * Get upcoming matches for the betting slip
 */
export const getUpcomingBettingMatches = (count: number = 5) => {
  try {
    return getUpcomingMatches(count);
  } catch (error) {
    console.error('Error getting upcoming betting matches:', error);
    return [];
  }
};

/**
 * Convert global time system initialization to compatible state
 * for existing betting components
 */
export const createInitialBettingState = () => {
  try {
    const currentMatch = getCurrentMatch();
    const upcomingMatches = getUpcomingMatches(5);
    
    return {
      currentMatch,
      upcomingMatches,
      isGlobalTimeSystem: true,
      systemStartTime: new Date(),
    };
  } catch (error) {
    console.error('Error creating initial betting state:', error);
    return {
      currentMatch: null,
      upcomingMatches: [],
      isGlobalTimeSystem: false,
      systemStartTime: new Date(),
    };
  }
};

/**
 * Ensure global time system is active on page load
 * Prevent loading old week-based system
 */
export const ensureGlobalTimeSystemActive = (): boolean => {
  const isActive = localStorage.getItem('global_match_schedule_initialized') !== null;
  
  if (!isActive) {
    console.warn('⚠️ Global time system not initialized, initializing now...');
    initializeGlobalMatchSystem();
  }
  
  return true;
};

/**
 * Force switch from week-based system to global time
 * Use this if you detect the old system is being used
 */
export const switchToGlobalTimeSystem = (): void => {
  // Clear old week-based state
  localStorage.removeItem('betting_system_state');
  
  // Initialize new global time system
  initializeGlobalMatchSystem();
  
  console.log('✅ Switched to global time-based match system');
};
