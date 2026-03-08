

# Prompt 2/5: Event Swipe Mode

## Plan

### 1. Create `src/components/EventSwipeCard.tsx`
New swipeable event card component copying drag mechanics from `SwipeCard.tsx`:
- Same `useMotionValue` x/y, `useTransform` for rotate and stamp opacities, `handleDragEnd` with threshold 100, `dragElastic: 0.9`
- Card: `aspect-[3/4] rounded-3xl overflow-hidden`, image background with gradient overlay
- Top-left: distance badge (if available), top-right: price badge
- Bottom: title, venue + date/time, genre pills (max 3), signal count
- Swipe stamps: right = "GOING 🔥" (green), left = "SKIP" (red), up = "SHARE ⚡" (purple)

### 2. Update `src/pages/Explore.tsx`
- Add imports: `useQuery` from TanStack, `supabase`, `useAuth`, `calculateDistance`, `formatDistance`, `awardXP`, `AnimatePresence`, `EventSwipeCard`, `SwipeActions`
- Add state: `eventIndex` (number, default 0)
- Add `useQuery` (enabled when `mode === 'events'`):
  - Fetch `events` where `date >= today`
  - Fetch user's existing `swipe_actions` (target_type='event') to exclude
  - Fetch `event_signals` counts grouped by event_id
  - Calculate distances from `userPosition`, sort by distance
  - Return enriched event objects with `signalCount` and `distance`
- Add `handleEventSwipe` handler:
  - Insert into `swipe_actions` (target_type: 'event', context: 'event_stack')
  - On like/superlike: upsert `event_signals` (going), award 25 XP, show toast
  - Increment `eventIndex`
- Replace placeholder for events mode with:
  - Card stack (3 cards via `AnimatePresence`)
  - `SwipeActions` below cards
  - Empty state when all swiped

### Files Changed

| File | Change |
|------|--------|
| `src/components/EventSwipeCard.tsx` | New file |
| `src/pages/Explore.tsx` | Add event swipe logic + rendering |

No existing components modified.

