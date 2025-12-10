# BetXPesa Referral Program - Complete Setup Guide

## Overview
A complete, real referral system that allows users to earn KES 500 for each friend who signs up using their referral code.

## Features
✅ Unique referral codes per user (auto-generated on first account access)  
✅ Referral tracking and earnings calculation  
✅ Share referral link via Web Share API or clipboard  
✅ Referral statistics (friends referred, total earnings)  
✅ Referral history with dates and status  
✅ Automatic bonus credit on sign-up with referral code  
✅ Complete referral page with analytics  

## Database Setup

### Step 1: Create Supabase Tables
Run the SQL in `REFERRAL_SETUP.sql` in your Supabase SQL Editor:

1. Go to Supabase Dashboard → Your Project → SQL Editor
2. Create a new query
3. Copy and paste the contents of `REFERRAL_SETUP.sql`
4. Click "Run"

This creates three main components:

#### `referrals` Table
Stores each user's referral code and statistics:
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- referral_code: VARCHAR (Unique, auto-generated)
- referred_count: INTEGER (Number of successful referrals)
- referral_earnings: INTEGER (Total earnings in KES)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `referral_list` Table
Tracks individual referrals:
```sql
- id: UUID (Primary Key)
- referrer_id: UUID (The person who referred)
- referred_user_id: UUID (The referred person)
- referred_user_email: VARCHAR
- bonus_earned: INTEGER (Amount earned per referral - 500 KES)
- status: VARCHAR (active, inactive, revoked)
- referred_at: TIMESTAMP
```

#### `users` Table Additions
Added two new columns to track referrals:
```sql
- referral_used_code: VARCHAR (Code the user signed up with)
- referred_by_user_id: UUID (ID of the person who referred them)
```

### Step 2: Enable Row Level Security (RLS)
The SQL script automatically enables RLS:
- Users can only view their own referral data
- Proper indexes are created for performance

## How It Works

### 1. User Signup
When a user signs up:
- If they have a referral code in the URL (`?ref=CODE`), it's validated
- The code is linked to their account
- The referrer's earnings and referral count are updated (+500 KES)
- Both users receive bonuses

**Example signup URL:**
```
https://betxpesa.app/signup?ref=JOH5K8
```

### 2. Referral Code Generation
Each user gets a unique code generated automatically:
- First 3 characters: From their email (uppercase)
- Last 6 characters: Random alphanumeric
- Example: `JOH5K8` (from john@example.com)

### 3. Sharing
Users can share via:
- **Copy Link**: Copies the full URL with their code
- **Share Button**: Uses native Web Share API (mobile) or clipboard
- **Account Tab**: Quick link preview in the referral section

### 4. Earnings Tracking
- Each successful referral = 500 KES
- Real-time updates visible in:
  - Account page (Referral tab)
  - Dedicated Referral page
  - Balance cards showing total earnings

## Component Updates

### 1. Account.tsx
**Referral Tab Features:**
- Referral code display (large, easy to copy)
- Copy and share buttons
- Stats cards showing:
  - Friends referred count
  - Total referral earnings
- Link to full referral page

**New Functions:**
```typescript
generateReferralCode(input: string) // Auto-generates unique codes
copyReferralLink() // Copy link to clipboard
```

### 2. Referral.tsx (Full Page)
**Comprehensive referral dashboard:**
- Large code display
- Copy/Share functionality
- 3-card stats section (referred count, earnings, bonus amount)
- "How it works" section (3-step guide)
- Referrals list showing:
  - Friend's email
  - Date referred
  - Bonus earned
  - Status (active/inactive/revoked)

### 3. Signup.tsx
**Referral integration:**
- URL parameter detection (`?ref=CODE`)
- Bonus notification banner
- Automatic referral tracking on sign-up
- Referrer earnings update

## API Integration Points

### Create Referral on First Login
```typescript
// In Account.tsx useEffect
const { data: referralData } = await supabase
  .from("referrals")
  .insert([{ 
    user_id: userId, 
    referral_code: newCode, 
    referred_count: 0, 
    referral_earnings: 0 
  }])
```

### Track Referral on Sign-up
```typescript
// In Signup.tsx handleSignup
await supabase.from("referral_list").insert([{
  referrer_id: referrerData.user_id,
  referred_user_id: data.user.id,
  referred_user_email: email,
  bonus_earned: 500,
  status: "active"
}])

// Update referrer earnings
await supabase
  .from("referrals")
  .update({
    referred_count: supabase.raw("referred_count + 1"),
    referral_earnings: supabase.raw("referral_earnings + 500")
  })
  .eq("user_id", referrerData.user_id)
```

### Fetch Referral Data
```typescript
// Get user's referrals
const { data } = await supabase
  .from("referral_list")
  .select("*")
  .eq("referrer_id", userId)
  .order("referred_at", { ascending: false })
```

## Bonus Distribution

### Option 1: Automatic On Sign-up (Current Implementation)
- Bonus is credited immediately when friend uses referral code
- Both referrer and referred get bonuses

### Option 2: After First Bet (Optional Enhancement)
```typescript
// Check if referred user has placed a bet
const { data: bets } = await supabase
  .from("bets")
  .select("id")
  .eq("user_id", referredUserId)
  .limit(1)

if (bets?.length > 0) {
  // Credit bonus
}
```

## Testing the Referral System

### Step 1: Create Test Accounts
1. Sign up with user1@test.com
2. Copy their referral code from Account → Referral tab
3. Open new browser/incognito: `localhost:8080/signup?ref=USR12AB`
4. Sign up with user2@test.com

### Step 2: Verify Earnings
1. Login as user1
2. Check Account → Referral tab
3. Should see +1 friend referred, +500 KES earnings
4. Check Referral page for full history

### Step 3: Check Database
In Supabase SQL Editor:
```sql
-- View all referrals
SELECT * FROM referrals;

-- View referral_list
SELECT * FROM referral_list;

-- Check user's referral info
SELECT * FROM referrals WHERE referral_code = 'USR12AB';
```

## Customization Options

### Change Bonus Amount
Edit `REFERRAL_SETUP.sql` and `Referral.tsx`:
```typescript
const REFERRAL_BONUS = 1000; // Change from 500 to 1000 KES
```

### Add Referral Tiers
```sql
-- Tier 1: 500 KES for first 5 referrals
-- Tier 2: 750 KES for referrals 6-15
-- Tier 3: 1000 KES for 16+ referrals
```

### Limit Referrals Per User
Add to `referral_list` insert:
```typescript
.eq("referrer_id", referrerData.user_id)
.count('exact')

if (count >= 100) {
  // Limit reached
}
```

### Monthly Reset
Add to referrals table:
```sql
ALTER TABLE referrals ADD COLUMN referrals_this_month INTEGER DEFAULT 0;
ALTER TABLE referrals ADD COLUMN last_reset_date TIMESTAMP;
```

## Security Considerations

✅ RLS enabled - users can only access their own data  
✅ Duplicate referrals prevented with UNIQUE constraint  
✅ Email validation on sign-up  
✅ Code expiration (optional): Add `expires_at` column  
✅ Prevent self-referrals: Add check in Signup.tsx  
✅ Rate limiting: Consider implementing on backend  

## Frontend Files Updated

1. **Account.tsx** - Referral tab with code and stats
2. **Referral.tsx** - Full referral page with history
3. **Signup.tsx** - Referral code tracking on sign-up

## Deployment Checklist

- [ ] Run `REFERRAL_SETUP.sql` in Supabase
- [ ] Test referral sign-up with URL parameter
- [ ] Verify earnings update in database
- [ ] Test share functionality on mobile and desktop
- [ ] Verify RLS policies in Supabase
- [ ] Test referral page navigation
- [ ] Verify copy-to-clipboard works
- [ ] Check Web Share API fallback
- [ ] Test with multiple user accounts
- [ ] Verify no console errors

## Future Enhancements

1. **Referral Tiers** - Increase bonus after X referrals
2. **Leaderboard** - Top referrers board
3. **Email Notifications** - Notify referrer when friend signs up
4. **Referral Analytics** - Conversion rates, ROI tracking
5. **Promo Codes** - Combine with referrals
6. **Withdrawal of Referral Earnings** - With withdrawal page integration
7. **Expiring Codes** - Auto-invalidate after 30 days
8. **Fraud Detection** - Prevent fake referral abuse

## Support

For issues or questions:
1. Check Supabase logs for errors
2. Verify SQL schema matches REFERRAL_SETUP.sql
3. Check browser console for JS errors
4. Verify RLS policies are enabled
5. Test with Supabase SQL Editor directly
