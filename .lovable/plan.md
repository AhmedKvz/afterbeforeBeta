

# Dual Auth Flow: Party Goer + Club/Venue

## Overview

Add a role selection step to the Auth page so users choose between "Party Goer" and "Club / Venue" before signing up. Each type gets a tailored onboarding flow and landing experience.

---

## Part 1: Database Migration

A single migration that:

1. Adds venue columns to `profiles`:
   - `account_type TEXT DEFAULT 'party_goer'` with CHECK constraint
   - `venue_name`, `venue_address`, `venue_description`, `venue_logo_url` (TEXT)
   - `venue_capacity` (INTEGER)
   - `venue_music_genres` (TEXT[])
   - `venue_instagram`, `venue_contact_phone` (TEXT)

2. Updates `handle_new_user()` trigger to read `account_type` from `raw_user_meta_data`:
   ```sql
   COALESCE(NEW.raw_user_meta_data->>'account_type', 'party_goer')
   ```

---

## Part 2: AuthContext Changes

- Add all new venue fields to the `Profile` interface
- Update `signUp` to accept an optional `accountType` parameter and pass it as `data: { account_type: accountType }` in `supabase.auth.signUp` options

---

## Part 3: Auth Page (Two-Step Flow)

### Step 0 - Role Selection (new)
- Logo and tagline stay at top
- Two glassmorphism cards below:
  - "Party Goer" (icon: music note) - "Find events, match with people, earn rewards"
  - "Club / Venue" (icon: building) - "Post events, grow your audience, track engagement"
- Selected card gets glowing purple/pink border + checkmark
- "Continue" button appears when a type is selected
- Cards stack vertically on mobile, side-by-side on wider screens

### Step 1 - Email/Password (existing)
- After role selection, slides in via AnimatePresence
- On sign up, passes `accountType` to `signUp(email, password, accountType)`
- Sign in flow skips Step 0 (goes straight to email/password)

---

## Part 4: Onboarding Branching

The existing `Onboarding.tsx` will branch based on `profile.account_type`:

### Party Goer path (unchanged)
Steps 1-3: Name/Age/City, Music Genres, Photo

### Club/Venue path (new)
- **Step 1 - Venue Info**: Venue name (required), address (required), city dropdown (existing CITIES), capacity (number)
- **Step 2 - Venue Vibe**: Music genres (1-5, existing chip selector), description/bio (textarea, 200 char max)
- **Step 3 - Venue Branding**: Logo upload (existing Camera pattern), Instagram handle (@ prefix), contact phone (optional)

On finish, updates profile with all venue fields + `onboarding_completed: true`, awards 100 XP.

---

## Part 5: Venue Dashboard Page

New `src/pages/VenueDashboard.tsx`:

- Header: venue logo + venue name + "Dashboard"
- **"Your Events"** section: Lists events where `host_id` matches current user, plus a "Create Event" button (shows "Coming soon" toast)
- **"Quick Stats"** section: Cards for total events, total check-ins, total reviews (placeholder 0 values)
- Uses a venue-specific BottomNav variant: Dashboard, My Events, Analytics (Coming Soon), Profile

---

## Part 6: Home Page Routing

Update `Home.tsx` to check `profile.account_type`:
- `party_goer` -> render existing Home page (no changes)
- `club_venue` -> redirect to `/venue-dashboard`

---

## Part 7: App.tsx Route Addition

Add: `<Route path="/venue-dashboard" element={<VenueDashboard />} />`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/VenueDashboard.tsx` | Venue owner dashboard with events list and stats |

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add venue columns + update trigger |
| `src/contexts/AuthContext.tsx` | Add venue fields to Profile interface, update signUp signature |
| `src/pages/Auth.tsx` | Add Step 0 role selection with AnimatePresence |
| `src/pages/Onboarding.tsx` | Add club_venue branch with 3 venue-specific steps |
| `src/pages/Home.tsx` | Redirect club_venue users to /venue-dashboard |
| `src/App.tsx` | Add /venue-dashboard route |

## Files NOT Changed

CircleSwipe, Matches, Gamification, Leaderboard, Lucky100, Profile, existing BottomNav for party_goer users, existing RLS policies.

