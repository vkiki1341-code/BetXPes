# Referral System - Quick Setup

## What Was Added

### 1. Complete Referral System
- **Account Page** - Referral tab with code, copy button, and earnings display
- **Referral Page** - Full dashboard with stats, history, and sharing options
- **Signup Page** - Automatic referral code tracking from URL parameter

### 2. Database Tables (SQL)
Three new tables in Supabase:
1. `referrals` - Stores user's referral code and statistics
2. `referral_list` - Tracks individual referrals
3. Added columns to `users` table for referral tracking

### 3. Key Features
✅ Auto-generated unique referral codes per user  
✅ Share via Web Share API or copy to clipboard  
✅ Real-time earnings tracking (KES 500 per referral)  
✅ Beautiful UI with stats cards and history  
✅ Automatic sign-up with referral code: `?ref=CODE`  
✅ Row-level security enabled  

## Quick Start

### Step 1: Database Setup (IMPORTANT!)
1. Go to Supabase Dashboard
2. Click "SQL Editor"
3. Create new query
4. Copy & paste entire contents of `REFERRAL_SETUP.sql` file
5. Click "Run"
6. Wait for success message

### Step 2: Test It
1. Open `http://localhost:8080/account`
2. Click "Referral" tab
3. You'll see your auto-generated referral code
4. Click "Share Referral Link"
5. Copy the link: `http://localhost:8080/signup?ref=YOUR_CODE`
6. In new incognito window: paste the link
7. Sign up with new email
8. Login back as original user → Account → Referral
9. You should see +1 friend referred, +500 KES earnings!

### Step 3: View Full Referral Page
1. Click "View Full Referral Details" button on Account page
2. Or navigate to `http://localhost:8080/referral`
3. See all your referrals, earnings, and sharing options

## Files Changed

1. **Account.tsx**
   - Added referral data state
   - Enhanced useEffect to fetch referral info from database
   - Upgraded Referral tab with real data
   - Added copy to clipboard functionality

2. **Referral.tsx**
   - Completely redesigned with professional UI
   - Added referral stats cards
   - Added referral history list
   - Added "How it Works" section
   - Added Web Share API integration

3. **Signup.tsx**
   - Added URL parameter detection (`?ref=CODE`)
   - Added automatic referral tracking
   - Added bonus notification banner
   - Auto-updates referrer earnings on sign-up

## Database Files Created

1. **REFERRAL_SETUP.sql**
   - SQL script to create all tables
   - Enables row-level security
   - Creates indexes for performance
   - Run this in Supabase SQL Editor!

2. **REFERRAL_GUIDE.md**
   - Complete technical documentation
   - API integration examples
   - Testing procedures
   - Customization options

## Important Notes

⚠️ **Must Run SQL Script First!**
The referral system won't work until you:
1. Copy `REFERRAL_SETUP.sql`
2. Paste it in Supabase SQL Editor
3. Click "Run"

## Earnings Flow

1. User A gets referral code: `JOH5K8`
2. User A shares link: `https://localhost:8080/signup?ref=JOH5K8`
3. User B signs up using that link
4. Automatic updates in database:
   - Referral_list: Creates new record
   - Referrals: Updates User A's count (+1) and earnings (+500 KES)
5. User A can withdraw earnings from Account → Deposit/Withdraw

## Bonus Settings

Current: KES 500 per referral  
Can be customized in:
- `Referral.tsx` line ~22: `const REFERRAL_BONUS = 500;`
- Database tables (if needed)

## Common Issues

**Issue**: "No referrals data" in Account page
**Fix**: Did you run the SQL script? Check Supabase → Tables

**Issue**: Referral code not being tracked on sign-up
**Fix**: Make sure URL has `?ref=CODE` parameter

**Issue**: Copy button not working
**Fix**: Browser might not support clipboard API in HTTP (works in HTTPS)

**Issue**: "View Full Referral Details" shows empty page
**Fix**: Check Supabase RLS policies - should allow reading referral_list

## Next Steps

1. ✅ Run REFERRAL_SETUP.sql
2. ✅ Test sign-up with referral link
3. ✅ Verify earnings update
4. ✅ Customize bonus amount if needed
5. ⭕ Add withdrawal feature to access earnings (optional)
6. ⭕ Set up email notifications (optional)
7. ⭕ Create referral leaderboard (optional)

## Files Included

```
REFERRAL_SETUP.sql       ← Run this first!
REFERRAL_GUIDE.md        ← Full documentation
QUICK_START.md           ← This file
src/pages/Account.tsx    ← Updated (referral tab)
src/pages/Referral.tsx   ← Updated (full page)
src/pages/Signup.tsx     ← Updated (referral tracking)
```

Good to go! 🚀
