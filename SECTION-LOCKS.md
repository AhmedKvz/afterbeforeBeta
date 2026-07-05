# AfterBefore — Section Locks

> Zamrznute odluke po sekciji (lead dev + PM + korisnik audit). Lock = šta sekcija JESTE, šta NIJE, koji zakon Ustava služi. Menja se samo svesno, ne ad-hoc.
> Ustav: `AfterBefore-Istina-i-Zakoni.md`. Status sekcija: 🔒 locked · 🟡 u radu · ⬜ čeka.

| Sekcija | Status |
|---|---|
| 1 · HOME | 🔒 locked (2026-06-27) |
| 2 · HEAT | 🔒 locked (2026-06-27) |
| 3 · CHAT | ⬜ |
| 4 · QUEST | 🔒 locked (2026-07-05) |
| 5 · PROFILE | ⬜ |
| 6 · VENUE SHEET | ⬜ |
| 7 · DANCE FLOOR | ⬜ |
| 8 · ONBOARDING | 🟡 dizajn gotov, čeka build |
| 9 · SAFETY (cross-cut) | ⬜ |

---

## 1 · HOME 🔒

**Purpose (1 linija):** „Šta je grad **večeras** + šta da radim" — vlasnik događaja, single-player utility koja daje razlog da otvoriš app i kad ne izlaziš. Osa = **vreme + kuracija** (async).

### JESTE (in scope)
- **Dve leće (tabovi `Za tebe` | `Sve`):**
  - **Za tebe** (default) — opinionated „tvoja noć" (1–3 predloga) + **eventi koji dišu**: lifecycle stanje (`NAJAVLJEN → SKUPLJA SE → 🔴 LIVE → AFTER`), **realna energija** (Dance Floor agregat), `Zaviri` prečica na jednoj promovisanoj LIVE kartici, first-hand **intel** lokalca, `SINOĆ · RECAP`.
  - **Sve** — pun filterabilan katalog (žanr · datum · kvart), RA-style gusta lista. Niko ne gubi „vidi sve".
- **Personalizacija** = `STATED → LEARNED`: onboarding seeduje (mod, žanr, kvart, ritam, intent), ponašanje (check-in, Idem, Dance-DNA, sparkovi, recenzije) vremenom preteže.
- Stories rail, city-signal („N budnih"), zvono (notifikacije), Discover/Community railovi, Lucky100 ispod fold-a, NPS posle check-ina, party vote.

### NIJE (boundaries)
- **NIJE živa mapa / prisustvo** → to je HEAT.
- **NIJE swipe / matching** → to su CHAT i VENUE.
- **NIJE vlasnik `Zaviri`/peek-a** → peek je HEAT funkcija (tap pin → zaviri bilo gde); Home ga pozajmljuje SAMO za jednu promovisanu LIVE karticu (zbog Z1 — deluj dok noć diše).
- Eventi se na Heat-u pojavljuju samo kao **pinovi**, ne kao katalog.

### Pravila
- **Lifecycle migracija:** event ide `HOME (najavljen, async) → HEAT (live, mapa gori) → HOME (recap)`.
- **Crew = zarađen, nikad fejk.** „X iz tvoje ekipe su tu" se pali tek kad graf postoji (sparkovi + pozivi → co-presence). Cold-start fallback: ekipa → Founding Raveri/tribe → samo energija+žanr. Lažni social proof se NE prikazuje (kao i lažno prisustvo u swipe-u).
- **Role-boje u listama** (žanr plav, ime crveno, energija zelena); žanr-wheel samo za hero/stanje. Bez „kladionica" šarenila.

### Zakoni
**Z8** (pobeda na LIVE — večeras prvo) · **Z10** (retencija — dnevni povratak) · **Z9** (async, ne meša se sa sync) · **Z1** (prozor — `Zaviri` prečica da deluješ odmah).

### Build
- ✅ **Wedge isporučen** (`68a67c7`): `Za tebe | Sve` leće + lifecycle stanja na event redovima (`LIVE SADA / SKUPLJA SE · N IDE / NAJAVLJEN`, izvedeno iz start-time + going-count). Za tebe = kurirana „ZA TEBE VEČERAS" lista; Sve = pun katalog (datum + žanr filteri). `OSEventRow` dobio opcioni `state` chip.
- **Faza 2 (deferred):** real energy agregat (Dance Floor) → ubije mock; time-aware Home (Pon–Sre recap/vote, Pet–Sub live); „tvoja ekipa" rail; intel sloj (Reddit-killer + turist monetizacija); recap kao stalni sloj; `Zaviri` peek prečica na LIVE kartici.

---

## 2 · HEAT 🔒

**Purpose (1 linija):** „Gde gori grad **SADA**" — živa mapa energije + prisustva. Osa = **prostor + sync** (live).

### JESTE (in scope)
- **Dva sloja:** (1) **always-on utility** — mapa mesta (šta/gde/žanr/udaljenost), radi i kad je prazno (zato vodi launch); (2) **live presence/energy** — pali se sa gustinom (partner klubovi, vikend).
- **Vlasnik `Zaviri`/peek-a:** tap pin → laki 5s uvid (energija, ekipa, story). Home pozajmljuje peek samo za 1 promovisanu LIVE karticu.
- City-Pulse mapa (apstraktni pulse SVG = brend, ne geo), TYPE + HOOD filteri, „VRUĆE U BLIZINI" rang lista (role-boje: ime crveno, žanr plavo, energija zeleno).

### NIJE (boundaries)
- **NIJE moat** — živu mapu imaju Snap/IG/Radiate → vodi se kao *utility* („dođi zbog alata"), ne kao adut. Diferencijacija = **realna energija (Dance Floor)**, ne sama mapa.
- NIJE katalog događaja (Home; eventi tu samo pinovi). NIJE matching (Chat).

### Pravila
- **Ghost model (odlučeno):** **broj ljudi (`here`) = UVEK vidljiv** (anonimni agregat, nosi gustinu, nula privacy cost). **Tvoj profil lično = opt-in** (ghost default za identitet — skriva *ko si*, ne *da te broji*). Vidljiv = pojaviš se imenom u „ko je tu"/kao YOU na mapi. → privatnost-first za identitet (Z4) + gustina preživi.
- **Ne fejkuj prisustvo ljudi** (ghost-presence ubija poverenje); seed evente/sadržaj na mapi je ok, lažne ljude NE.
- **Walk-min:** ostaje reprezentativno → mora postati pravo sa geo (Faza 2). Konkretan broj je „falsifikabilan", drži ga mekim do geo.

### Zakoni
**Z9** (sync/live, ne meša se sa async) · **Z8** (LIVE) · **Z4** (safety — ghost/vidljivost identiteta) · **Z1** (peek prozor).

### 🛠 Stanje / Build
- Realno: venues (`useHeatVenues`), `here` prisustvo (venue_presence — *potvrditi*). **Mock:** energy/heat, x/y koordinate, walk-min.
- **Faza 2 (deferred):** realna energija = Dance Floor agregat + check-in (⭐ jedini diferencirajući potez vs Snap/Radiate); **peek na tap** (5s glance, sad otvara pun sheet); time-aware (dan „grad se budi" / noć live); **ekipa na mapi** (zarađen graf); real geo (Mapbox) samo ako walk-min mora biti tačan.

---

## 4 · QUEST 🔒

**Purpose (1 linija):** Mašina doprinosa — kako korisnik gradi scenu i kako se doprinos pretvara u nagrade (ECONOMY petlja: doprinos → AFC → nagrade od partnera).

### JESTE (in scope)
- **Quest = content brief** — svaki quest PROIZVODI nešto što app/scena koristi (recenzija→vodič za turiste, story→dokumentacija, dance→energija poda, check-in/explore→gustina, spark/social→graf, signal→najava, glas→Z11). Output chip vidljiv na kartici.
- **3 huba:** QUESTOVI (weekly set + party-of-month glas + custom/crew maker) · NAGRADE (AFC balans + katalog, redemption) · STREAK (+ Weekend Shield).
- **PARTNERI ČASTE** — sponsored questovi SAMO od realnih partnera (PARTNERS Prsten 1), open-frame (tema, ne skripta), nagrada se uzima na licu mesta (Z6).
- Scene-voice srpski copy; role-boje (nagrada-chip zelen = vrednost, partner label amber).

### NIJE (boundaries)
- NIJE domaći zadatak (generički brojači bez outputa) — svaki quest mora da prođe „šta scena dobija?".
- NIJE mesto za fejk sponzore — partner bez potpisa ne ulazi u PARTNERI ČASTE.
- Lucky100 ostaje ODVOJEN od quest/AFC ekonomije (kockanje separacija, ECONOMY §5).

### Pravila
- **Svaki aktivni quest_type MORA imati OS akciju koja ga meri** — quest bez tracking-mesta u OS toku je mrtav UI i ne ulazi u set (zato je `vibe` izbačen iz v2 seta dok OS ne dobije vibe akciju).
- Earn-gate: progres se računa iz realnih akcija (check-in geofence, verifikovana recenzija, dance sesija…) — ECONOMY §2/§3.
- XP → AFC unifikacija = ECONOMY F1 ledger (deferred).

### Zakoni
**Z5** (poverenje→pristup) · **Z6** (nagrada lock na check-in/lokaciju) · **Z10** (ritual/streak retencija) · **Z11** (glas/party-of-month) + raver #4/#5 (open-frame, ne korporativni kavez).

### 🛠 Stanje / Build
- ✅ UI ujednačen (`f7efc6f`): PARTNERI ČASTE sekcija, ekonomska petlja vidljiva, output chipovi, srpski pass, UZMI claim.
- ✅ **Tracking pokrivenost popravljena** (ovaj lock): OS spark→`match`, Idem→`signal`, check-in→`check_in`+`explore`, spark-respond→`social`, dance→`dance`, story→`story`, recenzija→`review`, glas→`vote_best_party`. `vibe` izbačen iz v2 seta (nema OS akciju).
- ⏳ **`quest_content_v2` migracija čeka apply** (novi srpski set + Kult/Para/25 Bar sponsored) — blokirano na SBP_TOKEN.
- **Deferred:** nedeljni ritual dropovi (ČET drop), AFC ledger (ECONOMY F1), Rezident questovi (PARTNERS), sezonski/festival serije.
