/**
 * Match Score Validation Utilities
 * Prevents invalid match scores from being saved to the database
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MatchScores {
  homeGoals: number;
  awayGoals: number;
  matchId?: string;
  minute?: number;
}

// Configuration for realistic score ranges
const SCORE_CONFIG = {
  MIN_GOALS: 0,
  MAX_GOALS: 15, // 15 is unrealistic but allows for edge cases
  REALISTIC_MAX: 10, // Most matches end with less than 10 combined goals
  WARNING_THRESHOLD: 8, // Warn if combined goals exceeds this
};

/**
 * Validates individual match scores
 * @param homeGoals - Goals scored by home team
 * @param awayGoals - Goals scored by away team
 * @returns ValidationResult with valid flag and any errors/warnings
 */
export function validateMatchScores(
  homeGoals: number,
  awayGoals: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if inputs are numbers
  if (typeof homeGoals !== 'number' || typeof awayGoals !== 'number') {
    errors.push('Scores must be numeric values');
    return { valid: false, errors, warnings };
  }

  // Check if inputs are integers
  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals)) {
    errors.push('Scores must be whole numbers (no decimals)');
    return { valid: false, errors, warnings };
  }

  // Check minimum score
  if (homeGoals < SCORE_CONFIG.MIN_GOALS) {
    errors.push(`Home team goals cannot be negative (got ${homeGoals})`);
  }
  if (awayGoals < SCORE_CONFIG.MIN_GOALS) {
    errors.push(`Away team goals cannot be negative (got ${awayGoals})`);
  }

  // Check maximum score
  if (homeGoals > SCORE_CONFIG.MAX_GOALS) {
    errors.push(`Home team goals cannot exceed ${SCORE_CONFIG.MAX_GOALS} (got ${homeGoals})`);
  }
  if (awayGoals > SCORE_CONFIG.MAX_GOALS) {
    errors.push(`Away team goals cannot exceed ${SCORE_CONFIG.MAX_GOALS} (got ${awayGoals})`);
  }

  // Early return if errors found
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Warnings for unrealistic but technically valid scores
  if (homeGoals > SCORE_CONFIG.REALISTIC_MAX) {
    warnings.push(`Home team score of ${homeGoals} is unusually high`);
  }
  if (awayGoals > SCORE_CONFIG.REALISTIC_MAX) {
    warnings.push(`Away team score of ${awayGoals} is unusually high`);
  }

  const totalGoals = homeGoals + awayGoals;
  if (totalGoals > SCORE_CONFIG.WARNING_THRESHOLD) {
    warnings.push(
      `Total goals of ${totalGoals} is unusually high (combined score)`
    );
  }

  return {
    valid: true,
    errors,
    warnings,
  };
}

/**
 * Validates a complete match with all details
 */
export function validateMatch(match: {
  homeGoals: number;
  awayGoals: number;
  matchId?: string;
  minute?: number;
  homeTeam?: string;
  awayTeam?: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate core scores
  const scoreValidation = validateMatchScores(match.homeGoals, match.awayGoals);
  errors.push(...scoreValidation.errors);
  warnings.push(...scoreValidation.warnings);

  // Validate minute if provided
  if (match.minute !== undefined) {
    if (!Number.isInteger(match.minute)) {
      errors.push('Match minute must be a whole number');
    }
    if (match.minute < 0) {
      errors.push('Match minute cannot be negative');
    }
    if (match.minute > 120) {
      // 90 min + 30 min extra time max
      warnings.push(`Match minute of ${match.minute} exceeds normal game duration`);
    }
  }

  // Validate match ID if provided
  if (match.matchId && typeof match.matchId !== 'string') {
    errors.push('Match ID must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Compare two scores to detect suspicious patterns
 */
export function validateScoreChange(
  previousScores: { home: number; away: number } | null,
  newScores: { home: number; away: number },
  maxGoalsPerUpdate: number = 3
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate new scores first
  const newValidation = validateMatchScores(newScores.home, newScores.away);
  errors.push(...newValidation.errors);
  warnings.push(...newValidation.warnings);

  // If no previous scores, just validate the new ones
  if (!previousScores) {
    return { valid: errors.length === 0, errors, warnings };
  }

  // Validate previous scores
  const prevValidation = validateMatchScores(previousScores.home, previousScores.away);
  if (!prevValidation.valid) {
    errors.push('Previous score was invalid:', ...prevValidation.errors);
    return { valid: false, errors, warnings };
  }

  // Check for suspicious score jumps
  const homeGoalChange = newScores.home - previousScores.home;
  const awayGoalChange = newScores.away - previousScores.away;

  // Goals should only increase or stay same
  if (homeGoalChange < 0) {
    errors.push(
      `Home team goals decreased from ${previousScores.home} to ${newScores.home} (goals cannot decrease)`
    );
  }
  if (awayGoalChange < 0) {
    errors.push(
      `Away team goals decreased from ${previousScores.away} to ${newScores.away} (goals cannot decrease)`
    );
  }

  // Check for unrealistic goal spurts
  if (homeGoalChange > maxGoalsPerUpdate) {
    warnings.push(
      `Home team scored ${homeGoalChange} goals in one update (unusually high)`
    );
  }
  if (awayGoalChange > maxGoalsPerUpdate) {
    warnings.push(
      `Away team scored ${awayGoalChange} goals in one update (unusually high)`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a score is valid for bet resolution
 */
export function validateScoreForBets(
  homeGoals: number,
  awayGoals: number
): { valid: boolean; message: string } {
  const validation = validateMatchScores(homeGoals, awayGoals);

  if (!validation.valid) {
    return {
      valid: false,
      message: `Invalid score: ${validation.errors.join(', ')}`,
    };
  }

  if (validation.warnings.length > 0) {
    // Warnings don't block bets, just log them
    console.warn('Score warnings:', validation.warnings);
  }

  return {
    valid: true,
    message: 'Score is valid for betting',
  };
}

/**
 * Get human-readable error messages for UI display
 */
export function getScoreErrorMessage(
  homeGoals: number,
  awayGoals: number
): string | null {
  const validation = validateMatchScores(homeGoals, awayGoals);

  if (!validation.valid) {
    return validation.errors[0] || 'Invalid score';
  }

  return null;
}

/**
 * Sanitize and parse score input from user
 */
export function parseScoreInput(input: any): { home: number; away: number } | null {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return null;
  }

  // Handle object with home/away properties
  if (typeof input === 'object' && 'home' in input && 'away' in input) {
    const home = parseInt(input.home, 10);
    const away = parseInt(input.away, 10);

    if (!isNaN(home) && !isNaN(away)) {
      return { home, away };
    }
  }

  // Handle string like "2-1"
  if (typeof input === 'string') {
    const match = input.match(/^(\d+)\s*-\s*(\d+)$/);
    if (match) {
      return {
        home: parseInt(match[1], 10),
        away: parseInt(match[2], 10),
      };
    }
  }

  return null;
}

/**
 * Format score for display
 */
export function formatScore(homeGoals: number, awayGoals: number): string {
  return `${homeGoals}-${awayGoals}`;
}

/**
 * Determine match result
 */
export function getMatchResult(
  homeGoals: number,
  awayGoals: number
): 'home' | 'away' | 'draw' {
  if (homeGoals > awayGoals) return 'home';
  if (awayGoals > homeGoals) return 'away';
  return 'draw';
}
