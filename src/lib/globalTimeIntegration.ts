/**
 * Integration wrapper to add global time-based scheduling to existing betting system
 * Maintains backward compatibility with existing functionality
 */

import { Match } from '@/types/betting';
import { initializeGlobalMatchSystem } from '@/utils/globalTimeMatchSystem';

/**
 * Initialize the global time system
 * Call this once at app startup
 */
export const setupGlobalTimeSystem = (): void => {
  initializeGlobalMatchSystem();
  console.log('✅ Global time-based match system initialized');
};

/**
 * Bridge function to convert global time matches to betting format
 * Ensures compatibility with existing betting interfaces
 */
export const convertGlobalMatchForBetting = (match: Match): any => {
  return {
    ...match,
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    kickoffTime: match.kickoffTime,
    overOdds: parseFloat(match.overOdds),
    underOdds: parseFloat(match.underOdds),
    // Additional fields for betting context
    status: 'upcoming',
    isGlobalTimeMatch: true,
    scheduledAt: match.kickoffTime.toISOString(),
  };
};

/**
 * Configuration for global time system integration
 */
export const GLOBAL_TIME_CONFIG = {
  // Match interval in minutes
  MATCH_INTERVAL_MINUTES: 30,
  
  // Update frequency for UI (milliseconds)
  UI_UPDATE_INTERVAL: 1000,
  
  // How many upcoming matches to show
  UPCOMING_MATCHES_COUNT: 5,
  
  // Enable logging
  DEBUG: false,
  
  // Allow fallback to old system if needed
  FALLBACK_ENABLED: true,
};

/**
 * Check if global time system is active
 */
export const isGlobalTimeSystemActive = (): boolean => {
  return localStorage.getItem('global_match_schedule_initialized') !== null;
};

/**
 * Log system events for debugging
 */
export const logSystemEvent = (event: string, data?: any): void => {
  if (GLOBAL_TIME_CONFIG.DEBUG) {
    console.log(`[GlobalTimeSystem] ${event}`, data);
  }
};
