# HANDOFF → Opus: War Room DOGAĐAJI admin (content pipeline fix)

> Uputstvo za izvršenje. Piše Fable 5 posle dijagnoze 2026-07-11. Radi TAČNO po ovome —
> repo ima čvrste konvencije i par zamki koje su dole eksplicitno označene (⚠️).
> Pre početka pročitaj: `CLAUDE.md`? — ne postoji ovde; kanon je: `SECTION-LOCKS.md`,
> `ARCHITECTURE.md`, `QUEST.md`, `GAPS.md`. Ship proces: skill **ab-ship**.

---

## 0 · Dijagnoza (činjenice, izmereno)

- `events`: **0 budućih, 119 prošlih, najkasniji datum 2026-07-02** — seed sadržaj istekao; zato „VEČERAS 0" svuda. App NIJE pokvaren (produkcioni build boot-uje, deploy zelen, 25 venues na Heat-u).
- Problem = **content pipeline**: niko ne unosi nove evente. Odluka (founder + lead dev): **NE scraper** (IG ToS/krhko/rizik za partnerstva). Rešenje = founder unos kroz War Room za ~10 min nedeljno + (postojeći) venue-dashboard + community satnica.

## 1 · Deliverable

**War Room → novi tab `DOGAĐAJI`**: lista nadolazećih/prošlih evenata + forma za dodavanje/izmenu + **bulk „zalepi vikend" unos**. Founder-only (postojeći gate). Posle ovoga founder za 10 min napuni vikend i Home/Heat žive.

## 2 · Konvencije repo-a (OBAVEZNO poštovati)

1. **Svi write-ovi kroz founder-gated SECURITY DEFINER RPC** — šablon: `supabase/migrations/20260705180000_founder_quest_admin.sql` (`_is_founder()` postoji i koristi se; `SET search_path = public`; `GRANT EXECUTE ... TO authenticated`).
2. **Migracija fajl** u `supabase/migrations/<UTC-timestamp>_<ime>.sql`, primenjuje se preko Management API (skill ab-ship §1; `SBP_TOKEN` je u `~/.zshenv` i RADI). `[]` = uspeh. **Odmah posle primene regeneriši tipove** (ab-ship §1 korak 3) — u ISTOM commitu.
3. **UI stil**: War Room koristi inline stilove + `OS/G/hexA/MONO` iz `@/os/osTheme` — vidi `src/pages/WarRoomQuests.tsx` kao 1:1 šablon (Field/inp/lbl helpers, Row lista, forma sa Otkaži/Sačuvaj). NE uvodi shadcn u OS/WarRoom fajlove.
4. **Srpski copy**, scene-voice; „iskren-broj" pravilo — nikad izmišljene brojke u UI.
5. **Verifikacija pre push-a**: `cd /Users/macbook/Desktop/AfterBeforer/afterbeforeBeta && ./node_modules/.bin/tsc --noEmit -p tsconfig.app.json` + `npx vitest run` + `VITE_OPEN_CHECKIN=true npx vite build --base=/afterbeforeBeta/app/` + **preview_start `afterbefore` i klikni kroz flow uživo** (login: founder nalog `kavazovic.ahmed@gmail.com` / lozinka u memoriji sesije — test nalozi su OBRISANI). ⚠️ `preview_fill` ne okida React onChange — koristi native setter + `dispatchEvent(new Event('input',{bubbles:true}))`.
6. **Commit**: engleski, objasni ŠTA i ZAŠTO, završi sa `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. `git pull --rebase origin main` pre push-a. CI sad ima tsc+vitest gate — pokvaren push neće proći.

## 3 · Zamke (⚠️ — ovde se gine)

- ⚠️ **`venue_name` na eventu MORA tačno da odgovara `venues.name`** — Heat join i satnica-radius mapa idu PO IMENU. U formi venue biraj iz **dropdown-a punjenog iz `venues` tabele** (id+name+lat/lng), nikad slobodan tekst.
- ⚠️ **Event nosi `latitude/longitude/geofence_radius`** koje koristi check-in radius mapa (`useHeatVenues` radiusMap). Pri insertu **kopiraj lat/lng iz izabranog venue reda** + `geofence_radius` default 100.
- ⚠️ `events.select(...)` u `OSHome` je KOLONSKA lista (Wave A) — ako dodaješ polje koje Home treba, dodaj ga i u select. Za ovaj posao ne treba ništa novo.
- ⚠️ Kolona `music_genres` je `text[]` na `events`, a **NE postoji na `venues`** (bug istorija — ne pretpostavljaj kolone, proveri `information_schema`).
- ⚠️ `lineup` je `text[]`; `set_times` NE diraj (crowdsource od zajednice + `set_times_by` vlasništvo).
- ⚠️ RLS: ne dodaji policy na `events` — pisanje ide kroz novi founder RPC (SECURITY DEFINER zaobilazi RLS). Ne diraj postojeće policies.
- ⚠️ Ekonomske kolone `profiles` su zaključane (column grants) — ne pokušavaj client write bilo čega ekonomskog.
- ⚠️ Posle mutacije invalidiraj: `['os-events']` (Home), i ako menjaš lat/lng — `['venue-directory']` (radius mapa je staleTime Infinity!).

## 4 · Plan implementacije (redosled)

### 4.1 Migracija `2026XXXX_founder_event_admin.sql`
```sql
CREATE OR REPLACE FUNCTION public.admin_save_event(
  p_id uuid,                 -- NULL = create
  p_title text, p_venue_id uuid, p_date date,
  p_start time, p_end time,
  p_genres text[], p_lineup text[],
  p_image_url text, p_active boolean DEFAULT true   -- active: koristi postojeću semantiku ako postoji; ako ne, izostavi
) RETURNS uuid ...
```
- Gate: `IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;`
- Iz `p_venue_id` pročitaj `venues.name/latitude/longitude` → upiši `venue_name`, `latitude`, `longitude`, `geofence_radius` COALESCE 100, `venue_type` iz `venues.type`.
- `p_id IS NULL` → INSERT (RETURNING id); inače UPDATE.
- + `admin_delete_event(p_id uuid)` — founder-gated hard delete (eventi su sadržaj, ne ekonomija; delete je ok). Ali NE briši event koji ima `set_times_by` bez razmišljanja — dozvoli, uz confirm u UI.
- Primeni na prod (ab-ship), verifikuj `SELECT proname...`, regen tipove.

### 4.2 `src/pages/WarRoomEvents.tsx` (šablon: WarRoomQuests.tsx)
- **Lista**: query `events` → dve sekcije „NADOLAZEĆI · n" (date >= danas, sort asc) i „PROŠLI · n" (zadnjih 10, collapsed/opacity). Red: datum · naslov · venue · vreme · ✎.
- **Forma** (inline, kao QuestForm): naslov, venue **dropdown** (iz `venues`), datum (`<input type="date">`), od/do (`type="time"`), žanrovi (comma-separated → text[]), lineup (comma-separated → text[]), image_url (opciono). Sačuvaj → `admin_save_event` → invalidate `['os-events']` + refetch liste. Obriši dugme uz `confirm()`.
- **Bulk „Zalepi vikend"**: textarea, jedan red = jedan event, format:
  `datum | klub | vreme | naslov | žanrovi | lineup`
  npr. `12.07. | Drugstore | 23:00 | MAGLA Showcase | techno, hard techno | MAGLA, BLR`
  Parsiraj (datum prihvati `DD.MM.` i `DD.MM.YYYY`, godina default tekuća; toleriši razmake), preview parsiranih redova PRE snimanja (tabela + broj grešaka), pa batch pozovi `admin_save_event` za svaki. Venue match po imenu case-insensitive protiv `venues` liste — nepoznat klub = crveni red, ne snima se.
- Sve srpski, mono labele, postojeći `inp`/`lbl`/`Field` stil (izvuci u zajednički modul ili kopiraj — ne uvodi novu zavisnost).

### 4.3 Wire u `src/pages/WarRoom.tsx`
- `type Tab` + `TABS`: dodaj `['events', 'DOGAĐAJI']` (posle QUESTOVI).
- Render blok kao za quests tab. Import `WarRoomEvents`.

### 4.4 (Opciono, tek POSLE seedovanja pravog vikenda) Home date-filter
- U `OSHome` events query dodaj `.gte('date', <danas-1>)` — **SAMO ako su novi eventi uneti**, inače Home ostaje prazan (namerno odloženo u Wave A). Ako to uradiš, „PROŠLI" na venue profilu i dalje radi (ima svoj query). Proveri „Za tebe" fallback logiku da ne pukne na prazno (postoji empty-state).

## 5 · Definition of Done (sve mora biti ✓)
1. Migracija primenjena (`[]`) + RPC-jevi potvrđeni + tipovi regenerisani u istom commitu
2. TSC 0 grešaka · vitest svi prolaze · build zelen
3. **Uživo u preview-u**: login kao founder → War Room → DOGAĐAJI → dodaš probni event (npr. sutrašnji datum, venue Kult) → pojavi se u listi → **odeš na Home i vidiš ga u „Za tebe"/„Sve"** → izmeniš ga → obrišeš ga → nestane sa Home-a
4. Bulk paste: 3 reda (1 namerno sa nepoznatim klubom) → 2 se snime, 1 crveno odbijen
5. Screenshot flow-a u odgovoru korisniku
6. Commit + push (`git pull --rebase` prvo); javi commit hash + šta je verifikovano
7. Očisti probne evente iz prod baze na kraju (founder RPC delete) — ne ostavljaj test đubre

## 6 · Šta NE raditi
- Ne gradi scraper / import sa IG/RA — odlučeno protiv (ToS, krhko, partnerski rizik)
- Ne diraj: quest engine, ekonomiju, satnicu, RLS policies, `OSVenueSheet` (osim ako 4.4)
- Ne uvodi nove dependencije
- Ne menjaj vizuelni jezik (role-boje: ime crveno #E8705F, žanr plavo #7AA0E8, mono labele)
- Ne commituj bez preview verifikacije uživo (pravilo iz cele sesije: build → verify → ship)
