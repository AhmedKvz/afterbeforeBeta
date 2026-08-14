# AfterBefore — Nightlife OS

**Born in Belgrade. Built for every city.**

AfterBefore connects events, people and the local scene into one living system —
before, during and after the night out. Presence is the core primitive: every
review, reward and connection is anchored to a **GPS-verified arrival**, not a click.

- **Landing:** https://ahmedkvz.github.io/afterbeforeBeta/
- **Beta app (web/PWA):** https://ahmedkvz.github.io/afterbeforeBeta/app/

> Status: **private beta** — the product is live and fully functional, public
> launch is planned together with the first partner event.

## What the app does

| Loop step | Feature |
|---|---|
| Discover | Live city view — events list, real-time map, "who's going" signals |
| Announce | **"Idem"** (I'm going) — intent signal that feeds the city's energy map |
| Arrive | **"Tu sam"** (I'm here) — geofenced GPS check-in; auto check-in fulfils a prior "Idem" |
| Connect | Open crews of up to 6 (pre-party / night out / after) + 1-on-1 meeting scoped to the same scene |
| Contribute | Reviews and vibe tags **only from verified visitors**; weekly missions with partner rewards |
| Remember | **Night Passport** — every night writes itself: route, times, crew, earned stamps |
| Share | Post-night card ("I danced this much") exported as an image |

For venues, cafés and galleries: aggregate demand signals (planned vs. actually
arrived), feedback from verified visitors only, and mission/promotion tools —
never personal data, names or movement of guests.

An artist layer (**SCENA**) gives DJs, tattoo artists and photographers a
profile with an auto-generated timetable, portfolio gallery and follower graph.

## Principles

- **Honest numbers** — nothing is displayed that wasn't measured; demo data is always labeled.
- **Location = arrival confirmation only.** Read once, on check-in. No background tracking, ever.
- **Data minimization** — venues get aggregates; individual movement is never sold or shared.
- **Consent-first visibility** with block/report available in every conversation.

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite · Tailwind/shadcn base with a custom
  design-token system (`src/index.css`) · TanStack Query with persisted cache · PWA (offline shell)
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage). All writes go through
  `SECURITY DEFINER` RPCs with row-level security in deny-all default posture;
  errors are machine-parsable tokens (`TOO_FAR`, `LEVEL_REQUIRED`, …)
- **Analytics:** first-party event funnel (40+ events) into Postgres — no third-party trackers
- **Hosting:** GitHub Pages; CI builds the app on every push to `main`
  (`.github/workflows/deploy-beta.yml`)

## Development

```sh
npm install
npm run dev        # local dev server
npm run build      # production build (enforces the GPS geofence)
npx tsc --noEmit -p tsconfig.app.json   # typecheck
```

Database schema lives in [`supabase/migrations/`](supabase/migrations/) —
every table, policy and RPC is versioned there.

## Roadmap (post-validation)

Native apps (Capacitor) with pedometer-verified "dance steps", ML-driven
recommendations and crowd prediction, venue pilot program, and a scene
marketplace (curated nights, bookings, helpers) gated by earned reputation.

---

© AfterBefore · Beograd — od ravera, za ravere.
