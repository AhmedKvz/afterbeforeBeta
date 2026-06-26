# Dance Floor — System Design & Commercialization Strategy

> Living strategy doc for the accelerometer "Dance Floor" feature.
> Status: Phase 1 shipped (live Dance Mode + nightly MVP leaderboard).
> Owner: product / lead dev.

---

## 0. Thesis — what the asset actually is

The whole "Nightlife OS" currently **simulates** energy: `ENERGY 91`, the Crowd-DNA radar, heat numbers — all representative/mock. The dance meter + GPS check-in produce the **one real-time ground-truth signal nobody else in nightlife has**:

> **Verified physical effort, at a precise place, at a precise time.**

That single signal is simultaneously:
- **Anti-fraud proof of presence** — you can't fake *being there AND moving*.
- The **truest possible "heat" metric** (beats check-in counts or vote signals).
- A **personal fitness/fun stat** ("you danced 3.2 km tonight").
- A **competitive primitive** (leaderboards at every scale).
- A **B2B dataset** venues and brands will pay for.

It's **"Strava for nightlife."** RA / Dice have nothing like it. This is the moat.

**System-design insight:** Dance data isn't a bolt-on feature — it's the **missing sensor layer** of the OS. It closes the loop and turns every mocked number into a real one. Treat it as infrastructure, not a mini-game.

---

## 1. Natural blend — integration map (per screen)

| Screen | Integration | Why it's natural |
|---|---|---|
| **Heat** | Live aggregate of everyone's dance intensity on the floor → the **real `ENERGY` number** + map-blob size. "Hottest floor in Belgrade right now." | The map literally pulses with real data — closes the loop |
| **Home** | "Last night you danced 3.2 km · #4 in the city" recap card; trending / best-party ranked partly by *realized* energy, not just votes | Spotify-Wrapped moment, retention hook |
| **Quests** | Dance quests (`Dance 500 at 2 clubs`, `hold 80% intensity for 10 min`, `Dance Floor MVP`), dance-streak, seasonal | Reuses the existing XP/AFC engine — just a new type |
| **Profile** | Total dance km / calories, MVP count, **Dance archetype** (Cardio Raver / Marathoner / Sprinter), Dance-DNA radar (genre you dance hardest to), badges, monthly Wrapped | Identity + flex + viral share |
| **Chat / Spark** | "You both went OFF at Drugstore" icebreaker; crew-vs-crew dance battle | Amplifies the existing spark/match model |
| **Venue profile** | "Tonight's MVP", venue all-time dance leaderboard, energy-by-hour graph | Gives the club a reason to push the app |
| **Lucky100 / guest-list** | Dance score = raffle entry multiplier; "Top 3 dancers tonight → guest list" | Ties into the existing redemption rail |

**The point:** the dance signal makes *energy, heat, trending, party-of-month, and Crowd-DNA* **real, all at once**. That's the strongest architectural move available.

---

## 2. Commercialization — 5 revenue streams

**Sneakers are the perfect wedge** (movement + footwear = ideal brand fit; tangible, aspirational, shareable). Lead with it.

### Tier 1 — Sponsored leaderboard + prize (B2C, brand-funded)
- Sneaker/streetwear brand sponsors the **monthly Dance Floor MVP → winner gets the sneakers.** Brand gets: logo on the leaderboard, "Dance Mode powered by X", social posts of winners (UGC gold).
- Energy drink (Guarana / Red Bull) → "Red Bull Dance Floor" + on-site sampling.
- Label / festival (EXIT, Lovefest) → "Top the leaderboard this month → tickets".
- **Venue self-sponsors** its own "Drugstore MVP" (free entry / bottle) to drive footfall + installs.
- *Model:* per-campaign fee (sponsored leaderboard + prize fulfilment) or CPM on dance-mode impressions.

### Tier 2 — Sponsored challenges (measurable physical activation)
- "Adidas Boost Challenge: burn 1000 dance-calories this weekend across 3 venues → prize draw." Brands love *measurable* physical engagement (not clicks).

### Tier 3 — B2B venue analytics (recurring revenue — the real moat)
- Venues/promoters pay for a dashboard: energy by hour, "Saturday peaked at 02:14", energy vs other venues, **which DJ set actually moved the floor** (timestamp vs lineup). Data nobody else has → objective proof "our night was lit" + booking intelligence. Ties into the existing metrics dashboard + the Smart Start grant narrative.

### Tier 4 — AfterBefore+ (premium)
- Personal dance analytics deep-dive, dance Wrapped, exclusive sponsor challenges, higher leaderboard tiers.

### Tier 5 — Affiliate / commerce
- "You've danced 50 km → rave-ready sneakers / hydration / recovery" — contextual affiliate off the fitness signal. The sneaker angle generalizes into full lifestyle commerce.

---

## 3. Hard problems (system design) — the feature dies without these

### ① Anti-cheat (the #1 risk)
The accelerometer is trivially spoofable (shake the phone, strap it to a washing machine / a runner). The moment a leaderboard has **real prizes, people WILL cheat.** Mitigations:
- **Score only counts inside a verified GPS check-in window** at the venue (geofence already exists). Outside the geofence = 0.
- **Cross-check with presence/headcount**: one person scoring 9000 while nobody else is there = suspicious.
- **Signature analysis**: real dancing has a rhythmic, bounded acceleration profile; shaking / a machine is too regular / too high-amplitude / wrong frequency band. Cap per-second score; detect impossibly-sustained max intensity.
- **Server-side**: cap score/min, flag outliers, one active session per user, require realistic duration.
- **For prize leaderboards**: prize claim **gated to check-in / in-person pickup** at the venue.
- *Phased:* MVP leaderboards stay "for fun" (no cheat incentive); add real prizes only once anti-cheat is hardened.

### ② The "phone on the table / in coat-check" problem
Many ravers don't hold their phone while dancing → the metric under-counts. Fixes:
- Frame it as an **opt-in "Dance Mode"** (Strava start/stop), a deliberate act — honest, avoids the "I left my phone" unfairness.
- **Option A (HealthKit / Health Connect) solves this** — passive all-night steps even with the phone in a pocket. So A and B are **complementary, not redundant**: B = the active "battle" mode, A = the all-night "real" metric.
- **Smartwatch (Apple Watch / Wear OS)** = the real long-term answer (watch on wrist, phone in coat-check). v3.

### ③ Battery / heat
60 Hz for hours drains battery → lower sample rate, only during time-boxed Dance Mode (B), never passive all night. Option A (read-after-the-fact) = zero battery cost.

### ④ Privacy / GDPR
Movement + location + time = health-adjacent "special category" data. Explicit opt-in, never shame low scores, anonymize aggregates.

### ⑤ Fairness (body types / dance styles)
Raw acceleration favours big jumpy movement over smooth/minimal dancing → score rhythmicity + sustained engagement, not just amplitude; communicate "fun proxy, not a judge".

### ⑥ Cold-start / liquidity
A leaderboard is empty until enough people use it → seed with venue-all-time + city-wide (wider pools fill faster); make the solo personal stat valuable on its own; sponsor prizes drive the first spike.

---

## 4. Data model (sketch)

- `dance_sessions` already exists. Extend with: down-sampled intensity time-series (for venue analytics + signature anti-cheat), link to check-in/venue + (later) lineup slot.
- Aggregates: per-venue-per-night live energy (RPC), per-user lifetime, leaderboards (night / week / month / venue / crew / **sponsor-campaign**).
- New `sponsor_campaign` entity: a leaderboard scoped to a brand + date range + prize + branding assets.
- Real-time: live venue `ENERGY` = rolling aggregate of active dance sessions inside the geofence over the last N minutes.

---

## 5. Roadmap

| Phase | What | Goal |
|---|---|---|
| **1 (done)** | Dance Mode + nightly MVP, "for fun" | validation |
| **2** | Gate to check-in/geofence + anti-cheat caps; **dance aggregate → the real `ENERGY`/Heat**; dance stats on Profile + dance quests | biggest product win (the whole OS becomes true) |
| **3** | **First sponsored leaderboard** (sneaker brand, monthly MVP) + on-site prize claim + "powered by X" | commercial proof |
| **4** | **B2B venue analytics dashboard** | recurring revenue / moat |
| **5** | Option A (HealthKit / Health Connect) all-night + smartwatch | precision, solves "phone on the table" |

**Lead recommendation:** Phase 2 is the priority — dance → real `ENERGY` closes the loop and makes the entire "OS" true (the wow-moment for the grant *and* for users). In parallel, open a conversation with **one sneaker brand** for a Phase 3 pilot (monthly MVP). The B2B analytics (Phase 4) is where the durable money is.

---

## Appendix — current implementation (Phase 1)

- `src/hooks/useDanceMeter.ts` — DeviceMotion accelerometer → live score + intensity + "moves"; iOS permission; simulation fallback for sensor-less devices.
- `src/os/OSDanceMode.tsx` — full-screen overlay (intro → live pulsing score → result with nightly rank → Dance Floor MVP leaderboard; scopes night/week/all).
- Launcher on the venue profile (`OSVenueSheet`).
- `supabase/migrations/20260626120000_dance_floor.sql` — `dance_sessions` + `save_dance_session` + `get_dance_leaderboard` (a "night" clamps pre-6am to the previous day). Applied to prod.
- Decision: this is **Option B** (live accelerometer). **Option A = HealthKit/Health Connect** via a Capacitor health plugin is the precise v2 once native apps publish. Note: Google Fit REST API is deprecated (dead by end-2026) — do not use it.
