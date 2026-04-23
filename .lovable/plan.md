
# Seed Belgrade Clubs + "I'm Going" Signal + Venue Heat Leaderboard

## Overview

Three features in one implementation:
1. Seed the database with 3 real Belgrade clubs and 6 events
2. Add an "I'm Going" signal feature (user intent, separate from GPS check-in)
3. Add a Venue Heat leaderboard (Clubs mode toggle on Leaderboard page + Home widget)

---

## Part 1: Database Migration

A single migration that creates the `event_signals` table, seeds events, and adds the `get_venue_heat` function.

### 1A. `event_signals` table
- Columns: `id`, `event_id` (FK to events), `user_id` (FK to auth.users), `signal_type` (going/interested/maybe), `created_at`
- Unique constraint on `(event_id, user_id)`
- RLS: anyone can SELECT, users can INSERT/DELETE own rows
- Trigger `signal_xp_trigger`: awards 25 XP on insert when `signal_type = 'going'`

### 1B. Seed data
- Delete existing sample events
- Insert 6 real events across 3 Belgrade venues:
  - **Drugstore** (2 events): MAGLA 2 Year Anniversary, Friday Session
  - **Karmakoma** (2 events): Idem Tour Life, Club Night
  - **Para Klub** (2 events): MAGLA Sunday Day Rave, para.normal 16 Hour Session
- Re-initialize `lucky100_counter` if empty

### 1C. `get_venue_heat()` function
- Takes `days_back` parameter (default 7)
- Returns venue rankings by total heat (signals + check-ins combined)
- Includes top event title and ID per venue for navigation

---

## Part 2: "I'm Going" Signal on EventDetail

Modify `src/pages/EventDetail.tsx`:

- Add state: `isGoing`, `signalCount`
- Add `checkSignalStatus()` and `fetchSignalCount()` in useEffect
- Add `toggleSignal()` function (insert/delete pattern, same as wishlist)
- Add a third button in the bottom CTA bar: "I'm Going" (warm orange gradient when active, outline when inactive)
- Show signal count in the info pills section: "X going" with fire emoji
- Toast on signal: "+25 XP - You're going!"
- Replace the random mock attendee count with real signal count

---

## Part 3: EventCard Signal Count

Modify `src/components/EventCard.tsx`:

- Add optional `signalCount` prop
- Display "X going" badge using the signal count instead of attendee count
- Show fire emoji when count > 0

Modify `src/pages/Home.tsx`:

- After fetching events, fetch signal counts from `event_signals` grouped by `event_id`
- Pass real `signalCount` to each EventCard
- Remove the `Math.floor(Math.random() * 80) + 10` mock data

---

## Part 4: Venue Heat Leaderboard

### New component: `src/components/VenueHeatBoard.tsx`
- Uses `supabase.rpc('get_venue_heat', { days_back: 7 })` via react-query
- Renders ranked venue cards with:
  - Medal emoji for top 3
  - Venue name (bold)
  - Heat bar (Progress component proportional to max heat)
  - "X going / Y checked in" subtitle
  - Fire emoji + total heat count
  - Top event name, clickable to navigate to EventDetail
- Prize descriptions: #1 "Featured Club of the Week", #2 "Trending", #3 "Rising"
- 30-second refetch interval
- Glassmorphism cards, #1 card gets amber/orange gradient background

### Modify `src/pages/Leaderboard.tsx`:
- Add top-level toggle: "Ravers" | "Clubs" (above the existing period tabs)
- Default to "Ravers" which shows everything as-is (no changes to existing content)
- When "Clubs" is selected, replace content below with `VenueHeatBoard`
- Header adapts: fire icon + "Club Heat" title when in Clubs mode
- Countdown timer stays visible in both modes

### Modify Home page (`src/pages/Home.tsx`):
- Add a compact `VenueHeatBoard` widget in the Home page (between LeaderboardPreview and filters)
- Shows top 3 venues as a horizontal mini-preview, clickable to navigate to Leaderboard in Clubs mode

---

## Part 5: XP Guide Update

Add the new signal XP action to the `XP_GUIDE` array in `Leaderboard.tsx`:
- "Signal 'I'm Going'", 25 XP, fire emoji

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/VenueHeatBoard.tsx` | Venue heat ranking component used in Leaderboard and Home |
| Migration SQL file | event_signals table, seed data, get_venue_heat function |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/EventDetail.tsx` | Add "I'm Going" signal button, signal count, remove mock attendees |
| `src/components/EventCard.tsx` | Add `signalCount` prop, display real going count |
| `src/pages/Home.tsx` | Fetch signal counts, pass to EventCard, add VenueHeat widget |
| `src/pages/Leaderboard.tsx` | Add Ravers/Clubs toggle, integrate VenueHeatBoard |

## Files NOT Changed

CircleSwipe, Matches, Gamification, Lucky100, Profile, Onboarding, Auth, VenueDashboard, BottomNav, existing RLS policies.
