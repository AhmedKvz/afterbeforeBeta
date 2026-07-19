# AFTERBEFORE — HANDOFF ZA GEMINI (analiza aplikacije + Smart Start)

> **Ko si ti u ovom zadatku:** nezavisni analitičar proizvoda + grant konsultant za
> **Smart Start (Pametni početak)** program Inovacionog fonda Republike Srbije.
> **Šta dobijaš:** kompletan inventar svega što je izgrađeno (ispod, samostalan —
> ne treba ti pristup kodu). **Šta tražimo od tebe:** dva izlaza, definisana u §8.
> Odgovaraj na srpskom. Budi brutalno iskren — hvalospevi nam ne pomažu.

---

## 1. Šta je AfterBefore

**AfterBefore je operativni sistem beogradskog noćnog života** — mobilna web
aplikacija (PWA) koja povezuje ljude, mesta i noći u realnom vremenu. Nije
listing događaja i nije dating app: to je sloj prisustva ("ko je gde večeras"),
igre ("šta se dešava kad smo tu") i doprinosa ("scena gradi scenu").

- **Ciljna grupa:** 18–30, beogradska klupska/koncertna scena, izlasci PET–SUB.
- **Live beta:** https://ahmedkvz.github.io/afterbeforeBeta/app/ (SR)
- **Landing:** https://ahmedkvz.github.io/afterbeforeBeta/ (SR + EN verzija) —
  festival-flyer estetika, poziv sceni, Founding 100 tiket, Fond scene.
- **Faza:** funkcionalna beta (~80% koda), **bez realne trakcije** (test nalozi).
- **Pilot:** **B1 Founding Night — 18.08.2026** (Kult, kurirana lista ~10–15 OG
  ravera; cilj = prva realna W1→W2 retenciona kohorta).

**Ustav (nepromenljivo):** 3 stuba — prisustvo je verifikovano (check-in na
lokaciji), scena poseduje vrednost koju stvara, bezbednost je kapija a ne
feature. 10 zakona uključuju: nikad ne prodajemo privatnost/ghost mode, pristup
ni status; "AI" se u proizvodu zove pošteno **"algoritam"**; isplate nikad ne
prelaze prihod fonda.

## 2. Tehnički stack

| Sloj | Tehnologija |
|---|---|
| Frontend | React 18 + Vite + TypeScript, Tailwind, custom "OS" UI sloj (terminal estetika, IBM Plex Mono, oklch genre-boje: Techno=električno plava, House=amber, Underground=ljubičasta) |
| Backend | Supabase (Postgres + Auth + Realtime + Storage). Sva pisanja idu kroz SECURITY DEFINER RPC-ove; RLS deny-all na tabelama |
| Hosting | GitHub Pages (HashRouter PWA), CI deploy na push |
| Mobilno | PWA danas; **Capacitor iOS/Android je MVP cilj granta** (ne React Native rewrite) |
| Analitika | Event tracking od dana 1, retenciona kohorta (W1→W2 weekend retention = north-star metrika), NPS, sve vidljivo u internom dashboardu |

## 3. Pet stubova aplikacije (sve izgrađeno i živo)

### 🔥 HEAT — živa mapa grada
- Mapa Beograda sa **44 realna venue-a** (klubovi, splavovi, kafići, barovi,
  jazz/koncertne scene — Drugstore, 20/44, Kult, Para, Savamala klaster…).
- Heat/energija po venue-u, filteri po tipu (klub/splav/kafić/**festival**) i
  kraju grada; "ko je tu sada" brojači.
- **Check-in verifikovan lokacijom** (GPS geofence; u beti otključan za remote
  testere). Check-in je kapija za sve ostalo (igre, recenzije, dance mode).
- Venue sheet: cover slika, Instagram, 🧭 "kako da stignem" (Google Maps
  directions), satnica/lineup, događaji, recenzije, statistika, "KO JE TU",
  "nađi ekipu".

### 🏠 HOME — večeras u gradu
- Feed događaja: hero + trending (samo predstojeći), "N NAJAVLJENO", live-now
  sekcija, "N IDE" social proof.
- Personalizovani "Za tebe" lens (žanr-preferencije iz onboardinga) + OTKRIJ
  rotacija venue-a (partneri prvi, deterministička dnevna rotacija).
- Onboarding: muzički žanrovi → tražim ekipu (crew intent) → omiljena mesta.

### 🤝 CIRCLE — social discovery
- Swipe → Wave → chat (match po muzičkim preferencijama i prisustvu).
- **Crew sistem:** kreiraj/pridruži se ekipi, crew chat, "ekipa traži ekipu".

### 🏆 QUESTS — gejmifikacija i kreatori
- Questovi sa XP/REP progresijom, creator nivoi, UGC quest graf (korisnici
  prave questove za druge), seed questovi odvojeni od realnih statistika.
- **"Make us famous" open quest** za lokale (npr. večera za tebe i ekipu iz
  tvog reklamnog videa) — spreman preset, aktivira se sa prvim realnim partnerom.
- Reviews + Party of the Month glasanje.

### 🛡️ SAFETY — kapija, ne feature
- Safety pravila kao uslov učešća, Lucky100 + referral tiketi (Founding 100).

## 4. Diferencirajuće funkcije (ono što niko drugi nema)

### 💃 Dance Floor Mode
Telefon meri pokret (akcelerometar) dok igraš — kolektivni "dance signal"
žurke u realnom vremenu. Merilo energije + mehanika za brend aktivacije i
poklone. **Signal koji nijedna nightlife aplikacija ne prikuplja.**

### 🎲 Zavrti noć → 🔐 ŠIFRA → 🔐🔐 Crew Šifra ("igra velikih")
Troslojna igra prisustva, otključana **samo check-inom večeras**:
1. **Točak** — 16 duhovitih/hrabrih izazova (dare wheel), "odrađeno" gura quest
   progres.
2. **ŠIFRA** — algoritam upari dve osobe na istoj žurci po muzičkom preklapanju;
   svako dobije **polovinu tajne fraze** (npr. "PONOĆ NEMA" / "KROV"). Nađeš
   osobu izgovaranjem svoje polovine; identiteti se otkrivaju tek kad **oboje**
   potvrde susret. Opt-in pre svega (kanon: bez skrivenog uparivanja).
3. **Crew Šifra** — ekipa traži ekipu: reči šifre se dele round-robin članovima
   dve uparene ekipe; sastavljena šifra upisuje "🔐🔐 ŠIFRA SASTAVLJENA" u oba
   crew chata.

### 🏪 Venue self-serve (dvostrana platforma već radi)
Svaki klub/kafić/splav može **sam**: objaviti događaj (sa cover uploadom),
urediti profil (Instagram link, cover slika), postaviti pin lokacije za
navigaciju. Objava automatski kreira red u imeniku (join po imenu + geofence
integritet). Founder ima admin nadzor (DOGAĐAJI/MESTA tabovi u War Room-u).

### 🎛️ War Room — interni PM/ops centar (u samoj aplikaciji)
- **PULSE:** founder metrike (retenciona kohorta, NPS, growth).
- **PLAN:** živa task tabla sa **588 zadataka** B1 checkliste (status ciklus
  ○→◐→✓→✕, vlasnici, pretraga, progres bar, onboarding kartica za nove članove).
- **Tim:** DB-backed članstvo (dodavanje po emailu, uloge) — projektni menadžer
  ili mentor dobija pun uvid kroz app, ne kroz dokumenta.
- **GRANT:** interaktivni Smart Start readiness tracker.

## 5. Ekonomski motor (ECONOMY §11 — usvojen kanon)

**Ne naplaćujemo funkcije — gradimo ekonomiju doprinosa:**
- Korisnici verifikovanim prisustvom i sadržajem stvaraju vrednost (živa mapa,
  recenzije, satnice) i zarađuju **REP/AFC** interne poene.
- Klubovi umesto oglasa kupuju **aktivaciju zajednice** (raniji dolasci,
  recenzije, nove posete); brendovi finansiraju autentične kampanje sa merljivim
  dometom (npr. kroz Dance Floor).
- Platforma uzima mali deo svake uspešno stvorene vrednosti.
- **Gvozdeno pravilo: ISPLATE ≤ PRIHOD FONDA** — model ne može da "štampa" nagrade.
- **🏛 Fond scene (§11.8):** kada motor postane održiv (definisan okidač), deo
  platformskog prihoda se vraća sceni — oprema, edukacija, kreativni grantovi —
  o kojima **glasa sama scena** (kurirana scene-kreativna lista).
- Nikad se ne prodaje: privatnost/ghost, pristup, status, lični podaci.

## 6. Iskreno stanje podataka (bez ulepšavanja)

| Metrika | Vrednost | Napomena |
|---|---|---|
| Korisnici | ~18 profila | pretežno test nalozi (15 su venue nalozi) |
| Weekend retencija W1→W2 | **0%** | north-star = nula; nema realnih korisnika |
| NPS odgovori | 0 | nema signala |
| Realna trakcija | **nema** | zato postoji B1 pilot 18.08. |
| Venue imenik | 44 realna mesta | ručno kuriran, realan |
| Događaji | seed + self-serve pipeline | čeka realne objave |

**Jedini pravi blocker nije kod — gustina je.** Jedna hero noć (B1) sa 10–15
OG ravera → check-in → šifra/match → quest → povratak sledećeg vikenda
proizvodi jedini grafik koji Fond želi: **W1→W2 ≥ 30%**.

## 7. Smart Start kontekst (već poznato — ne ponavljaj, gradi na ovome)

- Bodovanje /100: **Tim 40 · Tržište 30 · Korist+prednost 30**; prag 75+ → 5-min pitch.
- Naša samoprocena: **Tim = A** (radeća beta de-riskuje "mogu li da naprave" +
  Kult partnerstvo + festival/NGO/prodajno iskustvo tima), **Korist = B+**
  (moat = vlasništvo scene + quest/content graf + Dance Floor signal + safety —
  **NE heat mapa**, to Radiate 2.0 već radi), **Tržište = C** (nema validacije
  dok B1 ne proizvede kohortu).
- MVP koji grant finansira (~5.4M RSD, 6–9 mes): Capacitor native, pravi ML
  umesto "algoritma", content engine + leaderboardi + nagradna putovanja,
  turistički onboarding (monetizacija), d.o.o. + plate + legal.
- Prijava na engleskom + obavezan 3-min video sa svim članovima tima.
- 2025 poziv zatvoren 14.11; ciljamo **2026 poziv**.

## 8. TVOJI ZADACI (dva izlaza)

### Izlaz 1 — Analiza aplikacije (spoljno oko)
1. **Product critique:** gde je proizvod najjači/najslabiji za ciljnu grupu?
   Šta bi 22-godišnjak iz Beograda koristio posle prve noći, a šta nikad?
2. **Konkurentska trijaža:** RA/Dice/Radiate/Partiful/BeReal-mehanike — gde smo
   stvarno diferencirani, a gde se lažemo? (Budi nemilosrdan prema heat mapi.)
3. **Retencioni dizajn:** da li petlja check-in → šifra → quest → povratak ima
   rupu? Šta konkretno vraća korisnika u sredu kad nema žurke?
4. **Rizici koje ne vidimo:** cold-start po venue-u, privatnost prisustva,
   moderacija dare sadržaja, zavisnost od jednog kluba (Kult).

### Izlaz 2 — Smart Start akcioni paket
1. **Bodovna simulacija:** oceni nas /100 po kriterijumima (Tim 40 / Tržište 30 /
   Korist 30) kao evaluator Fonda — sa obrazloženjem po stavci i šta pomera
   svaku ocenu za +5.
2. **Narativ prijave:** predloži strukturu prijave (problem → rešenje →
   inovativnost → tržište → tim → budžet) sa formulacijama koje koriste našu
   najjaču kartu ("radeća beta + pilot metodologija"), na SR + ključne rečenice EN.
3. **B1 → dokaz tržišta:** koje tačno metrike sa noći 18.08. ući u prijavu i
   kako ih prikazati (kohortni grafik, NPS, broj UGC akcija po glavi).
4. **Eligibility checklist:** sve uslove programa (rezidentnost, udeli, starost
   privrednog društva, jedna prijava po rundi, dozvoljeni troškovi) — proveri
   aktuelne uslove i označi šta moramo da rešimo PRE prijave.
5. **3-min video scenario:** struktura obaveznog video pitcha sa svim članovima.

**Format odgovora:** dva jasno odvojena dokumenta (Analiza / Smart Start paket),
tabele gde pomažu, bez generičkih saveta ("poboljšajte marketing") — sve vezano
za konkretne funkcije iz §3–5 i brojeve iz §6.

---

*Pripremio: Claude (Fable 5) · 2026-07-19 · Izvor: repo afterbeforeBeta (kanon:
Istina-i-Zakoni, ECONOMY.md §11, SMART-START-READINESS.md, TODO.md, ZAVRTI-NOC.md)*
