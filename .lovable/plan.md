

# Prompt 1/5: Database + Explore Page Shell

## 1. Database Migration

Add via migration tool:
- **`swipe_actions`** table with RLS (user can SELECT/INSERT own rows), indexed on `user_id`
- **`club_favorites`** table with RLS (user can SELECT/INSERT/DELETE own rows), unique on `(user_id, venue_name)`
- **`ALTER events`** to add `geofence_radius INTEGER DEFAULT 100`

## 2. Update BottomNav

Replace Scene tab with Explore tab in `src/components/BottomNav.tsx`:
```
{ path: '/explore', icon: Compass, label: 'Explore' }
```
Reorder: Home, Explore, Matches, Rewards, Profile.

## 3. Create `src/pages/Explore.tsx`

- State: `mode` (`'people' | 'events' | 'clubs' | 'map'`, default `'events'`), `userPosition` (fetched on mount via `getCurrentPosition()`)
- Header with back button, gradient "Explore" title, ghost mode toggle, dynamic subtitle
- 4-column mode selector grid with icons and active/inactive styling
- Placeholder content per mode
- BottomNav at bottom, `pb-24`

## 4. Add Route in `App.tsx`

```tsx
import Explore from "./pages/Explore";
<Route path="/explore" element={<Explore />} />
```

## 5. Remove Swipe Nearby FAB from `Home.tsx`

Delete the `showFAB` conditional block (lines 298-308) and the `showFAB` variable. Remove unused `MapPin` import if no longer needed.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | New `swipe_actions`, `club_favorites` tables; add `geofence_radius` to events |
| `src/components/BottomNav.tsx` | Replace Scene with Explore in navItems |
| `src/pages/Explore.tsx` | New file - 4-mode explore shell |
| `src/App.tsx` | Add `/explore` route |
| `src/pages/Home.tsx` | Remove FAB button and `showFAB` variable |

