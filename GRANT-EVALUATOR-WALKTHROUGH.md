# AfterBefore — Evaluator Walkthrough (EN)

> A 10-minute guided tour of the working beta, prepared for Innovation Fund
> (Smart Start) evaluators. No installation needed — it runs in any browser,
> best experienced on a phone.

## Access

- **App:** https://ahmedkvz.github.io/afterbeforeBeta/app/
- **Landing page:** https://ahmedkvz.github.io/afterbeforeBeta/ (SR; EN version linked in the header)
- **Demo account:** `evaluator@afterbefore.rs` · password: `Evaluator2026!`
  (a regular user account with onboarding pre-completed, so you land straight
  in the product)

*Note: the interface is in Serbian — the product is built scene-first for
Belgrade. This document translates every step. The beta build has the GPS
check-in gate opened so you can try check-in from anywhere; production
enforces physical presence at the venue.*

## What you are looking at

AfterBefore is an operating system for Belgrade nightlife: a live layer of
**presence** (who is where tonight), **play** (what happens when you're there)
and **contribution** (the scene builds the scene). Not an event listing, not a
dating app. Three constitutional rules shape everything you'll see: presence
is verified by location, the scene owns the value it creates, and safety is a
gate — not a feature.

## The tour (follow in order)

### 1 · Home — tonight in the city (~2 min)
You land on the feed. Notice:
- **"Za tebe" / "Sve"** tabs (For you / All) — the "For you" ranking uses the
  account's stated music taste; "Sve" is the full catalog with date and genre
  filters.
- Event cards show **real announcement counts** ("N IDE" = N going) — the app
  never invents numbers. If a venue has zero activity, it shows zero.
- Tap any event card → the full venue sheet opens (next step).

### 2 · Venue sheet + check-in — the core loop (~3 min)
Tap a venue (e.g. **Drugstore** in the "OTKRIJ MESTA" / Discover row):
- Cover photo, Instagram link, **🧭 KAKO DA STIGNEM** (directions via Google
  Maps), set times, upcoming events, reviews.
- **KO JE TU** (who's here) and **Nađi ekipu** (find a crew) — social layer,
  gated by presence.
- Press **Check-in** — the "money path": it awards **REP** (reputation) and
  **AFC** (contribution points) through a server-side secure RPC, advances
  quests, and feeds the live map. You'll see the reward float on screen.
- Everything below the fold is real data; venues can self-manage this page
  (44 Belgrade venues are loaded: clubs, river barges, bars, jazz venues).

### 3 · Zavrti noć — the game layer (~2 min)
On the venue sheet find **🎲 Zavrti noć** (Spin the night):
- **TOČAK** (wheel): one bold, consent-aware mission for tonight ("Be first on
  the dance floor", "Introduce two strangers"). Completing it advances quests.
- **🔐 ŠIFRA**: opt-in pairing — the algorithm matches two people at the same
  venue tonight by music taste; each gets **half of a secret passphrase**;
  names are revealed only after both confirm meeting in person. (We deliberately
  call it "algoritam", not "AI" — honest naming is a house rule.)
- **🔐🔐 EKIPE**: crew-vs-crew variant — passphrase words are distributed
  across crew members.

### 4 · Quests — contribution economy (~2 min)
Navigate with the **orb** (the glowing circle at the bottom — tap it, the
radial menu opens) → **Quests**:
- Weekly quests, streaks, and **partner quests** (real venues offering real
  rewards: "Koktel na račun kuće" = cocktail on the house).
- The header shows the economy loop: **DOPRINOS → AFC → NAGRADE OD PARTNERA**
  (contribution → points → partner rewards). Payouts can never exceed fund
  revenue — the model cannot print rewards.

### 5 · Heat map + Matches (~1 min)
From the orb: **Heat** (live city map — venue pins, filters by type including
festivals, presence counts) and **Matches** (sparks → chat; report tooling is
one tap away in every conversation — safety as a gate).

## What's under the hood (for the technical evaluator)

- React 18 + TypeScript PWA; Supabase (Postgres) backend. All writes go
  through `SECURITY DEFINER` RPCs; tables are deny-all RLS — the client
  cannot touch data directly.
- Analytics instrumented from day one; an internal dashboard tracks the
  north-star metric: **weekend W1→W2 retention** per cohort.
- The grant-funded MVP moves this exact codebase to native iOS/Android via
  Capacitor (no rewrite) and replaces the rule-based "algoritam" with real ML.

## Honest status

This is a **pre-traction beta**: the accounts you'll meet are test data. The
first real retention cohort is scheduled for the **B1 Founding Night pilot
(18 Aug 2026)** at a partner club, with a curated group of scene regulars.
The product is built; the pilot produces the market evidence.

---

*Contact: kavazovic.ahmed@gmail.com · Repo docs: ECONOMY.md (economic engine),
SMART-START-READINESS.md (grant readiness), AFTERBEFORE canon docs.*
