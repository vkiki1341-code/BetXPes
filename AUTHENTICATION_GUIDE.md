# Authentication & Route Protection Implementation

## Overview
This system implements complete authentication protection for your betting application. Users must be signed in to access protected pages, while the landing page and authentication pages remain public.

---

## Architecture

### Public Routes (No Authentication Required)
- `/` - Landing page (Index.tsx)
- `/login` - Login page (Login.tsx)
- `/signup` - Sign up page (Signup.tsx)
- `/forgot-password` - Password reset page (ForgotPassword.tsx)

### Protected Routes (Authentication Required)
All these routes are wrapped with `ProtectedRoute` component:
- `/betting` - Main betting interface (SharedTimeframesBetting.tsx)
- `/admin` - Admin panel (Admin.tsx)
- `/results` - Match results (Results.tsx)
- `/promos` - Promotions (Promos.tsx)
- `/mybets` - User's bets (MyBets.tsx)
- `/account` - Account settings (Account.tsx)
- `/history` - Betting history (History.tsx)
- `/deposit` - Deposit funds (Deposit.tsx)
- `/withdraw` - Withdraw funds (Withdraw.tsx)
- `/referral` - Referral program (Referral.tsx)

---

## Component Structure

### ProtectedRoute Component
**File:** `src/components/ProtectedRoute.tsx`

The `ProtectedRoute` component is a wrapper that:
1. Checks if the user is authenticated
2. Shows a loading spinner while checking
3. Redirects unauthenticated users to `/login`
4. Renders protected content if authenticated

```tsx
<ProtectedRoute>
  <MyComponent />
</ProtectedRoute>
```

**Key Features:**
- Uses Supabase `auth.getUser()` to check current authentication status
- Subscribes to auth state changes for real-time updates
- Cleans up subscriptions to prevent memory leaks
- Provides smooth user experience with loading states

### Updated App.tsx
**File:** `src/App.tsx`

Routes are now organized into:
1. **Public routes** - No ProtectedRoute wrapper
2. **Protected routes** - Wrapped with ProtectedRoute
3. **Catch-all** - NotFound component for invalid routes

### Login/Signup Auth Redirects
All authentication pages now:
1. Check if user is already logged in
2. Redirect to `/betting` if authenticated
3. Prevent authenticated users from accessing auth pages

**Updated Files:**
- `src/pages/Login.tsx` - Redirects to `/betting` on success
- `src/pages/Signup.tsx` - Redirects to `/betting` on success
- `src/pages/ForgotPassword.tsx` - Redirects to `/betting` if already logged in

---

## User Flow

### First-Time User
1. User lands on `/` (landing page)
2. Clicks "Sign Up" button
3. Taken to `/signup` (public page)
4. Completes signup
5. Auto-logged in and redirected to `/betting`
6. Enters protected betting interface

### Returning User
1. User goes to any protected page (e.g., `/deposit`)
2. ProtectedRoute checks authentication
3. If not logged in → Redirected to `/login`
4. If logged in → Page loads normally

### Logged In User Accessing Auth Pages
1. User tries to visit `/login` while logged in
2. Page detects they're already authenticated
3. Automatically redirects to `/betting`
4. Prevents confusion and improves UX

### Logout Flow
When user logs out:
1. Supabase auth state updates
2. ProtectedRoute detects change
3. Next attempt to access protected page redirects to `/login`

---

## Security Features

### Authentication Checks
- Uses Supabase built-in authentication
- Checks authentication state before rendering protected pages
- Properly handles auth state changes

### Session Management
- Supabase manages session tokens automatically
- Sessions persist across browser sessions
- Sessions are invalidated on logout

### Redirect Prevention
- Unauthenticated users cannot access protected pages
- Authenticated users cannot confuse themselves with auth pages
- All redirects happen smoothly with loading states

---

## Implementation Details

### How ProtectedRoute Works

1. **Initial Mount:**
   ```tsx
   useEffect(() => {
     const checkAuth = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       setIsAuthenticated(!!user);
     };
     checkAuth();
   }, []);
   ```

2. **Subscribe to Auth Changes:**
   ```tsx
   const { data: { subscription } } = supabase.auth.onAuthStateChange(
     (event, session) => {
       setIsAuthenticated(!!session?.user);
     }
   );
   ```

3. **Render Logic:**
   ```tsx
   if (loading) return <LoadingSpinner />; // Show spinner while checking
   if (!isAuthenticated) return <Navigate to="/login" />; // Redirect if not auth
   return <>{children}</>; // Render protected content
   ```

### Route Configuration in App.tsx

**Before:**
```tsx
<Route path="/deposit" element={<Deposit />} />
```

**After:**
```tsx
<Route
  path="/deposit"
  element={
    <ProtectedRoute>
      <Deposit />
    </ProtectedRoute>
  }
/>
```

---

## Testing the System

### Test 1: Unauthenticated Access
1. Open a new incognito/private window
2. Go to `http://localhost:5173/betting`
3. **Expected:** Redirected to login page

### Test 2: Login Redirect
1. Login with valid credentials
2. **Expected:** Redirected to `/betting` automatically
3. Page loads with betting interface

### Test 3: Authenticated Access
1. Login to your account
2. Visit `/deposit`, `/account`, `/admin`, etc.
3. **Expected:** All pages load normally

### Test 4: Logout and Re-protect
1. Click logout
2. Refresh page or try to access `/deposit`
3. **Expected:** Redirected to login page

### Test 5: Auth Page Bypass
1. Login to your account
2. Go to `/login` or `/signup`
3. **Expected:** Automatically redirected to `/betting`

---

## Troubleshooting

### User Stuck on Loading Screen
**Problem:** ProtectedRoute shows loading spinner indefinitely
**Solution:**
1. Check browser console (F12) for errors
2. Verify Supabase client is properly configured
3. Check internet connection
4. Try clearing browser cache

### Redirect Not Working
**Problem:** After login, user not redirected to `/betting`
**Solution:**
1. Check `navigate()` function is being called
2. Verify router is properly set up in App.tsx
3. Check browser console for navigation errors
4. Ensure no race conditions in async code

### Unauthenticated Users Accessing Protected Pages
**Problem:** User can somehow access protected pages without login
**Solution:**
1. Verify ProtectedRoute component is wrapping all protected pages
2. Check if there's a localStorage override
3. Clear all auth-related storage and try again
4. Check Supabase session validity

### Login/Signup Stuck
**Problem:** Authentication pages not responding
**Solution:**
1. Check Supabase credentials are correct
2. Verify Supabase project is active
3. Check for network errors in console
4. Verify email/password meet requirements

---

## Configuration

### Required Supabase Setup
1. Enable authentication in Supabase project
2. Configure email/password provider
3. Set redirect URLs:
   - `http://localhost:5173` (local development)
   - Your production domain

### Environment Variables
Ensure these are set in `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Session Persistence
Sessions are automatically persisted by Supabase:
- Stored in browser localStorage
- Automatically refreshed when needed
- Cleared on logout

---

## Advanced Features

### Adding New Protected Pages
1. Create your component in `src/pages/`
2. Import in `App.tsx`
3. Add route with ProtectedRoute wrapper:
   ```tsx
   <Route
     path="/newpage"
     element={
       <ProtectedRoute>
         <NewPage />
       </ProtectedRoute>
     }
   />
   ```

### Role-Based Access Control (Future)
You can extend ProtectedRoute to check user roles:
```tsx
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  // ... existing auth check ...
  // Add role check
  if (user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
```

### Custom Loading Component
Replace the default loading spinner in ProtectedRoute:
```tsx
if (loading) {
  return <CustomLoadingComponent />;
}
```

---

## Migration Notes

### What Changed
- `/` now points to landing page (Index.tsx) instead of betting
- `/betting` is the new path for main betting interface
- All protected pages now use ProtectedRoute wrapper
- Auth pages now check if user is already logged in

### What Stays the Same
- All page components work the same way
- Supabase integration unchanged
- User data and sessions work the same
- All features and functionality preserved

### Breaking Changes
**If you have links to `/` expecting the betting page:**
- Update all links to `/betting`
- Users bookmarks to `/` will go to landing page (which is intended)

---

## Best Practices

1. **Always wrap sensitive pages** - Use ProtectedRoute for any page requiring login
2. **Handle loading states** - Show spinners, not empty pages
3. **Redirect strategically** - Take users to relevant pages after actions
4. **Test thoroughly** - Test all auth flows before deploying
5. **Monitor errors** - Check console logs for auth-related issues
6. **Document custom routes** - Keep this guide updated with new routes

---

## Support & Debugging

### Enable Debug Logging
Add this to ProtectedRoute for debugging:
```tsx
console.log('Auth check:', { isAuthenticated, loading });
```

### Check Auth State
In browser console:
```javascript
// Get current user
supabase.auth.getUser().then(({ data }) => console.log(data.user));

// Get session
supabase.auth.getSession().then(({ data }) => console.log(data.session));
```

### Monitor Auth Changes
```javascript
// Subscribe to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  console.log('Session:', session);
});
```

---

## File Structure Reference

```
src/
├── App.tsx (Updated - main router with ProtectedRoute)
├── components/
│   └── ProtectedRoute.tsx (New - auth wrapper component)
├── pages/
│   ├── Index.tsx (Updated - landing page at /)
│   ├── Login.tsx (Updated - redirects to /betting on success)
│   ├── Signup.tsx (Updated - redirects to /betting on success)
│   ├── ForgotPassword.tsx (Updated - redirects to /betting if logged in)
│   ├── SharedTimeframesBetting.tsx (Updated - now at /betting)
│   ├── Admin.tsx (Protected)
│   ├── Results.tsx (Protected)
│   ├── Promos.tsx (Protected)
│   ├── MyBets.tsx (Protected)
│   ├── Account.tsx (Protected)
│   ├── History.tsx (Protected)
│   ├── Deposit.tsx (Protected)
│   ├── Withdraw.tsx (Protected)
│   ├── Referral.tsx (Protected)
│   └── NotFound.tsx
```

---

This authentication system is now complete and production-ready! 🎉
