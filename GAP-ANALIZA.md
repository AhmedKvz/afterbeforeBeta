# AfterBefore — Gap analiza: HTML prototip vs. React app

> Poređenje: `AfterBefore-mobile-offline (1).html` (dizajn-prototip) vs. `afterbeforeBeta` (prava React + Supabase aplikacija).
> Cilj: šta još treba implementirati da app ima SVE funkcije iz prototipa.

---

## 1. Šta je šta

- **HTML fajl** = dizajn-prototip (Babel-in-browser, single-file). Prikazuje **7 ekrana × 2 platforme (iOS Liquid Glass / Android Material 3)** unutar "DesignCanvas" wrappera. Sve je na mock podacima, bez backenda. Ovo je **vizija UI/UX-a**.
- **Repo** = prava implementacija. Vite + React + TS + **Supabase** (auth, baza, edge funkcije, AI RPC-ovi). Ima ~21 rutu, kompletan backend. UI je jedan responsive web layout (nema iOS/Android device frame).

**Ključ:** repo je backend-bogat, ali mu fale tačno oni "wow" UI moduli koje prototip ističe — pre svega **živa heat mapa grada** i **monetizacija/paywall**. Prototip je vizuelno ispred; repo je funkcionalno dublji u drugim oblastima.

---

## 2. Šta repo VEĆ radi (i gde je ČAK jači od prototipa)

Repo ima sve ovo (prototip nema, jer je samo mockup):
- **Auth + Onboarding** (party_goer / club_venue, 3 koraka, music prefs, avatar)
- **Events**: feed, filteri, detalj, check-in (GPS), wishlist, signali (going/interested/maybe)
- **Swipe (3 varijante)**: event-based (`/circle-swipe/:eventId`), location-based (`/circle-swipe`), Explore Active
- **Matches + Waves**
- **XP sistem + leveli (10) + achievements (6)**
- **Leaderboard** (weekly ravers + venue heat) sa RPC
- **Quests** (7 seedovanih nedeljnih, progress + claim)
- **Lucky 100** raffle (ulazi, izvlačenje, claim prize)
- **Reviews — pun sistem**: rating, tekst, foto, helpful glasovi, prijave, business replies, verified visit, moderation
- **Venue Dashboard** (biznis strana): secret event zahtevi, reviews, lista događaja
- **Notifications** (realtime toast + centar)
- **Scene Panel** (raverboard / vibe signali / safety)
- **AI**: match scoring, crowd prediction, personalizacija ("Tonight For You"), scene health, AI training log
- **Secret events** + access request flow

---

## 3. GAP — šta prototip ima a repo NEMA / nepotpuno

### 🔴 P0 — velike, signature funkcije (srce prototipa)

**1. Živa Heat Mapa grada (Circle tab) — NAJVEĆI GAP**
Prototip `screens-map.jsx`: SVG mapa Beograda sa:
- heat "blobovima" (veličina = heat 0–100, boja po venue hue)
- venue pinovi (emoji, pulsiranje, "HERE"/heat label)
- tvoj location pin (dupli halo)
- day/night toggle (☀️ Now / 🌙 Tonight) — filtrira venue po `mode: day/night/both`
- zoom + recenter kontrole, legenda
- type filteri (Cafés/Eats/Art… danju, Clubs/Bars/Splavi… noću)
- **Live Presence Card** ispod mape (ko je tu sad, friends inside, walk min, rating)
- **rangirana lista venue-a "HOT NEARBY · WITHIN 25 MIN WALK"**

→ Repo ima samo `CityPulse` (Explore "Pulse" mode) sa brojanjem ljudi po venue — **nema vizuelnu heat mapu, blobove, pinove, walk-distance, day/night**. Ovo je centralni ekran prototipa i traži najviše posla.

**2. Monetizacija / Paywall (peek / day / week / month pass)**
Prototip: ceo sistem — `PRICING[]`: **100 RSD peek**, **300 day**, **1000 week**, **3500 AfterBefore+**. Paywall sheet (plans grid, "Best Value", "What you unlock"), Apple Pay/Google Pay/Visa tekst.
- Gating logika: **"Who's here now" je zaključano** osim ako si fizički na lokaciji (GPS check-in → besplatno otključa + 50 XP), imaš pass, ili si platio peek.
- Off-site / At-venue / Pass-active stanja sa različitim banerima.

→ Repo: postoji samo `access_price_rsd` za secret evente. **Nema pass sistem, nema paywall, nema "who's here" gating, nema plaćanje** (potvrđeno: nema Stripe/payment). Velik gap + zahteva payment provider.

**3. "Who's Here Now" — živa prisutnost po venue-u**
Prototip: po venue-u lista ljudi (ime, status "just arrived/been here 30m", piće "rakija", live dot, **Wave dugme**, FRIEND badge), blur kad je zaključano.
→ Repo ima `active_users`/`location_presence` + swipe, ali **nema "ko je tu sad" karticu sa statusom/pićem/wave-om sa mape**. Delimično (podaci postoje, UI ne).

**4. Chat / DM (Matches → poruke)**
Prototip `screens-social.jsx`: pun chat — thread sa bubble-ovima (in/out), composer ("Message…", send), matched baner ("You matched at [venue]"), "+ Plan night", online status, unread badge-ovi, "New Matches" carousel.
→ Repo: Matches ima **samo Wave** gest; "no real messaging" (placeholder UI). **Pravi chat nije implementiran.**

**5. "Make a Quest" — kreiranje questova + crew**
Prototip: bottom-sheet maker — template picker (Venue crawl, New cafés, Culture run, Find a date, Drink crawl, Splav night, Custom), counter (koliko), When (Today/Week/Month), Who (Solo / **Crew 1.5× XP**), XP preview, "Send invites & start". Plus custom/crew quest kartice sa invite/decline/join, deadline.
→ Repo: questovi su **fiksni/seedovani** (7 nedeljnih), nema user-created, nema crew, nema maker UI. Velik gap.

### 🟠 P1 — srednje, po ekranu

**6. Event Detail — fale delovi**
Prototip ima: **DJ Lineup** (kartice, HEADLINER badge), **"Your Circle Going"** (ko od tvojih ide + Invite), **Bookmark**, **Share**, sticky **"Buy ticket · X RSD"** CTA.
→ Repo EventDetail ima check-in/wishlist/signal/crowd-prediction/reviews, ali **nema lineup, circle-going+invite, share, buy-ticket**.

**7. Profile — fale delovi**
Prototip: cover+avatar overlap, **Badges scroll**, **Music Taste** tagovi (top 3 highlight), **Settings meni** (📷 Photos, 🔔 Notifications, 🔒 Privacy, 💳 Payment methods, ❓ Help).
→ Repo Profile ima XP/level/achievements/stats/Lucky100/signout, ali **nema settings podstranicu, payment methods, photos management** (music taste možda delom).

**8. Lucky 100 banner format**
Prototip: "Next winner: #84,200 · 7 check-ins away", progress bar 78%, avatar stack.
→ Repo ima Lucky100 — uskladiti tačan vizuelni format/copy ako se traži 1:1.

### 🟡 P2 — sitno / kozmetika / "ne mora"

**9. After Hours mode** — prototip ima `afterHours` flag (menja day/night surface). Repo: nema jasno. Sitno.

**10. iOS / Android device frame (dual-platform UI)** — prototip renderuje zaseban iOS (Liquid Glass) i Android (Material 3) chrome. **Ovo je prezentacioni mockup, NE prava funkcija** — prava app je jedna responsive web/mobilna verzija. Preporuka: **ne replicirati** kao feature; eventualno koristiti kao dizajn-referencu za stil.

**11. Leaderboard Monthly/Yearly** — prototip ima period čipove (Today/Week/Month/All Time); repo ima weekly, monthly/yearly su stub. Dovršiti podatke.

---

## 4. Predlog redosleda implementacije

1. **Heat Mapa grada** (P0 #1) — novi `CityHeatMap` ekran na "Circle/Explore" tab: SVG mapa + heat blobovi + pinovi + tvoj pin + day/night + walk-lista. Koristi postojeće `get_venue_heat` + `location_presence`.
2. **"Who's Here Now" presence card** (P0 #3) — nadovezuje se na mapu; čita `active_users`/`location_presence`, dodaje status/wave.
3. **Paywall + pass sistem** (P0 #2) — `passes` tabela + Stripe (ili Apple/Google Pay) + gating "who's here". Najveći eksterni dependency.
4. **Chat / DM** (P0 #4) — `messages` tabela + realtime; nadogradnja Matches.
5. **Make a Quest + crew** (P0 #5) — proširiti `quests`/`user_quests` na user-created + crew invites.
6. **Event Detail dopune** (P1 #6) — lineup, circle-going, share, buy-ticket.
7. **Profile settings + payment + badges/music** (P1 #7).
8. **Polish**: Lucky100 copy, After Hours, monthly/yearly leaderboard.

---

## 5. Napomena o izvoru

Prototip moduli su dekodirani iz HTML manifesta (gzip+base64) u:
`/Users/macbook/Desktop/AfterBeforer/_extracted/app-*.jsx`
(app-main, app-chrome, app-data, app-screens-feed, app-screens-map, app-screens-social).
Vendor (React/Babel) i fontovi su izostavljeni.
