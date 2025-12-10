# ⚠️ RECONCILIATION WORKER - Setup & Troubleshooting

## What Happened (Context)
You tried to run: `npm run reconcile`
Result: Exit code 1 (error)

This is expected if you haven't set up the SQL scripts yet.

---

## Why It Failed

The worker needs:
1. ✅ Environment variables set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
2. ✅ SQL scripts executed in Supabase (`db_apply_bet_result.sql`)
3. ✅ Proper permissions in Supabase

If any of these are missing, the worker exits with error.

---

## How to Fix It (3 Steps)

### Step 1: Get Your Credentials
Go to **Supabase Dashboard → Project Settings → API**

Copy:
- Project URL → `SUPABASE_URL`
- Service Role Key (⚠️ Keep secret!) → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Run SQL Setup Scripts
Go to **SQL Editor** and run:

**Script 1: db_apply_bet_result.sql**
```sql
-- Creates bet_audit table and apply_bet_result() RPC function
-- Location: scripts/db_apply_bet_result.sql
-- Copy entire contents and paste here
```

**Script 2: db_match_triggers.sql** (optional)
```sql
-- Creates triggers for match finish notifications
-- Location: scripts/db_match_triggers.sql
```

### Step 3: Start the Worker
```powershell
# Set environment variables
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key-here"

# Run worker
npm run reconcile

# Expected output:
# ✓ Starting reconciliation pass
# ✓ Connected to Supabase
# ✓ Fetching pending bets...
# ✓ No pending bets found
# ✓ Reconciliation finished
```

---

## Common Errors & Fixes

### Error 1: "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars"

**Cause**: Environment variables not set

**Fix**:
```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIs..."
npm run reconcile
```

### Error 2: "relation 'apply_bet_result' does not exist"

**Cause**: SQL script `db_apply_bet_result.sql` not executed

**Fix**:
1. Go to Supabase SQL Editor
2. Copy `scripts/db_apply_bet_result.sql`
3. Paste and execute
4. Try `npm run reconcile` again

### Error 3: "RPC apply_bet_result failed"

**Cause**: RPC function exists but queries failing

**Fix**:
1. Check bets table has `status` column
2. Check users table has `balance` column
3. Check matches table has `raw` JSONB field
4. Verify SQL script was fully executed

### Error 4: Exit code 1 with no message

**Cause**: Uncaught exception or libuv error

**Fix**:
1. Check PowerShell console for full error message
2. Ensure all SQL setup done
3. Try running once without CONTINUOUS mode:
   ```powershell
   npm run reconcile
   # (runs once and exits)
   ```

---

## Running Worker Continuously (3 Options)

### Option 1: Simple Loop (Not Recommended)
```powershell
# Will crash randomly on Windows due to libuv
$env:CONTINUOUS = "true"
npm run reconcile
```

### Option 2: PM2 (Recommended for Windows)
```powershell
# Install PM2 globally
npm install -g pm2

# Start worker
pm2 start "npm run reconcile" `
  --name betting-worker `
  --restart-delay 5000 `
  --error "logs/err.log" `
  --out "logs/out.log"

# Save config
pm2 save
pm2 startup

# View logs
pm2 logs betting-worker

# Stop
pm2 stop betting-worker
pm2 delete betting-worker
```

### Option 3: Docker (Recommended for Production)
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV CONTINUOUS=true
ENV SUPABASE_URL=<your-url>
ENV SUPABASE_SERVICE_ROLE_KEY=<your-key>

CMD ["npm", "run", "reconcile"]
```

Run:
```bash
docker build -t betting-worker .
docker run -d betting-worker
```

---

## Verify It's Working

### Test 1: Dry Run (Once)
```powershell
$env:SUPABASE_URL = "..."
$env:SUPABASE_SERVICE_ROLE_KEY = "..."
npm run reconcile
# Should output: "Reconciliation finished"
```

### Test 2: Check Logs
1. Create test bet with pending status
2. Run worker
3. Check console for: "Resolved bet via RPC"

### Test 3: Verify Balance Updated
1. Place test bet (KES 1,000)
2. Manually update match in Supabase (set scores, status='ft')
3. Run worker: `npm run reconcile`
4. Check user balance in Supabase
   - If won: balance should increase
   - If lost: balance unchanged

---

## What Worker Does (Recap)

Every 30 seconds (if running continuously):

1. ✅ Queries `bets` table for `status='pending'`
2. ✅ Joins with `matches.raw` to get scores
3. ✅ Calls `resolveBetOutcome()` to determine result
4. ✅ Calls RPC `apply_bet_result()` for atomic update:
   - Updates `bets.status` → 'won'/'lost'/'void'
   - Updates `users.balance` → +winnings (if won)
   - Inserts `bet_audit` entry
   - Sends notification
5. ✅ Inserts `notifications` for user

**Result**: User balance updated, bet marked resolved, notification sent

---

## Next Steps

1. ✅ Collect credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
2. ✅ Run SQL setup scripts in Supabase
3. ✅ Test: `npm run reconcile`
4. ✅ Setup PM2 or Docker for continuous running
5. ✅ Monitor logs for errors

Once working, system is **100% complete**. ✓

