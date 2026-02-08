

# Dual Gamification System Implementation Plan

## Overview

This plan transforms the existing weekly-draw Lucky 100 system into a **counter-based instant-win system** and enhances the leaderboard with a **weekly winners archive**. The implementation follows the existing AfterBefore design patterns (dark mode, glassmorphism, purple-pink gradients).

---

## Part 1: Database Schema Changes

### New Tables

| Table | Purpose |
|-------|---------|
| `lucky100_counter` | Global singleton tracking total check-ins |
| `lucky100_winners` | Records of instant-win recipients |
| `weekly_winners` | Archive of weekly leaderboard prize winners |

### Schema Details

**`lucky100_counter`**
- Single row table tracking `global_count` and `last_winner_count`
- Anyone can view (public stats), system-only updates

**`lucky100_winners`**
- Links to user, stores `check_in_number`, prize claim status
- Anyone can view winners (social proof), users claim own prizes

**`weekly_winners`**
- Archives top 3 from each week with prize details
- Anyone can view history, admins manage prizes

### Trigger Functions

1. **`check_lucky100_winner()`**: Fires on `event_checkins` INSERT
   - Increments global counter
   - If `count % 5 = 0`, creates winner record
   - Returns NEW to complete check-in

2. **`update_weekly_leaderboard()`**: Already exists, no changes needed

3. **`award_review_xp()`**: Already exists, may add profile XP update

### RLS Policies
- Public SELECT on counter, winners, leaderboard
- User-only INSERT/UPDATE on claims
- Admin UPDATE on winner status

---

## Part 2: UI Component Updates

### Updated Components

| Component | Changes |
|-----------|---------|
| `Lucky100Banner.tsx` | Show progress to next lucky number (e.g., "3 check-ins to next winner!"), last winner avatar/name, real-time counter via Supabase Realtime |
| `Lucky100Modal.tsx` | Update rules: "Every 5th check-in wins instantly!", show last 10 winners list, "No entry needed - just check-in!" |
| `LeaderboardPreview.tsx` | Add countdown timer to Sunday reset, "X XP to Top 3!" motivational text |

### New Components

| Component | Purpose |
|-----------|---------|
| `Lucky100WinModal.tsx` | Celebration modal with confetti when user wins, event choice dropdown (Drugstore/Karmakoma/Para), guestlist name input |
| `TrendingEventCard.tsx` | Featured event card with "TRENDING THIS WEEK" badge, vibe badge, rating display |
| `WeeklyWinnersButton.tsx` | Admin-only FAB to finalize weekly winners |
| `CountdownTimer.tsx` | Reusable countdown component (used for leaderboard reset) |

---

## Part 3: New Pages

### `/gamification` - Gamification Hub

```text
+------------------------------------------+
|  YOUR XP JOURNEY                         |
|  Level 5 | 2,450 XP | +550 to Level 6   |
|  [===================----] 82%           |
+------------------------------------------+
|  RECENT ACTIVITY                         |
|  - Event review: +200 XP (2h ago)       |
|  - Check-in: +50 XP (1d ago)            |
|  - Match: +100 XP (2d ago)              |
+------------------------------------------+
|  QUICK ACTIONS                           |
|  [View Leaderboard] [Lucky 100] [Reviews]|
+------------------------------------------+
```

- XP progress card with level info
- Recent XP activity feed (last 10 transactions)
- Quick action buttons
- Educational tooltips explaining XP economy

### `/lucky100` - Lucky 100 Dedicated Page

```text
+------------------------------------------+
|  LUCKY 100                               |
|  Global Check-ins: 847                   |
|  Next Winner: #850 (3 away!)            |
|  [==========================----] 94%    |
+------------------------------------------+
|  RECENT WINNERS                          |
|  - @partyking (Check-in #845) 2h ago    |
|  - @nightowl (Check-in #840) 5h ago     |
|  - @dancefloor (Check-in #835) 8h ago   |
+------------------------------------------+
|  HOW IT WORKS                            |
|  Every 5th check-in wins automatically!  |
|  No entry needed - just show up!         |
+------------------------------------------+
```

- Large counter display with progress bar
- Next lucky number indicator
- Last 10 winners with avatars
- "How it works" explanation card
- FAQ section

---

## Part 4: Hooks & Data Layer

### New Hooks

| Hook | Purpose |
|------|---------|
| `useLucky100Counter.ts` | Subscribe to global counter via Realtime, track progress to next winner |
| `useLucky100Winners.ts` | Fetch recent winners list, check if current user has unclaimed prize |
| `useXPActivity.ts` | Fetch user's recent XP transactions for activity feed |
| `useWeeklyWinners.ts` | Fetch/manage weekly leaderboard winners archive |

### Updated Hooks

| Hook | Changes |
|------|---------|
| `useLucky100.ts` | Refactor to use counter-based system instead of weekly draw |
| `useLeaderboard.ts` | Add countdown calculation, XP-to-top-3 calculation |

---

## Part 5: Backend Functions

### New Edge Function: `lucky100-counter`
- Returns current global count, next lucky number, last winner info
- Called by Lucky100Banner for real-time display

### Database Trigger Updates
- Modify `check_lucky100_winner()` to handle instant-win logic
- Add notification record when winner detected (for future push notifications)

---

## Part 6: Navigation Updates

### BottomNav Changes
- Replace "Ranks" (Trophy) with "Rewards" or keep as-is
- Optionally add Gamification icon (Sparkles)

### App.tsx Routes
```typescript
<Route path="/gamification" element={<Gamification />} />
<Route path="/lucky100" element={<Lucky100Page />} />
```

---

## Part 7: Real-time Features

### Supabase Realtime Subscriptions

1. **Lucky 100 Counter**: Subscribe to `lucky100_counter` changes
   - Update banner when count increments
   - Show celebration when user wins

2. **Leaderboard**: Subscribe to `weekly_leaderboard` changes
   - Real-time rank updates
   - Position change notifications

---

## Part 8: Win Detection Flow

```text
User Checks In
      |
      v
Trigger: check_lucky100_winner()
      |
      v
Increment global_count
      |
      v
Check: count % 5 === 0?
      |
  YES v                NO
      |                 |
Insert winner      Return NEW
      |                 |
Update last_winner     Done
      |
      v
Return NEW
      |
      v
Frontend detects win (query or realtime)
      |
      v
Show Lucky100WinModal
```

---

## Part 9: Admin Features

### Weekly Winners Management
- Admin-only button on Leaderboard page
- Copies top 3 from `weekly_leaderboard` to `weekly_winners`
- Marks prize status for each winner
- Optionally sends notification (future)

---

## Part 10: Implementation Order

| Phase | Tasks |
|-------|-------|
| 1 | Database migration: Create new tables, triggers, RLS policies |
| 2 | Backend: Update edge function for counter stats |
| 3 | Hooks: Create useLucky100Counter, useLucky100Winners, useXPActivity |
| 4 | Components: Lucky100WinModal, TrendingEventCard, CountdownTimer |
| 5 | Pages: Create Gamification, Lucky100Page |
| 6 | Integration: Update Home page, add routes, update BottomNav |
| 7 | Polish: Realtime subscriptions, animations, edge cases |

---

## Technical Details

### Migration SQL Structure

The migration will:
1. Create `lucky100_counter` table with initial row
2. Create `lucky100_winners` table
3. Create `weekly_winners` archive table
4. Add `check_lucky100_winner()` trigger function
5. Attach trigger to `event_checkins`
6. Set up RLS policies for all new tables
7. Enable Realtime for `lucky100_counter`

### XP Economy Summary

| Action | XP Reward |
|--------|-----------|
| Check-in | +50 XP |
| Match | +100 XP |
| Review (stars only) | +100 XP |
| Review (with text) | +200 XP |
| Weekly streak bonus | +200 XP |

### Files to Create

- `src/pages/Gamification.tsx`
- `src/pages/Lucky100Page.tsx`
- `src/components/Lucky100WinModal.tsx`
- `src/components/TrendingEventCard.tsx`
- `src/components/CountdownTimer.tsx`
- `src/components/WeeklyWinnersButton.tsx`
- `src/hooks/useLucky100Counter.ts`
- `src/hooks/useLucky100Winners.ts`
- `src/hooks/useXPActivity.ts`
- `supabase/functions/lucky100-counter/index.ts`

### Files to Update

- `src/pages/Home.tsx` - Add TrendingEventCard section
- `src/components/Lucky100Banner.tsx` - Counter-based display
- `src/components/Lucky100Modal.tsx` - Updated rules/winners list
- `src/components/LeaderboardPreview.tsx` - Countdown timer
- `src/hooks/useLucky100.ts` - Counter-based logic
- `src/hooks/useLeaderboard.ts` - XP gap calculation
- `src/components/BottomNav.tsx` - Optional nav update
- `src/App.tsx` - New routes

