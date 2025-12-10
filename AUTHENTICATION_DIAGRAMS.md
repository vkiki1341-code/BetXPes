# Authentication System - Visual Diagrams

## Route Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         Your Application                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼────────┐   ┌─────▼────────────┐
            │ PUBLIC ROUTES  │   │ PROTECTED ROUTES │
            │ (No Auth)      │   │ (Requires Login) │
            └───────┬────────┘   └─────┬────────────┘
                    │                   │
        ┌───────────┼───────────┐       │
        │           │           │       │
    ┌───▼──┐  ┌────▼─┐  ┌─────▼──┐  ┌─▼──────────┐
    │  /   │  │Login │  │Signup  │  │ProtectedRoute
    │ Home │  │      │  │        │  │  (Wrapper)
    │      │  └──────┘  └────────┘  └─┬──────────┘
    └──────┘                          │
                        ┌─────────────┴──────────────────┐
                        │                                │
                    ┌───▼────┐  ┌─────────┐  ┌─────────┐
                    │/betting │  │ /admin  │  │/deposit │
                    │ /results│  │ /mybets │  │ /account│
                    └────────┘  └─────────┘  └─────────┘
                    (and more protected pages)
```

---

## Authentication Flow Diagram

### New User Journey

```
┌─────────┐
│  Start  │
└────┬────┘
     │
     ▼
┌──────────────┐
│ Visit /      │ (Landing page - PUBLIC)
│ See buttons: │
│ Sign Up      │
│ Login        │
└────┬─────────┘
     │
     ▼
┌──────────────┐
│  Click       │
│ "Sign Up"    │
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ Go to        │
│ /signup      │ (Sign up page - PUBLIC)
│ (PUBLIC)     │
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ Enter email  │
│ & password   │
└────┬─────────┘
     │
     ▼
┌──────────────────┐
│ Click "Sign Up"  │
│ Create account   │
└────┬─────────────┘
     │
     ▼
┌──────────────┐
│ Auto-login   │
│ Redirect to  │
│ /betting     │
└────┬─────────┘
     │
     ▼
┌──────────────────┐
│ ProtectedRoute   │
│ checks: Is user  │
│ logged in?       │
└────┬─────────────┘
     │
     ├─── YES ───▶ ┌──────────────┐
     │            │ Load betting  │
     │            │ interface     │
     │            └──────────────┘
     │
     └─── NO ───▶ (This doesn't happen)
```

---

### Returning User Journey

```
┌─────────┐
│  Start  │
└────┬────┘
     │
     ▼
┌──────────────┐
│ User tries   │
│ to visit     │
│ /deposit     │
│ (Protected)  │
└────┬─────────┘
     │
     ▼
┌─────────────────────────┐
│ ProtectedRoute Component│
│ Checks authentication   │
└────┬────────────────────┘
     │
     ├─── LOGGED IN ──────┐
     │                    │
     │               ┌────▼──────┐
     │               │ Load page  │
     │               │ /deposit   │
     │               │ Works as   │
     │               │ normal     │
     │               └───────────┘
     │
     ├─── NOT LOGGED IN ─────┐
     │                       │
     │                  ┌────▼──────────┐
     │                  │ Show loading   │
     │                  │ spinner        │
     │                  │ Redirect to    │
     │                  │ /login         │
     │                  └────┬───────────┘
     │                       │
     │                       ▼
     │                  ┌────────────┐
     │                  │ User logs  │
     │                  │ in at      │
     │                  │ /login     │
     │                  └────┬───────┘
     │                       │
     │                       ▼
     │                  ┌────────────────────┐
     │                  │ Login successful   │
     │                  │ Redirect to        │
     │                  │ /betting           │
     │                  └─────────────────────┘
```

---

### Login Process Detail

```
                    ┌──────────────┐
                    │ User at /login│
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Check: Already│
                    │ logged in?    │
                    └───┬───────┬───┘
                        │       │
                    YES │       │ NO
                        │       │
                   ┌────▼┐  ┌──▼────────┐
                   │Redirect   Show login
                   │to /betting form
                   │           │
                   └────────┬──┤
                            │
                            ▼
                   ┌──────────────────┐
                   │User enters       │
                   │credentials       │
                   │clicks "Login"    │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │Supabase validates│
                   │email & password  │
                   └────┬──────────┬───┘
                        │          │
                    VALID│          │INVALID
                        │          │
                   ┌────▼┐    ┌───▼──────────┐
                   │Create    │Show error
                   │session   │"Invalid
                   │Store     │credentials"
                   │token     │
                   │          │ (Stay on
                   │          │  /login)
                   │          │
                   └────┬─────┘
                        │
                        ▼
                   ┌──────────────────┐
                   │Redirect to       │
                   │/betting          │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │ProtectedRoute    │
                   │checks: Is user   │
                   │logged in?        │
                   └────┬─────────────┘
                        │
                       YES
                        │
                        ▼
                   ┌──────────────────┐
                   │Load betting      │
                   │interface         │
                   └──────────────────┘
```

---

## File Structure

```
src/
│
├── App.tsx (UPDATED)
│   └─ Router setup with ProtectedRoute wrapper
│   
├── components/
│   ├── ProtectedRoute.tsx (NEW ⭐)
│   │   └─ Auth wrapper component
│   └── ... (other components)
│
├── pages/
│   ├── Index.tsx (UPDATED)
│   │   └─ Landing page at /
│   │
│   ├── Login.tsx (UPDATED)
│   │   ├─ Check if already logged in
│   │   └─ Redirect to /betting on success
│   │
│   ├── Signup.tsx (UPDATED)
│   │   ├─ Check if already logged in
│   │   └─ Redirect to /betting on success
│   │
│   ├── ForgotPassword.tsx (UPDATED)
│   │   └─ Redirect to /betting if logged in
│   │
│   ├── SharedTimeframesBetting.tsx
│   │   └─ Protected by ProtectedRoute
│   │
│   ├── Admin.tsx
│   │   └─ Protected by ProtectedRoute
│   │
│   ├── Deposit.tsx
│   │   └─ Protected by ProtectedRoute
│   │
│   └── ... (other protected pages)
│
└── lib/
    └── supabaseClient.ts (uses for auth)
```

---

## State Diagram - ProtectedRoute Component

```
┌────────────────────────────────────────────┐
│     ProtectedRoute Mounted/Initial State    │
└────────┬─────────────────────────────────────┘
         │
         ├─ isAuthenticated: null
         ├─ loading: true
         └─ subscription: none
         
         │
         ▼ (useEffect runs)
         
┌────────────────────────────────────────────┐
│    Check Authentication Status              │
│    supabase.auth.getUser()                  │
└────────┬─────────────────────────────────────┘
         │
         │ (in parallel, setup subscription)
         │ supabase.auth.onAuthStateChange()
         │
    ┌────▼────────────┐
    │                 │
    ▼                 ▼
┌─────────┐    ┌──────────────┐
│User found    │No user found │
│isAuthenticated
│ = true       │isAuthenticated
└─────┬──────┘ │ = false
      │        └──┬────────────┘
      │           │
      │           ▼
      │      ┌──────────────┐
      │      │ loading: false
      │      └──┬───────────┘
      │         │
      │         ▼
      │    ┌──────────────────┐
      │    │Return:           │
      │    │<Navigate to      │
      │    │  /login />       │
      │    └──────────────────┘
      │
      ▼
    ┌──────────────┐
    │ loading: false
    └──┬───────────┘
       │
       ▼
    ┌──────────────────────┐
    │Return:               │
    │{children}            │
    │(Render protected     │
    │ component)           │
    └──────────────────────┘

    (Subscription monitors changes)
    │
    └─ If user logs out
       └─ isAuthenticated = false
          └─ Component re-renders
             └─ Navigate to /login
```

---

## Auth State Machine

```
┌──────────────────┐
│                  │
│  Unauthenticated │  ◄─────────────────────┐
│  (No session)    │                        │
│                  │                        │
└─────────┬────────┘                        │
          │                                 │
          │ (User signs up or logs in)     │
          │ supabase.auth.signUp()         │
          │ supabase.auth.signInWithPassword()
          │                                 │
          ▼                                 │
┌──────────────────┐                        │
│                  │                        │
│ Authenticated    │                        │
│ (Session valid)  │                        │
│ (Token in memory)│                        │
│                  │                        │
└─────────┬────────┘                        │
          │                                 │
          │ (User logs out or session expires)
          │ supabase.auth.signOut()         │
          │                                 │
          └─────────────────────────────────┘
```

---

## Component Hierarchy

```
<App>
├── <BrowserRouter>
│   ├── <Routes>
│   │   ├── <Route path="/" element={<Index />} />
│   │   │   └── [PUBLIC - No protection]
│   │   │
│   │   ├── <Route path="/login" element={<Login />} />
│   │   │   └── [PUBLIC - No protection]
│   │   │
│   │   ├── <Route path="/signup" element={<Signup />} />
│   │   │   └── [PUBLIC - No protection]
│   │   │
│   │   ├── <Route path="/forgot-password" element={<ForgotPassword />} />
│   │   │   └── [PUBLIC - No protection]
│   │   │
│   │   ├── <Route path="/betting" element=
│   │   │   ├── <ProtectedRoute> ⭐
│   │   │   │   ├── [Auth check]
│   │   │   │   ├── [Loading spinner]
│   │   │   │   └── <SharedTimeframesBetting />
│   │   │   └── </ProtectedRoute>
│   │   │   └── [PROTECTED]
│   │   │
│   │   ├── <Route path="/admin" element=
│   │   │   ├── <ProtectedRoute> ⭐
│   │   │   │   ├── [Auth check]
│   │   │   │   └── <Admin />
│   │   │   └── </ProtectedRoute>
│   │   │   └── [PROTECTED]
│   │   │
│   │   ├── <Route path="/deposit" element=
│   │   │   ├── <ProtectedRoute> ⭐
│   │   │   │   ├── [Auth check]
│   │   │   │   └── <Deposit />
│   │   │   └── </ProtectedRoute>
│   │   │   └── [PROTECTED]
│   │   │
│   │   └── ... (other protected routes)
│   │
│   └── </Routes>
│
└── </BrowserRouter>
```

---

## Interaction Timeline

```
Timeline: User Session

T0: User visits /
    ├─ Index component renders
    ├─ No auth check needed
    └─ Shows landing page

T1: User clicks "Sign Up"
    ├─ Navigates to /signup
    ├─ Signup component mounts
    ├─ Checks if already logged in
    │  └─ They're not, so continues
    └─ Shows signup form

T2: User enters credentials and submits
    ├─ Signup logic runs
    ├─ Calls supabase.auth.signUp()
    ├─ Account created
    ├─ Auto-login with signInWithPassword()
    ├─ Session created
    └─ Navigate("/betting") called

T3: Navigate to /betting
    ├─ ProtectedRoute component mounts
    ├─ loading = true (spinner shows)
    ├─ supabase.auth.getUser() called
    ├─ Returns user object
    ├─ isAuthenticated = true
    ├─ loading = false
    ├─ onAuthStateChange() subscription set
    └─ SharedTimeframesBetting renders

T4: User visits /deposit
    ├─ ProtectedRoute checks auth
    ├─ User is logged in (from session)
    ├─ Deposit component renders
    └─ Everything works

T5: User clicks logout
    ├─ Calls supabase.auth.signOut()
    ├─ Session deleted
    ├─ onAuthStateChange() fires
    ├─ isAuthenticated = false
    └─ Navigate("/login") called

T6: User is now logged out
    ├─ Trying to access /betting
    ├─ ProtectedRoute checks: logged in?
    ├─ supabase.auth.getUser() returns null
    ├─ isAuthenticated = false
    ├─ Redirect to /login
    └─ Login page shows
```

---

These diagrams show the complete flow of your authentication system! 🎉
