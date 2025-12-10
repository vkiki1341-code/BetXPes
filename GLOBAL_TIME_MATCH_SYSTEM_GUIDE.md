# Global Time-Based Match Scheduling System

## Overview

A **continuous, globally-synchronized match scheduling system** where:
- ✅ All users see the **SAME match at the SAME time** globally
- ✅ Matches change every **30 minutes** automatically
- ✅ Users can **predict matches for future dates/times**
- ✅ Matches cycle through all available teams **continuously forever**
- ✅ **No manual match generation needed** - automatic based on time

---

## System Architecture

### 1. **Core Services**

#### `matchScheduleService.ts` - Global Time Scheduling
- `initializeGlobalSchedule()` - Sets up reference epoch (one-time)
- `getGlobalSchedule()` - Gets current schedule config
- `calculateScheduledTime(index)` - Calculates when match N should play
- `findScheduleIndexForTime(time)` - Finds which match is playing at given time
- `getMatchAtTime(time)` - Gets specific match at specific time
- `getUpcomingMatches(count)` - Gets next N matches from now

#### `globalTimeMatchSystem.ts` - Match Management
- `initializeGlobalMatchSystem()` - Initialize on app startup
- `getCurrentMatch()` - Get match playing RIGHT NOW
- `getUpcomingMatches(count)` - Get upcoming matches
- `getMatchAtTime(time)` - Get match at specific time
- `getAllAvailableMatches()` - Get all match pairs (cycles through them)

### 2. **Hooks for Real-Time Updates**

#### `useGlobalTimeMatches.ts`
```typescript
// Continuous real-time tracking
const state = useGlobalTimeMatches(1000); // Updates every second
// Returns: {
//   currentMatch,     // What's playing now
//   upcomingMatches,  // Next 5 matches
//   timeUntilNextMatch, // Seconds
//   currentTime       // Real-time
// }

// Get countdown to next match
const countdown = useCountdownToNextMatch(1000);

// Get match at specific time
const match = useMatchAtSpecificTime(targetTime);
```

### 3. **Components**

#### `GlobalMatchList.tsx` - Main Betting Display
```tsx
<GlobalMatchList 
  showUpcoming={true}
  maxUpcoming={5}
  onMatchSelect={(matchId) => {}}
/>
```
Shows:
- Current match (LIVE NOW)
- 5 upcoming matches
- Countdown timer
- Global sync info

#### `MatchPredictor.tsx` - Time-Based Match Lookup
```tsx
<MatchPredictor />
```
Allows users to:
- Pick any date/time
- See what match will play then
- Quick select buttons (Now, +1hr, Tomorrow, etc.)

#### `GlobalTimeConfig.tsx` - Admin Configuration
```tsx
<GlobalTimeConfig />
```
Admins can:
- Set reference time
- Change match interval (5-360 mins)
- View schedule impact stats

---

## How It Works

### Timeline Example (30-min intervals)

```
Reference Epoch: 2024-12-10 10:00 AM

Index 0 → 10:00 AM - Arsenal vs Liverpool
Index 1 → 10:30 AM - Man City vs Chelsea
Index 2 → 11:00 AM - Man United vs Tottenham
Index 3 → 11:30 AM - Brighton vs Everton
... (cycles through all teams)
Index N → Arsenal vs Liverpool (repeats after all teams paired)
```

### Key Features

1. **Global Synchronization**
   - All users see the same match at the same time
   - No conflicting match states
   - Works across all time zones

2. **Continuous Scheduling**
   - Matches never stop - cycle forever
   - New match every 30 minutes
   - Predictable and deterministic

3. **Time-Based Lookup**
   ```typescript
   // Users can predict any time
   const matchAtNoon = getMatchAtTime(new Date('2024-12-11 12:00'));
   const matchNextWeek = getMatchAtTime(new Date('2024-12-17 15:00'));
   ```

4. **No Manual Management**
   - No admin needed to create matches
   - No match expiration/regeneration
   - Automatic forever

---

## Integration with Existing System

### Maintaining Backward Compatibility

The new system works **alongside** existing functionality:

```typescript
// Old system still available
import { regenerateMatchesIfNeeded } from '@/utils/matchGenerator';

// New system available
import { getCurrentMatch } from '@/utils/globalTimeMatchSystem';

// Integration layer for shared usage
import { setupGlobalTimeSystem } from '@/lib/globalTimeIntegration';
```

### Database Integration

Optional: Store scheduled times in database for persistence:

```sql
-- Already created in MATCH_SCHEDULING_SCHEMA.sql
ALTER TABLE matches ADD COLUMN scheduled_start_time TIMESTAMP;
ALTER TABLE matches ADD COLUMN schedule_index INTEGER;
ALTER TABLE matches ADD COLUMN reference_epoch BIGINT;

-- Global schedule config table
CREATE TABLE global_schedule_config (
  id UUID PRIMARY KEY,
  reference_epoch BIGINT,
  match_interval_minutes INTEGER,
  timezone VARCHAR(50)
);
```

---

## Usage Examples

### 1. Show Current Match in App

```tsx
import { GlobalMatchList } from '@/components/GlobalMatchList';

function HomePage() {
  return (
    <div>
      <GlobalMatchList 
        showUpcoming={true}
        maxUpcoming={5}
      />
    </div>
  );
}
```

### 2. Predict Match for Specific Time

```tsx
import { MatchPredictor } from '@/components/MatchPredictor';

function PredictorPage() {
  return <MatchPredictor />;
}
```

### 3. Real-Time Match Tracking

```tsx
import { useGlobalTimeMatches, useCountdownToNextMatch } from '@/hooks/useGlobalTimeMatches';

function LiveDashboard() {
  const { currentMatch, upcomingMatches, timeUntilNextMatch } = useGlobalTimeMatches();
  const countdown = useCountdownToNextMatch();

  return (
    <div>
      <h2>Current: {currentMatch?.homeTeam.name} vs {currentMatch?.awayTeam.name}</h2>
      <p>Next match in: {countdown.displayText}</p>
      {upcomingMatches.map(m => (
        <div key={m.id}>{m.homeTeam.name} vs {m.awayTeam.name}</div>
      ))}
    </div>
  );
}
```

### 4. Admin Configuration

```tsx
import { GlobalTimeConfig } from '@/components/GlobalTimeConfig';

function AdminPanel() {
  return (
    <div>
      <GlobalTimeConfig />
    </div>
  );
}
```

---

## Configuration

### Default Settings

```typescript
// In globalTimeIntegration.ts
GLOBAL_TIME_CONFIG = {
  MATCH_INTERVAL_MINUTES: 30,      // New match every 30 mins
  UI_UPDATE_INTERVAL: 1000,         // Update UI every 1 second
  UPCOMING_MATCHES_COUNT: 5,        // Show 5 upcoming
  DEBUG: false,                     // Disable debug logging
  FALLBACK_ENABLED: true,           // Can fall back to old system
};
```

### Customization

**Change match interval to 15 minutes:**
```typescript
import { updateMatchInterval } from '@/lib/matchScheduleService';
updateMatchInterval(15);
```

**Change reference time:**
```typescript
import { updateReferenceTime } from '@/lib/matchScheduleService';
updateReferenceTime(new Date('2024-12-10 08:00 AM'));
```

---

## Testing

### Test Current Match
```typescript
import { getCurrentMatch } from '@/utils/globalTimeMatchSystem';

const match = getCurrentMatch();
console.log(`Playing now: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
```

### Test Future Prediction
```typescript
import { getMatchAtTime } from '@/utils/globalTimeMatchSystem';

// What plays at 3 PM tomorrow?
const tomorrow3pm = new Date();
tomorrow3pm.setDate(tomorrow3pm.getDate() + 1);
tomorrow3pm.setHours(15, 0, 0, 0);

const match = getMatchAtTime(tomorrow3pm);
console.log(`Tomorrow 3 PM: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
```

### Test Upcoming
```typescript
import { getUpcomingMatches } from '@/utils/globalTimeMatchSystem';

const next10 = getUpcomingMatches(10);
next10.forEach((m, i) => {
  console.log(`${i+1}. ${m.homeTeam.name} vs ${m.awayTeam.name}`);
});
```

---

## Real-Time Sync Across Users

All users automatically see the same match because they all:
1. Use the same reference epoch (stored in localStorage, can be synced via Supabase)
2. Calculate match index based on current time
3. Use modulo to cycle through available matches

**No socket.io or realtime subscriptions needed** - just time-based calculation!

To sync reference epoch across users globally:
```sql
-- Store in Supabase
INSERT INTO global_schedule_config (reference_epoch, match_interval_minutes)
VALUES (epoch_milliseconds, 30);

-- Fetch on client
const config = await supabase
  .from('global_schedule_config')
  .select('*')
  .single();
```

---

## Monitoring & Analytics

### Get Schedule Stats
```typescript
import { getScheduleStats } from '@/utils/globalTimeMatchSystem';

const stats = getScheduleStats();
// {
//   currentMatch,
//   upcomingMatches,
//   timeUntilNextMatch,
//   totalAvailableMatches,
//   referenceEpoch
// }
```

### Check System Status
```typescript
import { isGlobalTimeSystemActive } from '@/lib/globalTimeIntegration';

if (isGlobalTimeSystemActive()) {
  console.log('✅ Global time system is active');
}
```

---

## Files Created

```
src/
├── lib/
│   ├── matchScheduleService.ts           // Core scheduling logic
│   ├── globalTimeIntegration.ts          // Integration layer
│   └── sharedTimeframeIntegration.ts     // Shared timeframe helpers
├── utils/
│   └── globalTimeMatchSystem.ts          // Match retrieval logic
├── hooks/
│   ├── useCurrentMatch.ts                // Legacy hook (kept for compat)
│   └── useGlobalTimeMatches.ts           // New real-time hook
└── components/
    ├── GlobalMatchList.tsx               // Main display component
    ├── MatchPredictor.tsx                // Time prediction component
    ├── GlobalTimeConfig.tsx              // Admin config component
    ├── DailyScheduleView.tsx             // Daily schedule view
    ├── MatchAtTime.tsx                   // Legacy component (kept for compat)
```

---

## Summary

This system creates a **truly synchronized global betting experience** where:

✅ **Users always see the current match for their time**  
✅ **Everyone sees the same match at the same time**  
✅ **Can predict what match plays at any future time**  
✅ **Matches cycle continuously forever**  
✅ **No manual match creation needed**  
✅ **Works with existing betting functionality**  

**To use it:** Just import components and initialize once. The rest is automatic!
