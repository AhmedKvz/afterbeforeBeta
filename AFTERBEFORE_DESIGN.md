# AfterBefore — Design System

> **The Nightlife Operating System.**
> A public service for rave & club culture: maps it, documents it, connects it.
>
> This document is the single source of truth for how AfterBefore *looks, moves and feels*.
> It is not a component dump — it is the visual constitution. Build from it, don't bypass it.

**Status:** v1 · **Owner:** Design Engineering · **Primary surface:** Mobile, dark, one-handed, in a dark room at 2AM.

---

## 0. The One-Line Brief

> **Resident Advisor's authority × Spotify Wrapped's warmth × PlayStation trophies × an underground rave flyer × Apple-level polish — rendered cinematic, dark, and alive.**

If a screen looks like a generic SaaS dashboard, a shadcn demo, or an Aceternity landing page, it is **wrong** and must be redone. AfterBefore is a *cultural product*, not an admin panel.

---

## 1. Design Principles (the 7 laws)

These override personal taste. When in doubt, return here.

1. **Cinematic, not corporate.** Full-bleed imagery, deep blacks, content floats *over* atmosphere. The UI is the cinema, the content is the film. No boxy card-grids stacked like a CRM.
2. **The night is the canvas.** Dark is not a "mode" — it is the only truth. Light surfaces are forbidden except for ink-on-acid call-to-action chips. Everything is tuned for a phone screen in a dark club.
3. **Energy through restraint.** Neon is a *spice*, not a sauce. One glowing element per viewport earns the eye. A screen where everything glows = a screen where nothing glows.
4. **Earn the motion.** Movement signals meaning: a check-in pulses, XP flies, a streak ignites. Motion is *feedback*, never decoration. And it always respects `prefers-reduced-motion`.
5. **Culture over chrome.** Genre, venue, scene, people — the content carries the color. The brand frame stays disciplined (near-monochrome) so the *culture* supplies the color.
6. **Editorial confidence.** Big type. Real hierarchy. Opinionated whitespace. We are a media layer, not a settings list. The Verge's boldness, Linear's discipline.
7. **One thumb, three seconds, in the dark.** Every primary action reachable one-handed. Every screen legible in 3 seconds. Touch targets ≥ 44px. Always.

---

## 2. Color System

AfterBefore runs **two parallel palettes**:

- **The Frame** — near-monochrome cinematic surfaces + a tight signature accent set. This is the *brand*. It stays the same on every screen.
- **The Culture** — genre/scene hues that color the *content* (events, venues, quests, profiles). This is what changes screen to screen.

All colors are authored in **oklch** for perceptual consistency in the dark. Format: `oklch(L C H)`.

### 2.1 The Frame — Surfaces

Cool-tinted near-blacks. Never pure `#000` (it crushes OLED detail and kills depth). Never warm gray (reads cheap).

| Token | oklch | Use |
|---|---|---|
| `--ab-void` | `oklch(0.135 0.012 285)` | App background. The deepest layer. |
| `--ab-surface` | `oklch(0.175 0.015 285)` | Cards, sheets, primary containers. |
| `--ab-raised` | `oklch(0.215 0.018 285)` | Modals, popovers, raised-on-raised. |
| `--ab-hairline` | `oklch(1 0 0 / 0.08)` | Borders, dividers. Light @ 8% alpha. |
| `--ab-hairline-strong` | `oklch(1 0 0 / 0.14)` | Active borders, focus rings base. |
| `--ab-scrim` | `oklch(0.1 0.01 285 / 0.72)` | Full-screen overlay behind modals/stories. |

### 2.2 The Frame — Ink (text)

| Token | oklch | Use |
|---|---|---|
| `--ab-ink` | `oklch(0.97 0.005 285)` | Primary text. Soft white, never `#fff`. |
| `--ab-ink-2` | `oklch(0.72 0.01 285)` | Secondary text, captions. |
| `--ab-ink-3` | `oklch(0.52 0.012 285)` | Tertiary, metadata, placeholders. |
| `--ab-ink-4` | `oklch(0.40 0.012 285)` | Disabled, ghost labels. |
| `--ab-ink-on-acid` | `oklch(0.16 0.02 160)` | Dark ink for text *on* the acid CTA. |

### 2.3 The Frame — Signature Accents

This is what makes AfterBefore *not* a generic blue/purple AI app. The signature pair is **Acid × Ultraviolet**, with **Hot** reserved for live/urgent signals only.

| Token | oklch | Meaning | Rule |
|---|---|---|---|
| `--ab-acid` | `oklch(0.88 0.19 158)` | **Primary energy.** XP, level-up, "live", primary CTA, check-in success. | The hero accent. Max **one** acid element per viewport. |
| `--ab-acid-dim` | `oklch(0.70 0.15 158)` | Acid at rest (inactive progress, hover base). | — |
| `--ab-uv` | `oklch(0.62 0.25 300)` | **Secondary brand.** Quests, gamification frame, secondary CTA. | Pairs with acid; never competes with it. |
| `--ab-uv-dim` | `oklch(0.48 0.18 300)` | UV at rest. | — |
| `--ab-hot` | `oklch(0.66 0.25 18)` | **Live / urgent / spark.** "Tonight", live now, sparks, alerts. | Signal only. Never a background fill for calm content. |

> **Why acid-mint as the hero?** It's the one high-chroma color that reads "rave flyer / The Verge / club laser" instead of "fintech gradient". It pops violently on the cool void. It is unmistakably *not* generic. Guard it jealously.

### 2.4 The Culture — Genre Hue Wheel

Every event, venue, quest and profile carries a **genre identity**. The hue is derived from the primary genre and used as a *left-edge accent, tint, and glow* — never as a full background. This is the system already seeded in code (`hueFromString`, Techno/House/Underground) promoted to a full wheel.

| Genre | Hue | Swatch oklch (full) | Tint (8%) |
|---|---|---|---|
| **Techno** | 240 | `oklch(0.62 0.20 240)` | `oklch(0.62 0.20 240 / 0.08)` |
| **House** | 60 | `oklch(0.74 0.16 60)` | `oklch(0.74 0.16 60 / 0.08)` |
| **Underground / Minimal** | 300 | `oklch(0.60 0.22 300)` | `oklch(0.60 0.22 300 / 0.08)` |
| **Drum & Bass / Jungle** | 150 | `oklch(0.72 0.19 150)` | `oklch(0.72 0.19 150 / 0.08)` |
| **Trance / Psy** | 200 | `oklch(0.70 0.16 200)` | `oklch(0.70 0.16 200 / 0.08)` |
| **Disco / Funk** | 350 | `oklch(0.66 0.22 350)` | `oklch(0.66 0.22 350 / 0.08)` |
| **Hip-Hop / R&B** | 35 | `oklch(0.68 0.18 35)` | `oklch(0.68 0.18 35 / 0.08)` |
| **Default / Mixed** | 285 | `oklch(0.64 0.06 285)` | `oklch(0.64 0.06 285 / 0.08)` |

**Implementation contract:**
```ts
// one helper, used everywhere a genre touches the UI
genreHue(genre: string): number   // → 240, 60, 300…  (falls back to 285)
genreColor(genre, L=0.64, C=0.18) // → `oklch(${L} ${C} ${genreHue(genre)})`
genreTint(genre)                  // → `oklch(0.64 0.18 ${hue} / 0.08)`
```
A Techno night and a House night must be **instantly distinguishable** at a glance. Same layout, different genre energy.

### 2.5 Semantic / State

| Token | oklch | Use |
|---|---|---|
| `--ab-success` | `oklch(0.78 0.18 152)` | Confirmed, checked-in (aligns to acid family). |
| `--ab-warning` | `oklch(0.80 0.15 75)` | Caution, expiring. |
| `--ab-danger` | `oklch(0.64 0.22 22)` | Destructive, report, error. |
| `--ab-info` | `oklch(0.70 0.10 240)` | Neutral informational. |

### 2.6 Gradients (use rarely, with intent)

Gradients are **atmosphere**, never button decoration. Banned: the generic `blue→purple` diagonal. Allowed:

- `--grad-acid`: `linear-gradient(135deg, oklch(0.88 0.19 158), oklch(0.82 0.20 178))` — XP/level hero only.
- `--grad-uv`: `linear-gradient(135deg, oklch(0.62 0.25 300), oklch(0.55 0.24 330))` — quest banner frame.
- `--grad-genre`: `linear-gradient(160deg, genreColor @ 0.30 alpha, transparent 70%)` — cinematic top-wash on cards/headers.
- `--grad-void`: `linear-gradient(to top, var(--ab-void) 0%, transparent 100%)` — image legibility scrim. Used constantly.

---

## 3. Typography

Editorial confidence + product clarity. Three roles.

| Role | Typeface | Fallback | Use |
|---|---|---|---|
| **Display** | `Clash Display` / `Hubot Sans` | `system-ui, sans-serif` | Hero numbers, screen titles, level, big editorial moments. Wide, confident grotesk. |
| **UI / Body** | `Inter` (already shipped) | `system-ui` | Everything functional. Optical sizing on. |
| **Mono** | `Geist Mono` / `JetBrains Mono` | `ui-monospace` | Codes (`OSNIVAC`, `#7`), timestamps, data, venue tags. The "system" texture. |

### 3.1 Type Scale (mobile-first, 1.25 ratio, tightened)

| Token | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|
| `display-xl` | 40 / 42 | 800 | -0.02em | Wrapped-style hero numbers (XP, level reveal). |
| `display-l` | 30 / 34 | 800 | -0.02em | Screen-defining titles. |
| `title` | 22 / 27 | 700 | -0.01em | Section heroes, venue names. |
| `headline` | 17 / 22 | 700 | -0.01em | Card titles, list leaders. |
| `body` | 15 / 22 | 400–500 | 0 | Default reading text. **Never below 13px for content.** |
| `caption` | 13 / 17 | 500 | 0 | Secondary info, metadata. |
| `label` | 11 / 13 | 800 | **+0.12em** | UPPERCASE eyebrow labels. The "system" voice. |
| `mono-tag` | 11 / 13 | 600 | +0.04em | Codes, tags, timestamps. |

**Rules**
- Eyebrow `label` is always UPPERCASE, wide-tracked, `--ab-ink-3`. It is the connective tissue of the whole UI ("LIVE NOW", "WEEKEND QUEST", "FOUNDING RAVER").
- Display type may be set in genre color for a single hero moment per screen. Body never is.
- Serbian first. Copy is bilingual-ready (SR primary, EN parity) — keep keys EN, labels SR.

---

## 4. Spacing, Radius, Elevation, Z-Index

### 4.1 Spacing — 4px base, named steps

`2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56`

- Screen gutter: **18px** (`--space-gutter`). Consistent on every screen edge. This is the single most important discipline rule — no random `px-3.5` here, `px-5` there.
- Card padding: **14–16px**.
- Section rhythm (between major blocks): **20–24px**.
- Bottom-nav safe zone: reserve **`pb-28`** on all scroll containers.

### 4.2 Radius

| Token | px | Use |
|---|---|---|
| `--r-chip` | 999 | Pills, chips, avatars, tags. |
| `--r-card` | 16 | Cards, sheets, primary surfaces. |
| `--r-modal` | 22 | Modals, bottom sheets, hero cards. |
| `--r-inset` | 10 | Inputs, small inset elements, badges. |

**One radius language.** No element invents its own value. A `13px` radius anywhere is a bug.

### 4.3 Elevation — glow-first, shadow-second

On true dark, drop-shadows barely register. AfterBefore elevates with **(a) surface lightness step + (b) hairline + (c) optional neon glow** for live elements.

| Token | Value | Use |
|---|---|---|
| `--elev-rest` | surface step + `--ab-hairline` | Default cards. No shadow. |
| `--elev-raised` | raised step + `0 8px 24px oklch(0 0 0 / 0.5)` | Modals, sheets. |
| `--glow-acid` | `0 0 20px oklch(0.88 0.19 158 / 0.45)` | Live/XP/check-in pulse. |
| `--glow-genre` | `0 0 24px genreColor / 0.35` | Selected venue/event. |

Glow is **earned** (live, selected, success) — never ambient.

### 4.4 Z-Index scale (named, no magic numbers)

| Token | z | Layer |
|---|---|---|
| `--z-base` | 0 | Content |
| `--z-sticky` | 40 | Sticky headers, filter bars |
| `--z-nav` | 50 | Bottom navigation |
| `--z-sheet` | 100 | Bottom sheets, paywall, feedback |
| `--z-modal` | 110 | Dialogs |
| `--z-story` | 120 | Fullscreen story / immersive viewer |
| `--z-toast` | 200 | Toasts, XP-fly, top-of-everything |

---

## 5. Motion

> Rave energy, accessibility-safe, 60fps. Transform & opacity only — never animate layout, width, top/left.

### 5.1 Motion tokens

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter / reveal (the signature ease). |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Move / reorder. |
| `--ease-spring` | spring(stiffness 380, damping 30) | Sheets, sparks, playful pops. |
| `--dur-1` | 120ms | Taps, toggles, micro-feedback. |
| `--dur-2` | 220ms | Standard transitions. |
| `--dur-3` | 360ms | Sheets, page-level reveals. |
| `--dur-pulse` | 1800ms loop | Live / presence heartbeat. |

### 5.2 The motion vocabulary (signature behaviors)

- **Pulse** — live venues, presence dots, "happening now". Scale `1 → 1.12 → 1`, opacity `0.9 → 0.6`, infinite. The heartbeat of the city.
- **XP-Fly** — on reward: a `+N XP` chip springs up and arcs toward the level meter, which fills. The single most important "earned it" moment. PlayStation trophy energy.
- **Ignite** — streak/achievement unlock: brief acid glow bloom + one haptic. Never confetti spam.
- **Reveal** — content enters with `translateY(8px) → 0` + opacity, `--ease-out`, stagger **40–50ms** (never the current 100ms — too slow over 8 cards).
- **Sheet** — bottom sheets spring up from below with `--ease-spring`, scrim fades in parallel.

### 5.3 Accessibility & performance (non-negotiable)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
- All looping animations (pulse) become static.
- Glow remains (it's static), motion stops.
- Cap simultaneous infinite animations: **≤ 6 pulsing elements per viewport** (cull off-screen). More than that = battery drain + visual noise.

---

## 6. Component Language

Components inherit The Frame; content supplies The Culture. Every component below is dark-native and mobile-first.

### 6.1 Discovery Page (Home)
- **Cinematic, not a card-grid CRM.** Full-bleed lead media with `--grad-void` scrim for legibility; title and genre tag sit *on* the image, bottom-left.
- Header carries **ambient signal**, not a static logo tagline: e.g. `LABEL: "17 napolju večeras"` in mono. The city is alive in the chrome itself.
- Filter rail: **max 5 primary chips** + a "Više" chip → bottom sheet. Active chip = acid fill + ink-on-acid. Inactive = surface + hairline.
- Event cards: genre left-edge (3px) + faint genre tint top-wash. Techno reads blue, House reads gold — instantly.
- Stagger reveal at 40–50ms. One acid/live element max (the "tonight" lead).

### 6.2 Venue Card
- Image-forward, `--r-card`, void-scrim bottom. Venue name in `headline`, set partly over image.
- **Live row**: presence dot (`--ab-hot` pulse if active) + "34 ovde sada" in mono. This is the killer detail — venues feel *occupied*.
- Genre tag chip (mono) + walking distance. Glow (`--glow-genre`) only when selected on the map.
- Tap target: whole card. Secondary actions (save) are ≥40px icon hit-zones.

### 6.3 Event Room
- The immersive heart. Full-bleed hero (poster/flyer), `display-l` title, genre wash.
- **Sticky bottom action bar** (acid primary: "Idem" / RSVP), floating over content, void-scrim behind for legibility.
- Sections as horizontal-scroll shelves (Spotify): lineup, who's going (avatar rail), media. Never a vertical wall of cards.
- "Who's going" avatars use genre-tinted rings. Tapping a face = intrigue, not a data dump.

### 6.4 Circle Swipe
- Fullscreen, gesture-first, zero chrome. Card = person/profile over atmospheric genre-tinted gradient.
- Swipe physics use `--ease-spring`; like/pass leave acid/ink-3 trails respectively.
- **Spark** (anonymous interest) = `--ab-hot` pulse glyph. Match reveal = Ignite + XP-Fly.
- Bottom: minimal — only the gesture hints fade after first use. No buttons competing with swipe.

### 6.5 Rave Quest Card
- **PlayStation trophy energy.** UV-framed. Quest title in `headline`, reward in mono (`+200 XP`).
- Progress = a thick (≥ `h-3`) acid bar with subtle glow at the fill edge. Segments for "2/3" goals.
- States: *available* (UV frame, crisp), *active* (acid glow, pulses once on open), *complete* (acid fill + check + Ignite), *locked* (dimmed, no glow, mono "Otključaj").
- **No dashed borders.** Dashed = disabled/placeholder in users' minds. Solid `--ab-uv` border, always.

### 6.6 After Quest Mode (after-party flow)
- Distinct *late-night sub-skin*: even deeper void, acid dialed to embers, hot signal for "still open / after spots".
- Time-aware: surfaces "where to go after" with walking time + closing time (mono). Calmer motion (the night is winding down) — slower pulse, warmer hot.
- Visually signals "you're in the after now" — a mode shift, not just a filter.

### 6.7 Raverboard / Club Board
- Editorial leaderboard. The Verge boldness: big ranked numerals in `display`, mono handles, genre-tinted rows.
- Top 3 get glow + badge; the rest are a clean, dense, legible list (Linear discipline).
- Founding Ravers (`🏴 #N`) marked inline — heritage is visible, not buried.
- Filterable by scene/genre — the board recolors to the active genre.

### 6.8 Review System
- Reviews are *cultural documentation*, not star-spam. Lead with the take (quote-led, `headline` pull-quote), then meta.
- Rating uses a **5-segment acid bar**, not gold stars (stars = Yelp/SaaS). Reviewer's scene/genre tag shown.
- Report/flag is a calm `--ab-ink-3` icon (≥40px), never a loud red — moderation is quiet. Confirm via toast.
- 5-flag auto-moderation (already in code) surfaces a subtle "u proveri" state, never publicly shames.

### 6.9 Sponsor Quest Module
- Premium but **honestly labeled**: a mono `label` "SPONZORISANO" eyebrow — never disguised as organic.
- Brand color is *contained* within the module frame (a genre-neutral surface with the sponsor's accent as a single edge), never allowed to repaint the app's Frame.
- Same quest mechanics/visual language as Rave Quests so it feels native, not like an injected ad-card.

---

## 7. Mobile-First UI Rules

1. **Design at 390px first.** Desktop is a courtesy, not the target.
2. **Thumb zone is sacred.** Primary actions in the bottom third. Destructive/secondary up top.
3. **Bottom nav = 5 max**, 56px tall hit-zones, active = acid pill (icon + label), not just a color tint. Heat Map tab may carry a pulse dot when there's live activity nearby.
4. **Sheets over modals.** Bottom sheets (spring) beat center dialogs on mobile — reachable, dismissible by swipe.
5. **Touch ≥ 44px, always.** Small glyph buttons (flag, close) get ≥40px padded hit-zones even if the icon is 16px.
6. **One-handed reach test** every screen before ship. If the only CTA is top-right, it fails.
7. **Safe areas**: respect `pt-safe` / `pb-safe`; reserve `pb-28` for the nav on every scroll view.
8. **Legible at 2AM**: content text ≥ 13px, primary ≥ 15px. No `11px` body text ever (11px is *only* for tracked uppercase labels).

---

## 8. Do / Don't Guardrails

| ✅ Do | ❌ Don't |
|---|---|
| Full-bleed media with void-scrim, content floating over | Stack uniform white-ish cards in a grid like a SaaS dashboard |
| One acid hero element per viewport | Make everything glow — neon soup |
| Let genre hues color the content | Repaint the brand Frame in genre colors |
| Use the 4px spacing + named radius system religiously | Invent `13px` radius, `px-3.5`, random hex |
| Cinematic deep void `oklch(0.135 …)` | Pure `#000` (crushed) or warm gray (cheap) |
| Acid-mint + UV as signature | Generic blue→purple AI gradient |
| Solid UV quest borders | Dashed borders (read as disabled) |
| Motion as feedback (pulse, XP-fly, ignite) | Decorative motion, confetti spam, 100ms staggers |
| Mono for codes/tags/data texture | Mono for paragraphs |
| Respect `prefers-reduced-motion` | Ship unkillable infinite animations |
| Quiet, ≥40px moderation controls | Loud red report buttons that shame |
| Big editorial type, real hierarchy | Timid uniform 14px-everything |

---

## 9. Example Screen Prompts (for later build sessions)

Use these as the *spec voice* when implementing a screen. Each assumes this design system.

- **Discovery:** "Cinematic discovery feed. Full-bleed lead event over void-scrim, genre tag + title floating bottom-left. Ambient header signal '17 napolju večeras' in mono. 5 acid-active filter chips. Genre-edged event cards, 40ms stagger reveal. One live/'tonight' acid moment, nothing else glows."
- **Heat Map:** "Map is hero, 80% viewport. Venue blobs pulse in genre color, size ∝ presence. UI as glass pills floating *over* the map, never panels below it. Auto day/night by clock. Selected venue blooms genre-glow + slides up a Focus card with full-width acid 'ČEKIRAJ SE'."
- **Quests:** "PlayStation trophy board. UV-framed quest cards, thick acid progress bars with edge-glow. One featured 'Vikend Quest' dominates; side quests as a clean list. Solid borders only. Completing a quest fires XP-Fly into the level meter + one Ignite."
- **Circle Swipe:** "Fullscreen gesture-first. Profile over genre-tinted atmosphere, spring physics. Spark = hot pulse glyph. Match = Ignite bloom + XP-Fly. No buttons fighting the swipe; hints fade after first use."
- **Profile (Vibe Card):** "Identity card, read in 3s. Genre tags under the name, Founding Raver `🏴 #N` inline. Stats in human language (Mesta / Veze / Streak). Archetype as a slim acid progress strip showing the *next* milestone, never a wall of locked requirements."
- **Review:** "Quote-led cultural take, not star-spam. 5-segment acid rating bar, reviewer scene tag. Quiet ink-3 flag affordance ≥40px. Editorial confidence."

---

## 10. Implementation Notes (mapping to the codebase)

- **Stack:** Vite + React + TS + Tailwind + shadcn + framer-motion + oklch. This system layers *on top* — most tokens become CSS custom properties + a Tailwind theme extension.
- **Tokens → CSS vars:** define §2–§5 tokens in `:root` (global `index.css`). Reference via Tailwind `theme.extend.colors` using `oklch(var(--ab-…))` pattern or arbitrary values.
- **Genre system already exists** (`hueFromString`, `avatarGradient`, `gradients.ts`) — extend it to the full §2.4 wheel and the `genreColor / genreTint` contract. Don't fork it.
- **framer-motion** maps cleanly to §5: `--ease-out` → `[0.16,1,0.3,1]`, `--ease-spring` → `{type:'spring',stiffness:380,damping:30}`.
- **Migration path:** introduce tokens first (no visual change), then refactor screen-by-screen using the §9 prompts. Don't big-bang it. Lock direction per screen (see the concept selector) before building.
- **Guardrail in review:** any PR introducing a raw hex, a non-scale radius, or a second acid element per viewport gets flagged. The system is enforced, not suggested.

---

*AfterBefore is a public service for the night. Design it like the culture deserves — cinematic, alive, and unmistakably its own.*
