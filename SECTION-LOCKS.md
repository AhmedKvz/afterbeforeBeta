# AfterBefore — Section Locks

> Zamrznute odluke po sekciji (lead dev + PM + korisnik audit). Lock = šta sekcija JESTE, šta NIJE, koji zakon Ustava služi. Menja se samo svesno, ne ad-hoc.
> Ustav: `AfterBefore-Istina-i-Zakoni.md`. Status sekcija: 🔒 locked · 🟡 u radu · ⬜ čeka.

| Sekcija | Status |
|---|---|
| 1 · HOME | 🔒 locked (2026-06-27) |
| 2 · HEAT | 🔒 locked (2026-06-27) |
| 3 · CHAT | 🔒 locked (2026-07-11) |
| 4 · QUEST | 🔒 locked (2026-07-05) |
| 5 · PROFILE | 🔒 locked (2026-07-11) |
| 6 · VENUE SHEET | 🔒 locked (2026-07-11) |
| 7 · DANCE FLOOR | 🔒 locked (2026-07-11) |
| 8 · ONBOARDING | 🟡 build isporučen (073e462: 5 koraka, muzika→crew→vikend), lock posle prvih korisnika |
| 9 · SAFETY (cross-cut) | 🔒 locked (2026-07-11) |
| 10 · PRODUCT-WIDE (cross-cut) | 🔒 locked (2026-07-19) |

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

## 3 · CHAT 🔒

**Purpose (1 linija):** Veze nastale **na podijumu, ne u feed-u** — iskra sa žurke → uzvraćanje → razgovor. Osa = **co-presence → 1:1**.

### JESTE (in scope)
- **Iskra (spark) model:** anonimna dok se ne uzvrati („Tajna iskra · KLUB · pre 2h" → UZVRATI). Poreklo iskre je UVEK mesto/žurka — kontekst se prikazuje.
- **Wave → chat:** pozdrav otvara pun chat tek kad druga strana odgovori (obostrani pristanak na razgovor).
- **1:1 razgovori** sa realtime porukama; **🚩 Prijavi + 🚫 Blokiraj u svakom thread-u** (server RPC `report_user`/`block_user`).
- Quest hookovi: iskra→`match`, uzvrati→`social`.

### NIJE (boundaries)
- **NIJE cold-DM aplikacija** — nema slanja poruka bez co-presence porekla (iskra sa mesta). Nema pretrage ljudi, nema browse profila stranaca.
- **NIJE swipe/dating feed** — odbačeno svesno (circle-swipe legacy ugašen).
- **NIJE vlasnik grupnog chata** — crew chat (Nađi ekipu) živi na VENUE sheet-u, vezan za mesto/veče. CHAT je 1:1 posle iskre; proslava matcha vodi ovamo (os-go bus).

### Pravila
- **Bez lažnog prisustva:** „● AKTIVAN/NA" status je bio hardkodovan → uklonjen u ovom lock-u (iskren-broj). Pravi online status tek kad postoji realan signal.
- Identitet pošiljaoca iskre se otkriva TEK uzvraćanjem (Z4 — kontrola identiteta).
- Blokada je jednostrana i tiha (blokirani ne dobija obaveštenje).

### Zakoni
**Z2** (veze sa podijuma) · **Z4** (safety/identitet) · **Z9** (sync — iskra živi u noći).

### 🛠 Stanje / Build
- ✅ Realno: sparks + waves + 1:1 realtime + report/block (Faza 3+4). Fake „AKTIVAN" uklonjen (ovaj lock).
- **Deferred:** pravi online/last-seen signal; „You both went OFF at Drugstore" icebreaker (Dance kontekst, native faza); crew-v2 ulazi (#50).

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

---

## 5 · PROFILE 🔒

**Purpose (1 linija):** Reputacioni pasoš scene — ko si, šta si doprineo, šta ti je otključano. Identitet + flex, ne podešavanja.

### JESTE (in scope)
- Identitet (avatar + ime + rank + 🏴 Founding # + grad), **rank bar** (XP→sledeći nivo), **6 statova** (MESTA · VEZE · STREAK · RECENZIJE · RANK · GRAD) — svi iz realnih izvora.
- Music DNA (žanr čipovi iz onboardinga), achievements (prva 4), invite/referral share, meni: Izmeni profil (→ onboarding), Notifikacije, War Room (samo founder), odjava.

### NIJE (boundaries)
- NIJE javni profil stranca (to je `/u/:id` PublicProfile — minimalan); NIJE settings stranica (nema šume toggle-ova); NIJE feed.
- Statistika NIKAD ručno upisiva — sve izvedeno iz akcija (ekonomija je server-authoritative posle lockdowna).

### Pravila
- **MESTA broji `venue_checkins`** (secure RPC tabela) — bio je legacy `event_checkins` → popravljeno u ovom lock-u (pogrešan broj = iskren-broj kršenje).
- **Jezik reputacije (usvojeno iz ChatGPT analize, deferred):** UI još piše „XP" — planiran REP/AFC jezički pass (baza već razdvaja `xp`=reputacija od `spendable_xp`=AFC).
- `crew_intent`/`fav_venues` (onboarding v2) — prikaz/izmena na profilu = deferred.

### Zakoni
**Z5** (doprinos→status→pristup) · **Z10** (streak vidljiv = ritual) · Z3 (ekonomija poštena — brojevi se ne kuju).

### 🛠 Stanje / Build
- ✅ Realno sve; MESTA izvor popravljen (ovaj lock).
- **Deferred:** REP/AFC copy pass; Dance archetype + Wrapped (native); prefs edit sekcija.

---

## 6 · VENUE SHEET 🔒

**Purpose (1 linija):** **Sync čvorište noći** — jedno mesto gde se noć DEŠAVA: check-in (money path), ko je tu, iskra, Idem, satnica, ekipa, recenzije, dance. Z1 prozor u živo mesto.

### JESTE (in scope)
- Hero (žanr boja + heat), statovi (OVDE SADA · DOLAZI · ARHIVA), **GPS check-in** (izdvojen `useCheckIn` hook — Capacitor hotspot; XP+AFC+questovi+feedback), prisustvo („ko je tu" — recipročni opt-in), iskra, **Idem** najava, **satnica** (crowdsource set-times sa vlasništvom), **Nađi ekipu** (crew + realtime grupni chat), recenzije (verified + moderisane), Dance Mode ulaz, match proslava, NPS feedback posle check-ina.
- Crowd-DNA radar = **označen preview** („PUNI SE SA RECENZIJAMA") — pošteno dok ne postane real.

### NIJE (boundaries)
- NIJE katalog (Home) ni mapa (Heat) — sheet se OTVARA sa njih; NIJE 1:1 chat (CHAT); NIJE event admin (War Room).
- **Check-in award ISKLJUČIVO kroz `process_secure_checkin`** — bez venue uuid-a nema awarda: fejk „+40 XP" success za venueId=null **uklonjen u ovom lock-u**; sad pošteno uputi na Heat pin.

### Pravila
- **Redosled sekcija (founder, 2026-07-12): KO JE TU → Nađi ekipu → sve ostalo.** Ljudi su prvi sadržaj sync čvorišta — prisustvo i ekipa iznad dance/eventi/statistika.
- Sve akcije vezane za KONKRETNO mesto u KONKRETNO vreme (Z6 — vrednost se uzima na licu mesta).
- Prisustvo: broj uvek, identitet opt-in (HEAT ghost model važi i ovde).
- Geofence pravila = PRE-LAUNCH task #57 (server radius + klijent poravnanje + poruka).

### Zakoni
**Z1** (prozor u živo) · **Z6** (lokacija lock) · **Z2** (iskra sa mesta) · **Z4** (opt-in identitet).

### 🛠 Stanje / Build
- ✅ Sve gore realno; D1 dekompozicija check-ina gotova (`977365d`); fejk check-in put uklonjen (ovaj lock).
- **Deferred:** ostatak dekompozicije (reviews/presence/actions moduli); radar → real (recenzije+dance agregat); peek 5s varijanta (HEAT).

---

## 7 · DANCE FLOOR 🔒

**Purpose (1 linija):** Jedini real-time ground-truth signal koji niko drugi nema (verifikovan fizički napor × mesto × vreme) — „Strava za noćni život".

### JESTE (in scope)
- **Web = POKAZNO** (odluka 2026-07-11, DANCE_FLOOR_STRATEGY §6): ručni start sa venue sheet-a, intro→live→done→board, `save_dance_session`, leaderboard (noć/nedelja/sve), quest `dance`. **SIM oznaka** kad nema senzora (pošteno).
- **Native = MERILO** (#51): auto-start na check-in, background, bez permission dijaloga; SAMO native sesije se kvalifikuju za sponzorske nagrade (Reebok nedeljni leaderboard kroz AFC/redemption rail).

### NIJE (boundaries)
- Web sesije NISU kvalifikacija za nagrade (spoofable + ekran mora biti upaljen = nepošten broj).
- NIJE fitness app — merenje služi sceni (heat real-energy, MVP noći, leaderboard), ne kalorijama per se.
- NIJE always-on tracking bez signala korisniku — chip indikator + toggle obavezni i na native-u.

### Pravila
- Dance score plausibility cap = poznat dug (kozmetički dok je web pokazno; obavezan pre native nagrada).
- Sesija se vezuje za venue (sponsor leaderboard po klubu) — bez venue konteksta score ide u lični zbir.

### Zakoni
**Z3** (pošten broj — SIM/demo označeno) · **Z6** (nagrada = mesto) · **Z8** (LIVE energija).

### 🛠 Stanje / Build
- ✅ Web demo kompletan; leaderboard živ; War Room prati sesije.
- **Native (#51):** auto-start dizajn spreman (check-in = okidač); score cap pre prvih nagrada.

---

## 9 · SAFETY (cross-cut) 🔒

**Purpose (1 linija):** Uslov postojanja nightlife proizvoda — poverenje se gradi u svaku sekciju, ne kao poseban ekran.

### JESTE (postoji danas)
- **Prijava + blokada** u svakom 1:1 thread-u (`report_user`/`block_user` RPC, `reports` tabela); recenzije kroz **moderaciju** (`moderation_status`, flagged se ne prikazuje).
- **Identitet opt-in svuda** (ghost model: broj vidljiv, ime tek uz pristanak); iskra anonimna do uzvraćanja; **crew = grupni chat** (bezbedniji od 1:1 sa strancem); 18+ gate u onboardingu.
- **Server-authoritative sve osetljivo:** ekonomija (column grants), check-in (RPC + anti-spoof speed flag), quest claim (normalize trigger), founder admin (`_is_founder`).

### Pravila / granice
- Nijedan AI/algoritam ne odlučuje o bezbednosti ili pristupu (AI brief §8 — usvojeno kao kanon).
- Safety mehanizam mora biti NA MESTU interakcije (u thread-u, na recenziji), ne zakopan u settings.

### 🔴 PRE-LAUNCH dug (poimenice, ne sme se zaboraviti)
1. **`venue_intent` world-readable `user_id`** (SELECT qual=true) → zameniti agregatnim RPC-jem (privacy leak: ko planira gde da ide).
2. **Crew chat nema 🚩 Prijavi** — grupni chat sa strancima mora dobiti report (jedini interakcioni prostor bez njega).
3. **Media bucket bez size/mime capa** (kampanje/story upload).
4. **`account_type` eskalacija** — `set_account_type` RPC + verify_redemption fallback fix.
5. Geofence fix (#57) — deo anti-spoof priče.

### Zakoni
**Z4** (bezbednost pre rasta) · **Z11/Z12** (moderacija + glas zajednice) · Z3 (bez lažnih signala — poverenje).

---

## 10 · PRODUCT-WIDE LOCKS 🔒 (2026-07-19 — usvojene odluke iz master integracije)

> Odluke koje seku kroz sve sekcije. Detalji i ekonomika: `ECONOMY.md` §12–14,
> `QUEST.md` §6, `PARTNERS.md` (Venue Growth Network), `WAR-ROOM-UPDATE-2026-07-19.md`.

1. **Vlasništvo tokova:** HOME distribuira · QUESTS/CONTRIBUTE stvara · PROFILE
   čuva · HEAT vezuje za prostor · VENUE stranice primaju saobraćaj. Isti sistem
   se ne duplira u dve sekcije.
2. **Weekday Active + Iskra (isto mesto):** radnim danima, u učesničkom
   mestu (kafić/bar/galerija/kulturni centar…): verifikovan check-in → eksplicitni
   `Active` opt-in → vidljiv SAMO drugim opt-in korisnicima u ISTOM mestu →
   Iskra (ograničen volumen) → kratka consent-based interakcija uživo. Pravila:
   Active automatski ističe posle ograničenog prozora · prisustvo NIKAD ne
   znači dostupnost · lako ignore/leave/block/report · **bez neograničenog
   daljinskog browse-ovanja ljudi** (nije lokalni Tinder). Postojeći VISIBLE/ghost
   + iskra model = temelj; fali auto-expiry i volumen limit (War Room task).
3. **Venue listing besplatan; plaćeni alati posle dokazane vrednosti.**
   Besplatan profil nikad talac pretplate (ECONOMY §12).
4. **XP/REP nije keš.** AFC („AXP") = neprenosivi closed-loop poen za konkretne
   nagrade u partnerskoj mreži; bez fiksne RSD konverzije; nikad predstavljen
   kao novac/kripto/wallet (ECONOMY §13).
5. **Novac nikad ne kupuje organsku reputaciju** — ni Heat, ni posete, ni
   recenzije, ni rang, ni uklanjanje kritike, ni Trust (ECONOMY §11.5).
6. **App-exclusive pristup sme externi ticketing u MVP-u:** teaser → RSVP u appu
   → externi checkout → access stanje + app pass → postepeno otkrivanje adrese.
   BEZ in-app naplate, izdavanja, refundacija, skeniranja i merchant-of-record
   obaveza dok se scope lock svesno ne promeni.
7. **Doprinos zajednice se nagrađuje POSLE validacije** — prihvaćen i koristan
   doprinos, ne submit forme; volumen sam nikad nije rang (QUEST §6).
8. **Kulturna specifičnost kroz stvarnu korist i pristup** — ekskluzivnost iz
   utility-ja (RSVP/pass/rute/questovi koji postoje samo unutra), nikad iz lažne
   oskudice ili arogancije. Jezik: „Grad vidiš spolja. U živu scenu ulaziš kroz
   AfterBefore."
9. **Anti-scroll:** svaka bitna mehanika vodi ka akciji u stvarnom svetu
   (vidi → izaberi → idi → učestvuj → doprinesi → zapamti); ne optimizujemo
   pasivno vreme na ekranu.
10. **Safety/care informacije se nikad ne naplaćuju.** Mesta mogu plaćati
    operativne care alate i analitiku — nikad viši „safety score".
