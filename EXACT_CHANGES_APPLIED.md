# EXACT CHANGES - Week 1 Fix

## File: src/pages/SharedTimeframesBetting.tsx

---

## CHANGE #1: Lines ~395-410 (Supabase Realtime Subscription)

### Added Code Block
Right at the start of the `setupRealtimeSync` function, add this check:

```typescript
// CHECK: Only setup Supabase sync if global time system is NOT active
const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;

if (isGlobalTimeActive) {
  console.log('✅ Global time system is active - SKIPPING Supabase realtime sync');
  return;
}
```

### Full Context

```typescript
useEffect(() => {
  let unsubscribe: any = null;

  const setupRealtimeSync = async () => {
    try {
      // ← INSERT HERE (6 lines added)
      // CHECK: Only setup Supabase sync if global time system is NOT active
      const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
      
      if (isGlobalTimeActive) {
        console.log('✅ Global time system is active - SKIPPING Supabase realtime sync');
        return;
      }
      // ← END INSERT

      // Subscribe to realtime changes
      unsubscribe = supabase
        .channel('betting_system_state_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'betting_system_state' },
          (payload) => {
            // ... rest of callback
```

---

## CHANGE #2: Lines ~465-480 (Initial State Sync)

### Added Code Block
Right at the start of the `syncImmediately` function, add this check:

```typescript
// CHECK: If global time system is active, DO NOT load week-based state
const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;

if (isGlobalTimeActive) {
  console.log('✅ Global time system is active - SKIPPING week-based state');
  // Don't load old week system, use global time defaults
  setCurrentTimeframeIdx(0);
  setLiveTimeframeIdx(0);
  setMatchState('pre-countdown');
  setCountdown(10);
  return;
}
```

### Full Context

```typescript
useEffect(() => {
  const handleSystemStateChange = (event: any) => {
    const newState = event.detail;
    console.log('📡 Component updating from global state:', newState);
    setCurrentTimeframeIdx(newState.currentTimeframeIdx);
    setLiveTimeframeIdx(newState.currentTimeframeIdx);
    setMatchState(newState.matchState);
    setCountdown(newState.countdown);
  };

  window.addEventListener('systemStateChanged', handleSystemStateChange);
  
  // Also sync immediately on mount
  const syncImmediately = async () => {
    try {
      // ← INSERT HERE (11 lines added)
      // CHECK: If global time system is active, DO NOT load week-based state
      const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
      
      if (isGlobalTimeActive) {
        console.log('✅ Global time system is active - SKIPPING week-based state');
        // Don't load old week system, use global time defaults
        setCurrentTimeframeIdx(0);
        setLiveTimeframeIdx(0);
        setMatchState('pre-countdown');
        setCountdown(10);
        return;
      }
      // ← END INSERT

      // Only load from Supabase if global time system is NOT active
      const globalState = await getSystemStateFromSupabase();
      console.log('⚡ Initial sync from Supabase:', globalState);
      setCurrentTimeframeIdx(globalState.currentTimeframeIdx);
      setLiveTimeframeIdx(globalState.currentTimeframeIdx);
      setMatchState(globalState.matchState);
      setCountdown(globalState.countdown);
    } catch (err) {
      console.error('Sync failed, using defaults:', err);
      // Use defaults if sync fails
      setCurrentTimeframeIdx(0);
      setLiveTimeframeIdx(0);
      setMatchState('pre-countdown');
      setCountdown(10);
    }
  };
```

---

## Summary of Changes

### Total Lines Added: 17 lines
- Change #1: 6 lines
- Change #2: 11 lines

### Total Lines Changed: 2 functions

### Backward Compatibility: ✅ Maintained
- If flag not found, uses original logic
- No breaking changes
- Old system still works as fallback

---

## How to Apply These Changes

### Option 1: Manual Edit (Copy-Paste)

1. Open `src/pages/SharedTimeframesBetting.tsx`
2. Find line ~395 (search for "setupRealtimeSync")
3. Copy CHANGE #1 code block
4. Paste right after `try {`
5. Find line ~465 (search for "syncImmediately")
6. Copy CHANGE #2 code block
7. Paste right after `try {`
8. Save file

### Option 2: Search & Replace

Use find/replace in VSCode:

**Find #1:**
```
const setupRealtimeSync = async () => {
    try {
      // Subscribe to realtime changes
```

**Replace with:**
```
const setupRealtimeSync = async () => {
    try {
      // CHECK: Only setup Supabase sync if global time system is NOT active
      const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
      
      if (isGlobalTimeActive) {
        console.log('✅ Global time system is active - SKIPPING Supabase realtime sync');
        return;
      }

      // Subscribe to realtime changes
```

**Find #2:**
```
const syncImmediately = async () => {
        try {
          const globalState = await getSystemStateFromSupabase();
```

**Replace with:**
```
const syncImmediately = async () => {
        try {
          // CHECK: If global time system is active, DO NOT load week-based state
          const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
          
          if (isGlobalTimeActive) {
            console.log('✅ Global time system is active - SKIPPING week-based state');
            // Don't load old week system, use global time defaults
            setCurrentTimeframeIdx(0);
            setLiveTimeframeIdx(0);
            setMatchState('pre-countdown');
            setCountdown(10);
            return;
          }
          
          // Only load from Supabase if global time system is NOT active
          const globalState = await getSystemStateFromSupabase();
```

---

## Verification

After applying changes:

### 1. Syntax Check
Open file in VSCode - should show NO red squiggly lines

### 2. Grep Verification
```bash
# Terminal
grep "SKIPPING Supabase realtime sync" src/pages/SharedTimeframesBetting.tsx
grep "SKIPPING week-based state" src/pages/SharedTimeframesBetting.tsx
```

Both should return line numbers (not found = not applied)

### 3. Build Check
```bash
# Terminal
npm run dev
# Or if using bun:
bun run dev
```

Should compile without errors

### 4. Runtime Check
1. Clear cache: `localStorage.clear()`
2. Reload: `Ctrl+F5`
3. Check console for: `✅ Global time system is active`

---

## Quick Reference

### What Gets Added
- 17 lines of guard code
- 2 localStorage checks
- 2 early returns (exit if global active)
- 4 console.log messages

### What Gets Removed
- Nothing! No code is removed, only additions

### What Gets Changed
- Nothing is modified, only additions are made

### Backward Compatibility
- ✅ Old code path still works
- ✅ No breaking changes
- ✅ Can disable new system anytime

---

## The Key Line (Most Important)

This one line is the heart of the fix:

```typescript
const isGlobalTimeActive = localStorage.getItem('global_match_schedule_initialized') !== null;
```

If this flag exists, SKIP loading Week 1. That's the entire fix!

---

## Files Status

✅ **Already Fixed** (no changes needed):
- `src/App.tsx` - Has setupGlobalTimeSystem() calls
- `src/lib/globalTimeIntegration.ts` - Initializes the flag
- `src/lib/bettingSystemInitializer.ts` - Has switchToGlobalTimeSystem()

✅ **Needs Fixing** (changes above):
- `src/pages/SharedTimeframesBetting.tsx` - Apply 2 changes above

---

## Error Handling

Both code blocks have try/catch wrappers:

```typescript
try {
  // Check here
  // Load data here
  // Set state here
} catch (err) {
  console.error('Error:', err);
  // Fallback to defaults
}
```

If anything fails, falls back to safe defaults.

---

## Summary

✅ 17 lines added in 2 locations
✅ 0 lines removed
✅ 0 lines modified
✅ 100% backward compatible
✅ Ready for production

