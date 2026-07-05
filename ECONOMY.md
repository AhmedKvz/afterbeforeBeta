# AfterBefore — Economy (Party-to-Earn)

> Living doc: dizajn ekonomije doprinosa — od poklona i karata do tokenomics-a.
> Teza: **Proof-of-Presence ekonomija** — mladi zarađuju od svog prisustva, znanja i sadržaja u sceni.
> Status: dizajn zaključan konceptualno · Faza 1 = formalizacija postojećih railova.
> Veže se na Ustav: **Z5** (poverenje→pristup), **Z6** (nagrada lock na check-in), **Z10** (retencija), **Z11** (suvlasništvo) + raver-zakon #3 (novac = čašćavanje = veza) i #5 (underground ≠ korporativni kavez).

---

## 0 · Zašto svi „X-to-earn" umiru — i zašto mi ne moramo

Groblje: **STEPN** (move-to-earn; nagrade štampane emisijom tokena → ponzi spiral → kolaps 2022), **TikTok Creator Fund** (fond razvodnjen rastom → niko ništa ne zaradi), **Sweatcoin** (poeni bez pokrića → bezvredni). Uzrok smrti je uvek isti:

> **Nagrada nije bila pokrivena stvarnom vrednošću, i/ili doprinos se mogao fejkovati.**

Naša dva odgovora:
1. **Ko plaća (pokriće):** klubovi (footfall), brendovi (sponzorisani questovi/leaderboardi), turisti (demand za first-hand scenom). Fond = pravi novac.
2. **Dokaz doprinosa:** **verifikovano fizičko prisustvo** — GPS check-in + Dance Floor signal + co-presence. „Zaradi telom na podijumu i znanjem o sceni", ne klikom sa kauča. **Farming je nemoguć po dizajnu.**

### ⚖️ Gvozdeno pravilo (iznad svega)
```
ISPLATE ≤ PRIHOD FONDA — uvek, u svakoj fazi.
```
Nikad ne štampamo vrednost. Nagrada bez pokrića se ne isplaćuje — smanjuje se katalog, ne pravilo.

---

## 1 · Arhitektura: IZVORI → FOND → LEDGER → ISPLATE

```
IZVORI (pravi novac/vrednost)          FOND                    ISPLATE (katalog)
─────────────────────────────          ────                    ─────────────────
Klubovi (guest-liste, pića,     →   Nagradni fond      →    F1: pokloni (piće, GL, merch, skip-line)
  popusti — već daju!)              (per-sponsor           F2: karte (eventi, festivali)
Brendovi (sponsored quests,          pool + globalni)       F3: kreatorske isplate (guide, intel)
  leaderboardi — Dance strat.)                              F3+: token (vlasnički sloj)
Turisti (premium intel/guide)
                                       ↑↓
                              CONTRIBUTION LEDGER (AFC)
                              jedna valuta doprinosa — objedinjuje
                              XP / quest / referral / dance / review tokove
```

**AFC (interni poen)** = obračunska jedinica doprinosa. U Fazama 1–2 je **čist loyalty poen** (pravno = avio-milje): ne kupuje se, ne prenosi se između korisnika, nema sekundarno tržište. To ga drži van zakona o digitalnoj imovini i kockanju.

---

## 2 · Šta se plaća (doprinos → AFC)

Sve zarade su **gated na verifikaciju** — bez dokaza nema poena.

| Doprinos | Gate (dokaz) | Relativna težina* |
|---|---|---|
| Check-in (prisustvo) | GPS geofence | osnovna jedinica |
| Recenzija / intel | `verified_visit` (check-in iste noći) | srednja — ovo je supply koji turista plaća |
| Story / content | check-in + moderacija | srednja |
| Dance Floor (score/MVP) | motion signature + geofence + co-presence | srednja–visoka (MVP bonus) |
| Quest complete | pravila questa (već postoje) | po questu; sponsored = plaća brend |
| Referral (dovedeš čoveka koji se aktivira) | aktivacija = prvi check-in, ne signup | visoka — plaća akviziciju |
| Streak / ritual | postojeća streak logika | mala, ali stalna (Z10) |

*\*Tačan cenovnik = poseban pass (kalibracija na podatke iz beta noći). Princip: **teže je fejkovati → više vredi**; ono što demand strana plaća (intel) → više vredi.*

**Anti-inflacija:** dnevni cap po korisniku · diminishing returns na isti tip doprinosa · sezonski reset ranga (ne i salda) · earn-multiplikatori samo iz sponzorskog fonda.

---

## 3 · Anti-fraud (čim ima vrednosti — farmuje se)

Nasleđuje ceo Dance Floor anti-cheat plan, plus:
- **Earn samo unutar verifikovanog prisustva** (geofence + realno trajanje) — van toga sve = 0.
- **Co-presence cross-check:** jedan „zarađuje" a niko drugi nije tamo = flag.
- **Signature analiza** za dance (ritmičnost, ne amplitude tresenja).
- **Isplata = fizička** gde god može (preuzimanje na lokaciji — Z6 lock na check-in *i za claim*).
- Server-side: cap/min, outlier flag, jedna aktivna sesija, review queue za velike isplate.
- **Sybil:** referral plaća AKTIVACIJU (prvi check-in), ne registraciju — mrtve duše ne vrede ništa.

---

## 4 · Faze (svaka mora sama da stoji)

### FAZA 1 — Pokloni & status (beta, odmah)
- Formalizacija postojećeg: AFC ledger + katalog v0 (piće, guest-lista, merch, skip-line) od **postojećih partnera** (Kult/Para/25 Bar već daju popuste i guest-liste).
- Cilj: dokazati petlju doprinos→poen→stvarna stvar u ruci. KPI: % korisnika sa ≥1 isplatom; uticaj na W1→W2 retenciju.

### FAZA 2 — Karte & festivali (grant period)
- **Sponzorisani fond uživo:** brend plaća quest/leaderboard → top-kontributori dobijaju karte (eventi, festivali — EXIT/Lovefest tie-in iz `DANCE_FLOOR_STRATEGY.md` Tier 1/2).
- **Turista-demand plaća:** premium intel/guide → prvi spoljni novac u fond → **kreatorske isplate** za najbolje lokalce (Be My Guide seme).
- KPI: fond pokriven ≥100% spoljnim novcem; ≥1 brend pilot; prosečna „zarada" aktivnog kreatora.

### FAZA 3 — Tokenomics (POST-grant, tek kad su F1+F2 profitabilne)
- Token ≠ nagrada-štampač (STEPN greška). Token = **vlasnički/upravljački sloj** — kodifikovano **Z11 suvlasništvo**: glasanje o pravcu, deljenje uspeha platforme sa OG doprinosiocima.
- Emisija vezana za **stvarni prihod** (nikad obrnuto). AFC ostaje interna valuta rada; token je equity-sloj iznad.
- Ulaz u fazu 3 SAMO sa pravnim mišljenjem (v. §5) + posle native app store realnosti (§6).

---

## 5 · Pravna ograda (ne „kasnije" — pre svake faze)

- **Srbija — Zakon o digitalnoj imovini (2020):** izdavanje/trgovanje digitalnom imovinom = registracija/licenca (NBS/Komisija za HoV). → AFC u F1–F2 namerno **nije** digitalna imovina (ne kupuje se, ne prenosi, nema tržište). Token (F3) = pun pravni proces.
- **Kockanje:** Lucky100 + bilo šta token-oliko = miris igara na sreću (poseban zakon, licence). → Lucky100 ostaje odvojen od AFC ekonomije; nikad „uloži poene da dobiješ više poena".
- **MiCA (EU):** čim širimo van Srbije (Budimpešta/Berlin iz vizije) — token pada pod MiCA. F3 dizajn mora biti MiCA-aware od prvog dana.
- **Porez:** kreatorske isplate u dinarima (F2+) = poreski tretman honorara — računovođa pre prve isplate.

## 6 · Platformska ograda (App Store / Play)
- Apple/Google ograničavaju kripto-nagrade i in-app vrednosti: **poeni + fizičke nagrade = bezbedno**; token u native appu = minsko polje (review rizik za Capacitor build koji je grant cilj).
- → F1–F2 su 100% store-safe. F3 se dizajnira van app-flowa (web claim / odvojen sloj) ako ikad zatreba.

## 7 · Grant optika (Smart Start)
- U prijavi: **„creator economy za mlade — zarađuju od svoje kulture, nagrade finansirane od sponzora i partnera"** — odlična, državno-prijateljska priča (mladi, kultura, preduzetništvo).
- **Token se NE pominje** u grant materijalu. Faza 3 je post-grant, van projekta koji fond finansira.

## 8 · Kulturna ograda (raver-zakon #5)
- Frame: **„scena nagrađuje svoje"**, nikad „radi za brend". Sponzorisani questovi = otvoren okvir (Heineken: „najbolja after fotka" — ne skripta).
- Underground deo scene mora moći da učestvuje anonimno (ghost identitet iz HEAT locka važi i za leaderboarde — alias umesto imena).
- Earn nikad ne sme da pojede magiju: nagrada prati ono što bi raver ionako radio, ne izmišlja veštačko ponašanje.

---

## 8b · MEGA QUEST — sponzorska content kampanja (marketing mašina)

> Evolucija Tier 2 (sponsored challenges) u punu UGC mašinu. Ovo je i „Argentina prize" mehanika iz master plana — sada je sponzor plaća.

**Petlja:** sponzor plati nagradu (svoj proizvod — npr. Jungle Travel: put u Amsterdam) → **crew quest**: ekipe prave sadržaj sa stvarnih noći → upload na **YouTube + IG (#afterbefore + #sponzor) + u app** → **glasanje SAMO u aplikaciji** → shortlist zajednice + žiri/sponzor finale → pobednik nosi nagradu, svi učesnici AFC.

**Zašto radi (dva smera):** sadržaj izlazi napolje = akvizicija za app i reach za sponzora; glasanje unutra = spoljna publika mora da instalira app. *Content out → audience in.* Sponzoru prodajemo ono što influencer marketing nema: **N komada verifikovano-autentičnog UGC + merljiv engagement + instalacije**.

**Unikatni gate (USP):** submission mora biti vezan za **verifikovano prisustvo** (check-in ± Dance signal sa te noći) — „authenticity, verified". Niko drugi to ne može da garantuje.

**Pravila mašine:**
1. **Glasanje:** samo verifikovani nalozi sa istorijom prisustva (Z5 trust-weighted); **hibrid** — zajednica bira top 5, žiri/sponzor bira pobednika (ubija vote-farming i popularity-contest; pravno = konkurs veštine, ne igra na sreću).
2. **Kultura (raver #7) — ŽURKA JE SVETA, KAMERA IZLAZI NA AFTERU:** video se snima **sa aftera** (+ before/pre-game/putovanje kao dopuna) — **nikad sa same žurke**. Podijum ostaje bez telefona; after je kulturno-prihvaćena zona kamere (ekipa, intima, svitanje). Brief eksplicitno: „snimi svoj after, ne set". Ime app-a = format.
3. **Pravno pre prve kampanje:** template pravila (prava korišćenja UGC za sponzora+nas, GDPR saglasnost snimljenih, muzička prava, porez na nagradu, platform contest pravila). Konkurs kreativnosti sa žirijem — NE izvlačenje.
4. **Alkohol brendovi:** tek posle čistog pilota; strogi 18+.
5. **Jedna MEGA kampanja u isto vreme** (scarcity = event, ne inventar).

**Prvi pilot:** Jungle Travel (youth travel, ista publika, čist brend, nagrada = njihov proizvod). Sponsor report: submissions, reach, glasovi, unikatni glasači, instalacije tokom kampanje, cost-per-authentic-content vs influencer benchmark.

**Data model:** `sponsor_campaign` (brief, sponzor, nagrada, prozor, pravila) → `campaign_submissions` (user/crew, in-app media + spoljni linkovi, night/check-in proof) → `campaign_votes` (glasač, težina) → rezultati. In-app: MEGA QUEST kartica u Quest hubu + galerija za glasanje (Z11).

---

## 8c · QUEST ADS — dvostrana samouslužna pijaca reklama

> Evolucija §8b: od „mi kuriramo kampanju" do pijace gde **brendovi sami postavljaju questove**, a **ekipe sa reputacijom učestvuju**.

**Reframe:** klasična reklama prekida korisnika; quest-reklama **plaća korisnika nagradom za učešće** — pažnja se zarađuje, mi uzimamo fee. Jedini ad-format koji Gen Z ne doživljava kao reklamu. Flywheel: više brendova → bolje nagrade → više ekipa → veći reach → više brendova.

**Brend strana — Quest Composer (šabloni, ne slobodan tekst):**
| Šablon | Primer | Nagrada primer |
|---|---|---|
| CREW CONTENT (§8b format, after-kamera) | „najbolji jutarnji intermezzo crew" (Kafeterija) · „najbolji before/after story" (Heineken) | 4× VIP Lovefest · EXIT karte |
| PRESENCE | „prvih 50 na vratima" · „morning regular" | shot/kafa/skip-line |
| DENSITY | „dovedi ekipu 3+" | skip-line ×4 |

Brend bira brief (open-frame), nagradu, prozor, **reputacioni tier učesnika**, i dobija dashboard (submissions/reach/glasovi/instalacije).

**Korisnik/crew strana — reputation-gated (Z5 kao biznis-mehanika):** otvoreni questovi za sve; **premium kampanje traže tier** (npr. 3+) — reputacija zarađena nogama (check-in istorija, sadržaj, glasovi) = kvalifikacija koja plaća festivale. Merdevina: zabava → reputacija → reputacija nosi pravu vrednost.

**Kontrole (obavezne):**
1. **Moderacija svakog brend questa pre objave** — kultura-fit (open frame, after-kamera, Z9 separacija: mainstream brend ≠ underground noć), pravni check, 18+ flag. (`moderation_status` rail već postoji.)
2. **Prize escrow** — brend deponuje nagradu pre objave; mi nikad ne avansiramo (gvozdeno pravilo).
3. **Anti-spam obostrano** — brend nema DM pristup ni podatke učesnika; limit aktivnih kampanja; u fazi 3 i **brend dobija rating od zajednice** (Z11 ide u oba smera).
4. **„Šta scena dobija" test važi i za brendove** — quest bez outputa za scenu ne prolazi.

**Fazni put (ne gradi portal prvi):**
- **F1 Concierge (sad):** mi sastavljamo quest sa brendom (Kult/Para/25 → Kafeterija/Guarana/Jungle).
- **F2 Templated self-serve:** brend nalog (novi `account_type`) + Composer + obavezna moderacija. Ulaz: posle 2–3 uspešne concierge kampanje.
- **F3 Otvorena pijaca:** tierovi na obe strane, cenovnik (listing fee + success fee), sezonski kalendar kampanja.

**Build napomene:** `sponsored_quests` treba `tier_required` (custom questovi ga već imaju) + `brand_id`; brend nalog = proširenje postojećeg `account_type` (club_venue → + brand); escrow status na kampanji.

---

## 9 · Šta fali da F1 krene (build lista)

1. **`contribution_ledger` migracija** — jedna tabela (user, tip doprinosa, AFC, dokaz-ref, night) + RPC-jevi; objedini postojeće XP/quest/referral tokove umesto da ih menja.
2. **Katalog v0** — `reward_catalog` (naziv, AFC cena, sponzor/partner, stock, claim pravilo) + claim vezan na check-in (redemption rail već postoji — proširenje, ne novi sistem).
3. **Saldo u Profilu + „kako se zarađuje" ekran** (transparentnost = poverenje).
4. **Cenovnik pass** — kalibracija težina na stvarne podatke posle prve hero noći.

---

## 10 · KPI ekonomije

- **Pokrivenost fonda** (spoljni novac / isplaćena vrednost) — mora biti ≥ 1.0
- % aktivnih korisnika sa ≥1 isplatom mesečno
- Uticaj earn-petlje na **W1→W2 retenciju** (A/B gde može — retencija je jedini sudija, Z10)
- Prosečna vrednost isplate po aktivnom kreatoru (F2+)
- Fraud rate (flagged / ukupno isplata)

---

*Reference: `DANCE_FLOOR_STRATEGY.md` (sponzorski tierovi, anti-cheat), `SECTION-LOCKS.md` (HEAT ghost model), Ustav `AfterBefore-Istina-i-Zakoni.md` (Z5/Z6/Z10/Z11), `AfterBefore-Vision-Blueprint.md` (marketplace/guide sloj).*
