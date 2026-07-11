# ARCHITECTURE — ultra review + plan (brzina i stabilnost)

> Sinteza 3-agentnog review-a (performanse · stabilnost · arhitektura), 2026-07-08.
> Sve brojke su IZMERENE (build, sourcemap atribucija, živi row-count-ovi), ne procene.
> Status: ✅ = popravljeno u `lockdown+hardening` commitu · ⬜ = plan (prioritizovano dole).

---

## 0 · Izmereno stanje (pre popravki)

| Metrika | Vrednost |
|---|---|
| Bundle | **1 chunk, 1.579 MB min / 443 kB gzip** — nula code-splitting-a |
| Najveći krivci u bundle-u | recharts+deps **345 kB (22%!)** za 1 sparkline na legacy stranici · legacy pages 159 kB · framer-motion 107 kB (0 importa u OS!) |
| Mrtav kod | **39% src-a (11.531 linija, 89 fajlova)** nedostižno iz bilo koje rute |
| Legacy-only | još 34% (živo samo kroz deep-link rute) — **OS jezgro je samo 25%** |
| Supabase reads | cold open ≈ 142 reda / 110 kB · **Explore otvoren 1h ≈ 8.7k redova** · 6 idle korisnika na Explore 1h ≈ ceo dnevni budžet (50k) |
| Polling | crew chat 720 RPC/h · kampanja 600 RPC/h · heat 3 query/min |
| Tipovi | types.ts **40 migracija star** → 36 fajlova sa `supabase as any` |
| CI | **nula quality gate-ova** (ni tsc, ni lint, ni test pre deploy-a) |
| Testovi | 5 fajlova, čista logika (~2% ponašanja) |
| PWA/offline | **ne postoji** (nema manifest, nema SW) — a klupski wifi je realnost |

## 1 · ✅ Popravljeno ODMAH (isti dan, u prod-u)

1. **🔴 KRIT — ekonomija je bila spoofable iz browser konzole.** Permisivni `profiles` UPDATE policy dozvoljavao je korisniku da SAM upiše `spendable_xp/xp/level/is_founding_raver`. → **Column-level lockdown**: UPDATE grant samo na bezbedne kolone; ekonomske kolone piše isključivo server (SECURITY DEFINER RPC-jevi netaknuti). Verifikovano kroz `column_privileges`.
2. **🔴 KRIT — klijentski `awardXP` mint.** `xp_transactions` INSERT policy ukinut + INSERT revoke — legacy stranice više ne mogu da kuju XP (RPC-jevi rade normalno).
3. **🟠 Check-in trigger hardening** — `advance_sponsored_on_checkin` sad ima exception-izolaciju: quest-knjigovodstvo NIKAD ne obara check-in (money path).
4. **🟠 Race guard: duplo čekiranje** — `UNIQUE(user, venue, nightlife_night)` indeks; drugi konkurentni check-in atomično pada (bez duplog XP/AFC/referrala).
5. **🟠 Kampanja spam** — `UNIQUE(sponsored_id, user_id)` na submissions (1 rad po korisniku po kampanji).
6. **🟠 ErrorBoundary** — prvi u appu; render greška više ne pravi beli ekran (fallback + Osveži).
7. **⚡ Query cache defaults** — `staleTime 60s / gcTime 10min / retry 1`; tab-switch i refocus više ne refire-uju sve queries (glavni read-storm ubijen jednom linijom).
8. **🧹 Poslednji OS→legacy import presečen** — `shouldShowFeedback` → `src/lib/feedbackCadence.ts` (legacy re-exportuje). `src/components/` je sada brisiv kao celina kad legacy ode.
9. **🟠 Check-in UX laž** — RPC greška je prikazivala „Prijavljen ✓"; sad pravi error toast + nema lažnog quest progresa.

## 2 · ⬜ Prioritizovan plan (sledeće ~6 nedelja, pre Capacitor-a)

### Talas A — brzina (nedelja 1) — najveći ROI
- **A1. Route-level lazy** za sve legacy rute (samo OSApp eager) → skida ~380 kB min iz entry-ja. `React.lazy` + Suspense. (S)
- **A2. Izbaci recharts** — 1 sparkline na legacy EventDetail nosi 345 kB; zameni inline SVG-om, obriši dep + `ui/chart.tsx`. (S)
- **A3. events over-fetch** — `select('*')` bez limita (87 kB) → kolonska lista + `gte(date, danas)` (~70% manje). (S)
- **A4. manualChunks** (vendor/supabase/query) — 1-line izmena, deploy više ne bustuje ceo keš korisnicima. (S)

### Talas B — čišćenje (nedelje 1–2)
- **B1. Obriši 89 mrtvih fajlova** (11.5k linija) — dokazano nedostižni; git čuva istoriju. (S)
- **B2. Regen Supabase tipovi** (Management API `GET /types/typescript`) + ubij svih 36 `as any`; ožiči regen u ab-ship (migracija+tipovi = jedan commit). (S)
- **B3. CI gate** — `tsc --noEmit && eslint && vitest run` PRE deploy koraka + na PR. Trenutno pokvaren build ide pravo korisnicima. (S)
- **B4. Migration parity check** — jednokratni schema diff prod⇄lokalni fajlovi; pa ledger tracking u ab-ship. (M)

### Talas C — realtime umesto pollinga (nedelje 2–4)
- **C1. Crew chat** 5s poll → Supabase channel (šablon već postoji u useMessaging). (M)
- **C2. Kampanja** 6s poll → invalidate na svoj vote/upload + 60s fallback. (S)
- **C3. Heat** — venues+radius statični (staleTime ∞), samo `get_venue_heat` na 120s; `geofence_radius` preseliti na `venues`. (M)
- **C4. `assign_weekly_quests` RPC** — top-up dodela se seli sa klijenta (write u useQuery + race) na idempotentan server upsert. Rešava i spoofable `user_quests.is_completed` → `claim_quest` rupu. (M)

### Talas D — struktura (nedelje 2–6, rolling)
- **D1. OSVenueSheet dekompozicija** (436 linija, 9 odgovornosti): prvo `useCheckIn` hook (geofence = Capacitor hotspot), pa OSVenueReviews/OSVenuePresence/OSVenueActions van. (M)
- **D2. Legacy triage**: zadrži `/auth`, `/onboarding`, `/metrics`, `/warroom`, `/venue-dashboard`; portuj chat u OSMatches (match proslava sad vodi na legacy /matches!); gasi legacy `/matches` `/profile` `/quests` `/heatmap` jednu nedeljno. **Cilj: Capacitor pakuje JEDAN app.** (M)
- **D3. Folder target**: `src/os/` (shell+screens), `src/os/venue/`, `src/features/<domen>/` (hooks+services), `src/lib/`. Bez `supabase.from()` u komponentama. (M)

### Talas E — klupska realnost (nedelje 5–8)
- **E1. PWA basics** — `vite-plugin-pwa` (manifest+SW precache): pad konekcije u klubu ≠ beli ekran na reload. Prenosi se direktno na Capacitor. (M)
- **E2. Offline-first queries** — `networkMode: 'offlineFirst'` + persist keš (localStorage): heat/questovi renderuju stale-first instant. (M)
- **E3. Mutation outbox** — check-in/spark koji padne na klupskom wifi-ju NE SME da se izgubi (retry queue). (M)
- **E4. Realtime lifecycle** — `src/lib/realtime.ts`: reconnect/backoff + `visibilitychange` re-sync (telefon u džepu ubija sokete). (M)

### Preostali stabilnosni dug (uz talase)
- `join_crew` cap race (advisory lock) · `venue_intent` world-readable user_id (privatnost → agregat RPC) · media bucket size/mime cap · `account_type` escalation (set_account_type RPC + verify_redemption fallback fix pre launch-a) · referral farming dok je geofence OFF (prihvaćen beta rizik, gasi se launch-om) · dance score plausibility cap (kozmetički).

### ✋ ŠTA NE RADITI još
Monorepo · Next/SSR · strict-mode big-bang · tRPC/GraphQL sloj · offline DB (WatermelonDB) · E2E suite pre nego što legacy umre · redizajn shadcn ui/ u OS-u.

## 3 · Ciljne brojke (kad se Talas A–C završi)

| | Sad | Cilj |
|---|---|---|
| Entry bundle (gzip) | 443 kB | **~150–180 kB** |
| Cold open reads | ~142 reda | ~60 |
| Explore 1h reads | ~8.700 | **~300** |
| Crew chat RPC/h | 720 | ~10 (realtime) |
| Beli ekran na grešku | da | ne (boundary) ✅ |
| Ekonomija spoofable | da | **ne** ✅ |
