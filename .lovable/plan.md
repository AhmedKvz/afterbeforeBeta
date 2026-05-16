
# Unification Pass — AfterBefore Nightlife OS

Goal: make the whole app feel like one polished product. Visual & UX polish only. No new business logic, no schema changes. One shared profile template for venues & events. XP / Lucky 100 / Quests surfaced prominently inside event and venue pages.

## 1. Shared design language

A single visual vocabulary applied everywhere.

- **Hero header component** (`AppHeader`): sticky, blurred, gradient underline, neon title, optional back button, optional right-side action. Used on Home, Explore, Event, Venue, Gamification, Quests, Leaderboard, Scene.
- **Section heading component** (`SectionHeading`): all-caps tracking-wider muted label + optional accent icon — replaces the inconsistent h2/h3 styles across pages.
- **Card system**: standardize on `glass-card` (already in index.css). Audit `Card`, `GlassCard`, raw `bg-white/5` usages and align to one card token with consistent radius (`rounded-2xl`), border (`border-white/10`), padding scale, and hover glow.
- **Badge system**: one `<VenueTypeBadge>` (purple club / blue splav / amber cafe / pink gallery / yellow popup) reused on EventCard, VenueDetail hero, Pulse list, Reviews header — replaces the duplicated maps in `EventCard.tsx` and `reviewTags.ts`.
- **Motion**: shared `fade-up` and `stagger` framer-motion presets in `src/lib/motion.ts` so cards, lists, and modals animate identically.

## 2. Unified Venue/Event profile template

Today `/event/:id` and `/venue/:venueName` are two different layouts. Merge into **one shared `VenueProfileTemplate`** component that both routes render.

```text
┌─ Hero (image + gradient + back + venue-type badge + title + meta)
├─ Quick actions row (I'm Going · Check-in · Save · Share)        ← only on event route
├─ XP Reward Card  (Earn +50 XP for check-in, +30 for review)     ← see §3
├─ Vibe / Heat strip (HeatBadge + Vibe signals count + avatars)
├─ AI Predictions (only if event route, AreaChart)
├─ About / Description
├─ Recent events strip                                            ← only on venue route
├─ Reviews section (existing VenueReviewsSection — anchor #reviews)
└─ Safety / Scene Health implicit indicators
```

- Extract the EventDetail body into `<VenueProfileTemplate mode="event" | "venue" />`.
- Both routes share hero, reviews anchor, and gamification card → consistent feel.
- Keep existing data fetching in the route file; pass props in.

## 3. Prominent inline gamification

A reusable `<XPRewardCard>` shown high on every event & venue page:

- Lists exactly what the user can earn here right now: `+50 XP Check-in`, `+30 XP Write review`, `+15 XP Vibe signal`, `Lucky 100 progress (X/5)`.
- Pulls live data from existing hooks (`useLucky100Counter`, `useQuests`).
- Tappable rows scroll to the matching section (`#reviews`, check-in button, vibe signals).
- Confetti micro-animation on completed rows.

Plus subtle XP chips on the action buttons themselves (`Check-in +50 XP`, `Write review +30 XP`).

## 4. Cross-page consistency fixes

- **Home**: replace ad-hoc filter chips with the same chip style used in Explore neighborhoods. Wrap `Lucky100Banner`, `BestPartyCard`, `LeaderboardPreview`, `VenueHeatBoard` in `SectionHeading` + consistent spacing.
- **EventCard**: align the "View Reviews" footer with the new chip style; venue badge uses the shared `<VenueTypeBadge>`.
- **Explore**: header / mode selector restyled to match `AppHeader` and gamification card patterns.
- **Gamification / Quests / Leaderboard / Scene**: same `AppHeader`, same `SectionHeading`, same card padding. No data changes.
- **BottomNav**: audit active-state color so it matches the new primary gradient.

## 5. What is NOT in scope

- No schema changes, no new tables, no new edge functions.
- No new features (no new gamification rules, no new review mechanics).
- No routing changes beyond the shared template — `/event/:id` and `/venue/:venueName` stay.
- No copy rewrite beyond labels needed for the new XP card.

## Technical notes

New files:
- `src/components/layout/AppHeader.tsx`
- `src/components/layout/SectionHeading.tsx`
- `src/components/VenueTypeBadge.tsx`
- `src/components/profile/VenueProfileTemplate.tsx`
- `src/components/gamification/XPRewardCard.tsx`
- `src/lib/motion.ts`

Edited files:
- `src/pages/EventDetail.tsx` — render `VenueProfileTemplate` body
- `src/pages/VenueDetail.tsx` — render `VenueProfileTemplate` body
- `src/pages/Home.tsx`, `src/pages/Explore.tsx`, `src/pages/Gamification.tsx`, `src/pages/Quests.tsx`, `src/pages/Leaderboard.tsx`, `src/pages/ScenePanel.tsx` — adopt `AppHeader` + `SectionHeading`
- `src/components/EventCard.tsx` — use `<VenueTypeBadge>`, polish footer
- `src/index.css` / `tailwind.config.ts` — add any missing semantic tokens (no color changes — current palette stays)

## Verification

After implementation: visit Home → Explore → tap a venue → tap an event from it → write a review. The hero, badges, sections, motion, and XP card all look identical across surfaces. No console errors. Reviews still scroll to anchor.
