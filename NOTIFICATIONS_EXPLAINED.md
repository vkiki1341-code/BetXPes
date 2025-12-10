# ✅ NOTIFICATIONS - How They Work (Correctly Designed)

## Your Question Answered

> "now what happens with notifications even if you placed a bet yesterday and login today you will be seeing notifications for the same"

**Answer: NO ✅ - Users will NOT see old notifications**

The system is correctly designed to show **only unread notifications**. Old read notifications won't appear.

---

## How Notifications Work

### Query 1: Load Unread Notifications Only
```typescript
// File: src/components/UserNotifications.tsx, line 41
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .eq('read', false)              // ← ONLY UNREAD
  .order('created_at', { ascending: false });
```

**Result**: Only **unread** notifications loaded

### Query 2: Filter in Notification Bell
```typescript
// File: src/components/NotificationBell.tsx, line 25
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .eq('read', false)              // ← ONLY UNREAD
  .order('created_at', { ascending: false });
```

**Result**: Only **unread** notifications in the bell

---

## Timeline: User Places Bet Yesterday

```
YESTERDAY (T=0):
├─ User places bet: KES 1,000 on Home win
├─ Match ends (Home 2-1 Away)
├─ Notification created: "Bet Won! KES 2,000"
│  ├─ read: false ✓
│  ├─ created_at: yesterday 3:00 PM
│  └─ user_id: user-123
│
└─ User sees notification in top-right corner
   └─ Clicks "X" or dismisses it

YESTERDAY (T=5min after):
├─ User clicks "X" on notification
├─ Database UPDATE:
│  └─ notifications SET read=true WHERE id=notif-123
│
└─ Notification disappears from screen ✓

---

TODAY (T=24 hours later):
├─ User logs back in
├─ App loads UserNotifications component
├─ Query runs:
│  └─ SELECT * FROM notifications
│     WHERE user_id='user-123' AND read=false
│
├─ Result: EMPTY ✓ (notification was marked read yesterday)
│
└─ User sees: NO OLD NOTIFICATIONS ✓

User only sees NEW unread notifications (if any)
```

---

## Notification State Machine

```
NEW NOTIFICATION ARRIVES
        ↓
   read: false
        ↓
DISPLAYED TO USER (Top-right corner)
        ↓
User clicks "X" OR time passes
        ↓
UPDATE: read=true
        ↓
REMOVED FROM DISPLAY
        ↓
NEXT LOGIN: Not shown (read=true filters it out)
```

---

## Code Flow: Notification Lifecycle

### 1. Notification Created (Reconciliation Worker)
```javascript
// File: scripts/reconcile.js, line 100-110
await supabase.from('notifications').insert([{
  user_id: bet.user_id,
  type: 'bet_outcome',
  title: 'Bet Won',
  message: `Your bet ${bet.id} won. KES ${payout} credited.`,
  read: false              // ← NEW: unread
}]);
```

### 2. User Sees Notification (Frontend)
```typescript
// File: src/components/UserNotifications.tsx, line 40-45
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .eq('read', false)      // ← FILTER: only unread
  .order('created_at', { ascending: false });

setDisplayNotifications(data.slice(0, 3)); // Max 3 shown
```

### 3. User Dismisses Notification
```typescript
// File: src/components/UserNotifications.tsx, line 87
const handleDismiss = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })        // ← MARK AS READ
    .eq('id', notificationId);
    
  if (!error) {
    setDisplayNotifications(prev => 
      prev.filter(n => n.id !== notificationId)  // Remove from UI
    );
  }
};
```

### 4. Next Login (Tomorrow)
```typescript
// File: src/components/UserNotifications.tsx, line 40-45
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .eq('read', false)      // ← QUERY filters out read ones
  
// Result: Only NEW unread notifications (if any)
// OLD ones (read=true) are excluded
```

---

## Database Schema: The Key

```sql
-- File: CREATE_NOTIFICATIONS_TABLE.sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  read BOOLEAN DEFAULT false,     -- ← THIS IS THE KEY
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Index for fast filtering
CREATE INDEX idx_notifications_user_read 
  ON notifications(user_id, read);
```

**The `read` column is everything:**
- `read: false` = Unread (shown to user)
- `read: true` = Read/dismissed (hidden from user)

---

## What User Sees

### Scenario A: User Logs In With Unread Notifications
```
Dashboard opens
  ↓
Query: SELECT * FROM notifications 
       WHERE user_id=user-123 AND read=false
  ↓
Result: 2 unread notifications
  ↓
Display: 
  ✅ "Bet Won! KES 2,000" (from today)
  ✅ "Deposit Approved! KES 5,000" (from today)
```

### Scenario B: User Logs In With No Unread Notifications
```
Dashboard opens
  ↓
Query: SELECT * FROM notifications 
       WHERE user_id=user-123 AND read=false
  ↓
Result: EMPTY (all notifications already read)
  ↓
Display: 
  ✅ Clean dashboard, no notification bell
```

### Scenario C: User Returns After Dismissing All
```
Yesterday:
  - Notification created: "Bet Won!"
  - User dismisses it → read: true
  
Today (24 hours later):
  - User logs in
  - Query filters: read=false
  - Yesterday's notification NOT shown ✓
  - Only NEW notifications shown (if any)
```

---

## Features: Preventing Old Notification Spam

| Feature | Status | How It Works |
|---------|--------|------------|
| **Only Unread Shown** | ✅ | `.eq('read', false)` in query |
| **Mark as Read on Dismiss** | ✅ | `UPDATE read=true` on click |
| **Max 3 Displayed** | ✅ | `.slice(0, 3)` limits display |
| **Realtime Subscription** | ✅ | Removes on UPDATE `read=true` |
| **Filtered on Login** | ✅ | Always queries `read=false` |
| **Database Index** | ✅ | `idx_notifications_user_read` fast lookup |

---

## Test Scenario: Verify System Works

### Step 1: Create Notification (Yesterday)
```
User places bet → Match ends → Notification created
read: false
displayed: true
```

### Step 2: User Dismisses (Yesterday)
```
User clicks X
UPDATE: read=true
displayed: false (removed from UI)
```

### Step 3: User Logs Back In (Today)
```
Query: read=false
Result: Not shown ✓ (read=true excluded)
```

**Expected**: Old notification gone, only new ones shown

---

## Summary: Notifications are Clean ✅

✅ **Users won't see old notifications**
- Query filters: `read=false`
- Dismissed notifications marked `read=true`
- Next login: old ones excluded

✅ **Fresh experience each login**
- Only unread notifications shown
- Old dismissed ones hidden
- Clean notification bell

✅ **System prevents spam**
- Max 3 notifications displayed
- Auto-cleared on dismiss
- Index for fast queries

**Result**: No notification clutter or duplicate old messages. ✓

