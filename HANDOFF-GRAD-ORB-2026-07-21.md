# HANDOFF → OPUS: IA v2 „Jedan broj, jedno dugme" (PRE B1)

> Odluka: `SECTION-LOCKS.md` §11 (pročitaj prvo). Ship postupak: `/ab-ship` skill.
> Radno stablo VEĆ sadrži necommitovane izmene iz napuštenog "NOĆAS merge" pokušaja —
> one su SIROVINA: zadrži korisno (navedeno ispod), preradi ostatak. NE revert-uj slepo.
> Stil: AB tokeni iz `src/os/osTheme.ts` (AB.*), kanon AFTERBEFORE_DESIGN.md
> (radius 22/16/10/999, gutter 18, mono = začin, glow earned). os-press na CTA.
> Posle svake faze: `npx tsc --noEmit -p tsconfig.app.json` + preview provera
> (server već radi, port 5191; os-go event bus za promenu ekrana).

## Stanje radnog stabla (šta je već urađeno i ostaje)
- `src/index.css` — ZADRŽI SVE: --ab-ink-3 0.56 (a11y kontrast), :focus-visible acid ring, ab-reveal keyframe/guard.
- `src/os/screens/OSExplore.tsx` — ZADRŽI: `embedded` prop vraća samo mapBlock (mapa + tišina kartica). Ovo koristi Karta toggle.
- `src/os/screens/OSMatches.tsx` — ZADRŽI: `embedded` prop (sekcija bez kontejnera + OSChat u fixed overlay-u). Ovo ide u HUB VEČERI, ne u GRAD.
- `src/os/screens/OSHome.tsx` — PRERADI: skini ubačene `<OSExplore embedded/>` + `<OSMatches embedded/>` iz toka (mapa ide iza toggle-a, poruke u hub), ostalo po fazi 1.
- `src/os/OSOrbNav.tsx` + `src/os/OSApp.tsx` — PRERADI po fazi 2 (trenutno su na pola: tip OSScreen već suzen na 'tonight'|'quests'|'profile' → promeni na 'grad'|'ja' + hub overlay).

## FAZA 1 — GRAD ekran (OSHome.tsx postaje GRAD)
1. **Hero = živi broj**: iznad svega (ispod sticky headera): ogroman broj
   `{ukupno napolju}` (suma `here` iz useHeatVenues; postoji u OSExplore kao
   liveTotal — izračunaj isto u OSHome ili izvezi helper iz useHeatVenues) +
   ispod mono: `BEOGRAD · {PET} {23:41}`. Display 56–72px/800, AB.ink; broj > 0
   → acid; 0 → ink sa mono podnaslovom „grad se sprema" (pošteno). Ovaj broj je
   JEDINI acid hero na ekranu.
2. **Toggle Lista | Karta** odmah ispod heroja (pilule kao Quests hub tabovi,
   UV aktivna). state `view: 'lista'|'karta'`.
   - `karta` → renderuj `<OSExplore embedded onOpenVenue={onOpenVenue}/>` + ispod
     mini listu „VRUĆE SADA" top 3 (ime + broj + tap → sheet). NIŠTA drugo.
   - `lista` → postojeći feed tok: hero event kartica → TRENDING → ZA TEBE
     (postojeći lens `Za tebe|Sve` SPUSTI na nivo ove sekcije ili ukini „Sve"
     tab i zameni ga date/genre filterima koji već postoje u 'all' grani — tvoja
     procena, cilj = jedna scroll osa bez duplog sadržaja) → RUTE SCENE rail
     (postoji) → **QUEST NEDELJE kartica** (nova, mala: naslov + progres traka +
     tap → JA/questovi; podatke daje useQuests — uzmi prvi nezavršen weekly) →
     OTKRIJ/OCENILA ZAJEDNICA (postoje) → Lucky100 (postoji).
3. **KRAJ blok** na dnu oba prikaza: mono centriran: „— KRAJ — Ostalo se dešava
   napolju." + ghost dugme „Otvori kartu" (prebaci view) u lista modu.
4. Header eyebrow: `GRAD · {N} NAPOLJU` umesto „NOĆAS · GRAD UŽIVO".

## FAZA 2 — Orb = TU SAM + fiksna traka (OSOrbNav.tsx + OSApp.tsx)
1. `OSScreen = 'grad' | 'ja'`. Fiksna donja traka: levo dugme GRAD, desno JA
   (uvek vidljivi, min 44px meta, mono label + tačka boje kao sada), centar =
   orb (već postoji vizuelno — ZADRŽI conic + glow stil).
2. **Orb ponašanje** (novo):
   - Bez check-ina večeras: tap → otvara listu „gde si?" = bottom sheet sa top 5
     mesta po blizini/prisustvu + pretraga imenika → tap mesta → otvara postojeći
     OSVenueSheet (check-in tamo već radi sve). NE dupliraj check-in logiku —
     orb je prečica do sheeta.
   - Sa aktivnim check-inom (venue_checkins zadnjih 12h — dodaj mali hook
     `useMyNight()`: SELECT poslednji check-in korisnika ≤12h + venue podaci;
     `supabase as any`): orb GORI (glow acid, os-pulse) i tap → **HUB VEČERI**.
3. **HUB VEČERI** = novi fajl `src/os/OSNightHub.tsx`, fullscreen overlay
   (os-overlay-in/out + useExit kao OSDareWheel): header „TVOJA NOĆ ·
   {VENUE} · od {HH:MM}" → sekcije redom: `<OSMatches embedded/>` (poruke/iskre)
   → aktivni quest traka (prvi nezavršen, AcidBar iz OSQuests — izvezi ili
   dupliraj malu) → dugmad kartice: 🎲 Zavrti noć (OSDareWheel), 🕺 Dance
   (OSDanceMode, treba venueId iz useMyNight), 🧑‍🤝‍🧑 Ekipa (OSCrew), VISIBLE
   toggle (set_venue_presence — postoji u useHeatVenues hooks). Sve komponente
   POSTOJE — hub ih samo komponuje.
4. **os-go mapping** u OSApp: 'matches'→otvori hub (setHubOpen true), 'quests'→
   'ja' (+scroll na questove), 'home'/'explore'/'tonight'→'grad', 'profile'→'ja'.
   Match celebration onOpenChat → hub.
5. Deep-link `/venue/:name` ostaje kako jeste.

## FAZA 3 — JA ekran (OSProfile.tsx) prima Quests sadržaj
1. U OSProfile posle rank bara ubaci sekcije iz OSQuests-a: **NAGRADE** (AFC
   balans + katalog + ledger peek — kopiraj 'rewards' hub granu) i **QUESTOVI**
   (kompaktno: weekly lista QuestCard-ova + streak red + RoadmapMaker + custom
   maker link). Najlakše: izvezi iz OSQuests dve embedded komponente
   (`QuestsSection`, `RewardsSection`) i renderuj ih u OSProfile; OSQuests.tsx
   kao ekran prestaje da se rutira (fajl ostavi, izvoz sekcija).
2. Streak claim dugme ostaje (u QuestsSection).

## FAZA 4 — čišćenje + ship
1. tsc + build (`VITE_OPEN_CHECKIN=true npx vite build --base=/afterbeforeBeta/app/`).
2. Preview smoke: GRAD broj + toggle + KRAJ · orb bez check-ina → sheet izbor ·
   (simuliraj check-in? beta open check-in — uradi pravi na nekom mestu pa hub) ·
   JA sekcije · a11y: tab fokus prsten vidljiv.
3. Commit (poruke na srpskom, Co-Authored-By: Claude Opus), push main (deploy auto).
4. TODO.md ažuriraj (pravilo radnog bloka) + war_task „IA v2 build" na done
   (source='ia-v2-2026-07-21' u war_tasks).

## NE DIRAJ
Bazu/migracije · ekonomiju/RPC · OSVenueSheet mehaniku (samo ga orb otvara) ·
landing · kanon boje. Bez novih gamifikacionih mehanika (IRL streak itd. = POSLE B1).
