# GAPS — bugs, issues & missing tests

> Living registar poznatih rupa. Grounded u skeniranju koda 2026-07-05 (lint, test inventory, session audit) — ne iz glave.
> Severity: 🔴 blocker/rizik po podacima · 🟠 kvari doživljaj · 🟡 dug/polish · 🔵 test/infra.
> Status: `open` dok se ne reši; linkuj commit kad se zatvori.

---

## 0 · Sažetak (najveće rupe)

1. **Test pokrivenost ~0%** — 1 test fajl (`src/test/example.test.ts`) na ceo app. Nula testova na quest engine, check-in, ekonomiju, retencionu logiku.
2. **291 `no-explicit-any` + 80 `as any`** — tipska sigurnost probijena svuda gde se dira Supabase (`const db = supabase as any`).
3. **Dupli codebase** — legacy `src/pages/*` + `src/os/*` rade istu stvar; svaki fix se radi dvaput ili se zaboravi jedan.
4. **Ekonomija poluispečena** — XP i AFC su isti broj; sponsored progres ručni.

---

## ✅ Zatvoreno (2026-07-05)
- **F1** midnight LIVE bug → izdvojeno u `src/lib/nightState.ts` (night-aware) + testirano. (`bf789d1`)
- **F7** dead Instagram OAuth dugme → uklonjeno sa Auth. (`bf789d1`)
- **Testovi**: 31 nova (nightState lifecycle, geolocation geofence, getCurrentWeekStart, setTimes) — 39/39 prolazi. *Ostaje:* SQL RPC-jevi (`process_secure_checkin`, `get_beta_metrics`) traže integracioni test sa test-DB.
- **#47 Set times** (satnica) isporučeno + testirano + verifikovano uživo. (`7425701`)
- **#12** test nalozi obrisani iz prod-a (čiste metrike). **#37/#38** SR ulaz + iskren-broj pass.

---

## 1 · 🔵 Missing tests (deficit — delimično zatvoren)

| Šta | Rizik bez testa |
|---|---|
| **questProgress engine** (`incrementQuestProgress`, top-up dodela) | tihо ne broji tip → mrtav quest (već se desilo sa `vibe` i content-swap-om) |
| **check-in geofence** (`process_secure_checkin`, distance calc) | pogrešan radius → lažni/odbijeni check-in; nosi XP+AFC |
| **AFC/XP ledger** (`awardXP`, afc_ledger) | duplo nagrađivanje / negativan balans neprimećen |
| **retenciona kohorta** (`get_beta_metrics` W1→W2) | GRANT broj — mora biti tačan, nula testova |
| **stateOf / lifecycle** (OSHome LIVE/SKUPLJA/NAJAVLJEN) | edge oko ponoći (date roll) neproveren |
| **redemption / reward escrow** | isplata bez pokrića (gvozdeno pravilo ECONOMY) |
| **RLS pravila** | nema testa da user ne čita tuđe podatke |

**Preporuka:** krenuti od 3 najkritičnija (questProgress, check-in, get_beta_metrics) sa vitest + Supabase test klijentom. Setup već postoji (`vitest run`).

---

## 2 · 🔴/🟠 Funkcionalni bugovi i rizici

| # | Sev | Gde | Problem |
|---|---|---|---|
| F1 | 🟠 | OSHome `stateOf` | `LIVE = date===today && now>=start` — posle ponoći datum se prevrne, noć u toku više ne piše LIVE. Treba „night" logika (pre-6h = prethodni dan), kao `_dance_night()`. |
| F2 | 🟠 | Quest sponsored | „Prvih 50 / Before ritual / Dovedi ekipu" ne mere progres automatski — accept postoji, ali check-in ih ne inkrementira (#40 open). Korisnik ne može da završi sponsored quest. |
| F3 | ✅ | XP vs AFC | ~~Isti broj~~ — zapravo odvojeni (`xp`=reputacija, `spendable_xp`=AFC, `afc_ledger`=log). Pravi bag bio: quest claim je davao samo XP, ne AFC. Rešeno (`9374dc2`): `claim_quest` RPC kreditira XP+AFC+ledger server-side (sigurno), katalog SR, ledger peek u NAGRADE. |
| F4 | 🟡 | OSVenueSheet reviews | Recenzija se piše samo uz `eventId`; venue otvoren bez event konteksta → ne može da oceni (ali quest „Iz prve ruke" traži recenziju). |
| F5 | 🟡 | Quest tracking | Progres se broji samo unapred — nema retroaktivnog (postojeće akcije pre v2 se ne računaju). Po dizajnu, ali korisnik može biti zbunjen. |
| F6 | 🟡 | `useQuests` | `const { data: assigned }` — rezultat se ne koristi (query se drži samo zbog side-efekta). Radi, ali miriše; lako se slučajno „očisti". |
| F7 | 🟡 | Instagram OAuth dugme | Prisutno na Auth ekranu, ali IG OAuth je van MVP-a (feature-flag OFF). Dead dugme = lažno obećanje korisniku. |
| F8 | 🟡 | Nixon test venue | `kavazovic.ahmeds@gmail.com` (club_venue) ostao posle #12 cleanup-a — nije pravi venue, treba odluka. |

---

## 3 · 🟠 Data-honesty rupe (delimično rešeno u #38)

Rešeno: energy (≈), venue stats, followers, TOP RATED, AI strip, Lucky100 kartica, walk-min.
**Ostaje reprezentativno (označeno, ali još nije realno):**
- **Crowd-DNA radar** (`OSVenueSheet` RADAR) — hardkodovane vrednosti (Music 92, Safety 60…), označeno „PREVIEW" ali nije iz recenzija.
- **Energy skorovi** — `energyOf(id)` hash, čeka Dance Floor agregat (SECTION-LOCKS HEAT Faza 2).
- **`ai_scene_health`** (16 redova) — AI copy bez pravog modela (honesty: preimenovati „AI" → „algoritam" gde se prikazuje).

---

## 4 · 🟡 Tech debt

| # | Problem | Skala |
|---|---|---|
| D1 | **Dupli codebase** (legacy pages + OS ekrani) | ~15 ekrana × 2 |
| D2 | **291 `no-explicit-any`** (`db = supabase as any` svuda) — nema tipova na custom tabelama/RPC | ceo `src` |
| D3 | **10 `react-hooks/exhaustive-deps`** warnings — potencijalni stale-closure bagovi | 10 mesta |
| D4 | **13 `react-refresh/only-export-components`** — HMR pukotine (helperi izvezeni iz komponent fajlova) | 13 |
| D5 | 60+ **mrtvih tabela** (0 redova: swipe_actions, secret_party_*, ai_match_scores, location_presence…) — schema šum iz ranijih generacija | baza |
| D6 | `tailwind.config.ts` `require()` import — 1 lint error | 1 |

---

## 5 · 🟡 i18n (legacy EN u OS toku — #37 pokrio ulaz, ne sve)

Legacy komponente koje OS koristi još imaju engleski string:
- `ClaimPrizeModal` („Select an event", „Enter your full name"), `Lucky100WinModal` (isto), `ReviewModal` („Share your experience…"), `YourNights` („Write a memento…").
- Edge funkcije (`lucky100-stats`, `summarize-venue-reviews`) — nije user-facing ali `as any`.

---

## 6 · 🔵 Platforma / infra

- **Push notifikacije** — deferred na native (Capacitor, grant M1–3). iOS PWA push nepouzdan. (#18)
- **Nema CI testova** — GitHub Action samo build+deploy; `vitest` se ne pokreće u CI.
- **Test data u deljenoj prod bazi** — rešeno za naloge (#12), ali seed events/venues su prod (ok po dizajnu, ali metrike to moraju da razlikuju).
- **Preview auth quirk** — `preview_fill` ne triggeruje React onChange; testiranje traži native setter workaround (dokumentovano u memoriji).

---

## 7 · Prioritet (šta prvo)

1. **Test na 3 kritična RPC-ja** (questProgress, process_secure_checkin, get_beta_metrics) — jer nose XP/AFC i GRANT broj. 🔵🔴
2. **F1 stateOf night-logika** + **F2 sponsored auto-progres** — kvare quest doživljaj. 🟠
3. **F3 AFC ledger** (ECONOMY F1) — odblokira ekonomiju. 🟠
4. **F7 Instagram dugme** — ukloni ili označi „uskoro" (lažno obećanje). 🟡 (5 min)
5. Tipovi (generisati Supabase tipove → ubiti `as any`) + dedupe codebase — veći refaktor, posle hero noći. 🟡

---

*Reference: `SECTION-LOCKS.md`, `QUEST.md`, `ECONOMY.md`. Taskovi: #39 (ledger), #40 (sponsored progres), #44 (lock audit). Testovi nemaju task — dodati.*
