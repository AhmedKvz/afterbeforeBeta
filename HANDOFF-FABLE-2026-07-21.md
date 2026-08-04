# HANDOFF → FABLE: IA v2 + gamifikacija v2 su SHIPOVANI. Šta sad presuđuješ.

> Od: Opus (izvršenje) · Za: Fable (odluke, ukus, pravac)
> Datum: 2026-07-21 · Stanje: sve pushovano na `main`, live u produkciji,
> radno stablo čisto, QA podaci obrisani iz baze.

---

## 1 · Šta je urađeno (tvoja dva speca, oba do kraja)

| Commit | Sadržaj |
|---|---|
| `a8d4a16` | tvoja odluka u kanon (SECTION-LOCKS §11) + spec GRAD/ORB |
| `f5485b4` | tvoj spec gamifikacije (M1/M2/M3) |
| `2146b7a` | **IA v2 build** — GRAD, orb=TU SAM, hub večeri, JA |
| `abd46be` | **Gamifikacija v2** — konvergencija, IRL streak, gradska ŠIFRA |
| `0187075` | TODO |

**Produkcija verifikovana** u deploy bundle-u: `TU SAM`, `TVOJA NOĆ`,
`KONVERGENCIJA`, `GRADSKA ŠIFRA`, `TVOJI LJUDI` — sve prisutno.

### Odstupanja od speca (moje odluke — proveri da li se slažeš)
1. **Spojena lista događaja umesto dva lensa.** Spec je ostavio na moju
   procenu („Za tebe|Sve"). Uradio sam: filteri (datum+žanr) iznad JEDNE liste —
   bez filtera pokazuje kuriranu, sa filterom pun katalog. Cilj je bio jedna
   scroll osa bez duplog sadržaja. **Alternativa ako ti ne sedi:** vratiti lens
   tabove na nivo sekcije.
2. **OSQuests `embedded` prop umesto cepanja na dve komponente.** Spec je
   predlagao izvoz `QuestsSection`/`RewardsSection`; procenio sam da je prop
   manji rizik i čuva hub tabove (Questovi/Nagrade/Streak) koji su dobri.
3. **„Zavrti noć" sakriven u JA (embedded) modu** — igra se otključava
   check-inom i živi u hubu; ulaz iz profila bi bio ćorsokak kad nisi napolju.
4. **BRAND_LAUNCH konflikt** (Night Motion/VS u Event 1) — ostavljen kako si
   presudila: Wave 1 je merodavan, ništa od toga nije ušlo.

### Bug koji sam našao i popravio usput
`useCheckIn` nije invalidirao `my-night` → posle stvarnog check-ina orb bi se
upalio tek posle 120s. Sada invalidira odmah (+ presence). **Ovo je bilo
nevidljivo u specu i vidljivo tek u browseru** — vredi zapamtiti kao obrazac.

---

## 2 · Šta TI treba da presudiš (redom po važnosti)

### A · Vizuelni pass celine — jedini pravi otvoreni posao
Sve radi, ali **niko sa ukusom nije video celinu na telefonu.** Konkretne tačke
koje mi „bodu oči" a nisam menjao bez tvoje odluke:
1. **GRAD ekran je dugačak.** Redosled je sada: hero broj → toggle → stories →
   live linija → AI strip → hero event → trending → filteri+lista → ⚡konvergencija
   → 🔐šifra → rute → quest nedelje → otkrij → zajednica → Lucky100 → KRAJ.
   To je **16 blokova**. Tvoja doktrina kaže „jednostavno i bogato" — pitanje je
   šta pada ispod KRAJ-a ili u JA.
2. **Stories rail odmah ispod toggle-a** deluje kao ostatak starog Home-a — ne
   uklapa se u „jedan broj, jedno dugme" ritam.
3. **AI strip** („Mirno veče — vikend se sprema") sad duplira poruku heroja
   („GRAD SE SPREMA"). Jedan od ta dva verovatno treba da ode.
4. **Ikone u traci** su emoji (🌃 / 🖤). Radi, ali nije brend — možda tvoj poziv
   za pravi ikonski set.
5. **Prazan grad = prazan ekran.** Kad je 0 napolju i nema evenata, GRAD je vrlo
   tih. Feed-first agent je predlagao uredničku liniju kao lek — tvoja odluka
   je bila „živi broj", pa je ovo posledica koju treba svesno prihvatiti ili
   dopuniti.

### B · Copy pass
Sve što sam pisao je funkcionalno, ne tvoje pero. Mesta gde copy nosi značenje:
- hub: „TVOJA NOĆ · OD 05:39" / „NOĆ TRAJE DOK SI TU"
- picker: „Gde si?" / „Čekiraj se i noć počinje"
- konvergencija: „⚡ KONVERGENCIJA · DOĐI I UZMI" / „SADA OVDE · 29 OD 30"
- šifra: „Reči čekaju po gradu. Ko se kreće — sastavlja. Ekipa deli fragmente."
- IRL streak: „🔥 TVOJI LJUDI · ZAJEDNIČKE NOĆI" / „VEČERAS ZAJEDNO ✓"
- KRAJ: „— KRAJ — Ostalo se dešava napolju."

### C · Dve odluke koje sam ostavio tebi
1. **Gde live IRL streak u JA?** Sada je samo u hubu (compact). Spec je pominjao
   i red u profilu — nisam dodao da ne zatrpam profil bez tvog pogleda.
2. **Da li konvergencija sme da bude „sponsored" vidljivo?** Trenutno je
   `reward_label` slobodan tekst; ECONOMY §13 traži jasnu oznaku ko finansira
   kad je sponzor. Sada nema tog polja — dodati `funded_by` pre prvog partnera.

---

## 3 · Ostaje pred B1 (u War Room → PLAN, sekcija „IA v2")
- **2-device QA 08–09.08**: konvergencija race (kapacitet 1, dva telefona
  istovremeno), šifra crew pooling, IRL streak par. Kill-switch flagovi
  (`convergence_enabled`, `cipher_enabled`) postoje — mehanika koja padne se
  gasi, ne krpi.
- **B1 UX test**: novi korisnik <30s do izbora mesta, check-in iste noći, 7/10.
- Founder blokeri nepromenjeni: potvrda utorka 18.08, vikend program, AFC pravno
  mišljenje, ŠIFRA (postojeća, dare_*) 2-device QA.

---

## 4 · Tehnički inventar (za tvoj sledeći spec)
**Novi fajlovi:** `src/hooks/useMyNight.ts` · `src/hooks/useGamification.ts` ·
`src/os/OSNightHub.tsx` · `src/os/OSVenuePicker.tsx` · `src/os/OSGamification.tsx` ·
`src/components/WarRoomGamification.tsx`
**Migracije (sve primenjene):** `20260721120000_convergence` ·
`20260721130000_irl_streak` · `20260721140000_city_cipher`
**Izmenjeno:** OSApp, OSOrbNav (prepisan), OSHome (GRAD), OSQuests (embedded),
OSProfile, OSExplore/OSMatches (embedded modovi), useCheckIn, WarRoom, index.css
**Nedirano po tvom nalogu:** ekonomija/ledger pravila, venue sheet mehanika,
postojeća ŠIFRA (dare_*), landing, kanon boje.

**Preporuka za podelu dalje:** ja sam efikasan na mehaničkom (migracije, RPC,
E2E, refaktori po specu); ti si potrebna tamo gde odluka nosi ukus ili rizik
(šta pada sa GRAD ekrana, copy, brend, scope pred pilot).

---

# DODATAK · LJUDI shipovan (Opus, 2026-08-03)

Izvršen HANDOFF-LJUDI-2026-08-03 u celosti. Commit `1b12daf`.

## Odstupanja od speca (moje odluke — proveri)
1. **Match nit dobija `status='active'`, ne 'wave'.** `ensure_conversation`
   pravi 'wave' (jednosmerni talas). Kod meet matcha su OBA lajkovala, pa
   sam odmah podigao na 'active' — inače bi PORUKE prikazale match kao
   "dolazni talas" koji treba prihvatiti, što je pogrešan model za obostrani
   match. Iskra tok NIJE diran.
2. **Deck isključuje sve sa kojima već postoji nit** (ne samo matcheve iz
   meet-a). Ako ste već pričali preko iskre, nema smisla da se pojavi u decku.
3. **Rate limit puca POSLE provere mete** (TARGET_CLOSED pre LIMIT_REACHED).
   Namerno: korisniku je korisnije da zna da se osoba isključila. Napomena:
   to znači da meta koja se isključi ne troši swipe.
4. **„Isključi me" je uvek vidljiv** na dnu Ljudi ekrana kad si uključen —
   spec je tražio „gasi se jednim tapom", ovo je najdirektnije mesto.
5. **Ekipa mod v1 = isti deck nad `open_crew` poolom** + traka ka postojećem
   „Nađi ekipu" samo kad si čekiran. Bez posebne crew-specifične kartice.

## Šta sam našao usput
- **Pasoš je rušio JA ekran posle reload-a** (`Date` objekti u persisted
  react-query kešu — naš zakon kaže JSON-only). Popravljeno u prethodnom
  commitu (ISO stringovi + buster v6). Vredi zapamtiti: svaki novi hook koji
  vraća `Date` u query data je tempirana bomba.
- Sesija u pregledaču je **KVZ (founder) nalog**, ne evaluator — bitno za
  buduće preview provere.

## Provereno u pregledaču sa PRAVIM podacima
Kartica renderuje co-presence signal iz stvarne istorije:
„BILI STE ISTE NOĆI U PARA KLUB · 29. jul" + NAJČEŠĆE „Para Klub · Koffein".
E2E 7/7 u rollback bloku. Svi test opt-inovi obrisani — prod baza čista
(0 opted, 0 swipes).

## Za tebe (ukus/odluke)
1. **Prazan deck je realnost do B1** — 25 naloga, niko nije uključen po
   defaultu. Da li Ljudi tab uopšte treba da bude vidljiv pre nego što se
   scena uključi, ili treba „uskoro" stanje dok ne bude ≥10 uključenih?
2. **Copy za crew mod** je moj, ne tvoje pero: „Nađi s kim se izlazi" /
   „Ekipa se pravi pre izlaska."
3. Nedostaje **prijava/blokada sa kartice** (blocks tabela se poštuje u
   upitima, ali nema dugmeta u decku) — pre B1 je to safety stavka.

---

# DODATAK 2 · Landing v4 + žive prijave (Opus, 2026-08-03)

Izvršen HANDOFF-LANDING-2026-08-03 u celosti. Commits: `2759077` (migracija),
`43d4db5` (War Room), landing grana `9cbae94`.

## Šta je forma tačno postala
Više nije demo. Šalje na `landing_signup(p_email, p_role)` RPC anon ključem:
- **normalizacija** (lower+trim) — „  Test.Venue@Primer.RS " i
  „TEST.VENUE@primer.rs" su isti red;
- **dedup po (email, rola)** → „Već si na listi ✓" umesto duplikata;
  ista osoba SME da se prijavi kao i venue i brend (namerno);
- **rate limit 6/24h po mejlu** → „Već si se prijavio/la više puta danas.";
- greške na srpskom, mrežni pad ima svoju poruku.
Tabela je **RLS deny-all** — anon ključ ne može da čita nijednu prijavu, samo
da zove RPC. Founder ih vidi kroz `admin_list_signups()` u War Room → PULSE.

## Odstupanja od speca (moje odluke)
1. **`<option>` dobio `value`** (`raver|izvodjac|...`) umesto mapiranja po
   redosledu — redosled opcija je krhak ugovor, vrednost u markupu nije.
2. **Poruka za dedup je posebna** („Već si na listi") — spec je tražio jednu
   uspešnu poruku, ali čoveku koji drugi put pošalje isto treba istina.
3. **War Room blok je u PULSE** (ne DOGAĐAJI) — tamo su već svi brojevi.
4. **Landing v3 (moj jednoekranski) je zamenjen founderovim fajlom** — to je
   bio nalog; v3 živi samo u istoriji grane (`2c11823`) ako zatreba.

## Provereno na ŽIVOM sajtu (ne lokalno)
- Prijava iz pregledača → red u bazi (`qa.opus@primer.rs / venue`), pa
  ponovna ista → „Već si na listi ✓". **Test red obrisan, tabela je prazna.**
- `/`, `/app/`, `/fund/`, `/en/` svi 200 — ništa na grani nije oštećeno.
- 3× link ka `/app/`, „demo prikazu" teksta više nema.
- Mobilni 375px: hero se lomi čisto, oba CTA puna širina.

## Za tebe
1. **`og.png` NIJE zamenjen** — u Downloads nema nove slike, a stara je iz
   starog branda (ljubičasto-pink). Prvi share na Instagramu će je pokazati.
2. **Footer i dalje nosi `kontakt@afterbefore.app`** i tekstualne linkove
   „Instagram · Privacy · Community Guidelines" koji nikuda ne vode — pre
   B1 im treba ili prava adresa ili brisanje.
3. **Landing i aplikacija sada imaju dva različita glasa**: landing je
   „Nightlife OS / earning layer / Phase 2", aplikacija je „koliko ljudi je
   večeras napolju". Nije greška, ali vredi da presudiš da li se copy
   približava ili namerno ostaje razdvojen (B2B vs korisnik).

---

# DODATAK 3 · Landing: istina + preraspored + privatnost (Opus, 2026-08-03)

Posle Fable analize landinga, izvršeno direktno. Landing grana `7d4bcf6`.

## Tri netačne tvrdnje koje su bile na ŽIVOM sajtu — sve tri sklonjene
1. **Lucky 100** — reklamiran, a danas obrisan iz cele bete.
2. **„Circle povezuje ljude samo kroz konkretan događaj ili lokaciju"** —
   mrtvo ime + obrnuta mehanika (LJUDI radi cele nedelje, bez check-ina).
   Zamenjeno grupama do 6.
3. **„2.840 XP · Level 7" + Raverboard po XP-u** — jezik koji je aplikacija
   danas napustila. Zamenjeno **karticom noći sa pečatima** (Drugstore →
   20/44 → KC Grad · 🌅 ZORA · 🎞 TRIPTIH) i **tabelom po dolascima**
   („17 dolazaka"), što je ono što aplikacija stvarno radi.
   Pasoš/pečati/grupe su ranije imali **0 pomena** na celoj stranici.

## Preraspored (proizvod pre poslovnog modela)
`kako-radi → gamification(pasoš) → scena → partneri → zarada → phase2`
Ranije je raver morao kroz 6 sekcija poslovnog modela pre proizvoda.
Nisam radio pun `/scena` split iz tvoje analize — preraspored donosi
najveći deo dobitka bez druge stranice; split ostaje otvoren ako želiš
oštriju podelu B2B/korisnik.

## /privatnost/ — nova stranica
Prava politika, ne boilerplate: tabela šta se prikuplja i **kada**
(GPS samo u sekundi pritiska check-ina), lista „šta NE radimo",
ko-šta-vidi, kontrola korisnika, brisanje naloga u 30 dana, gde se
podaci čuvaju (Supabase EU + GitHub Pages), 18+. Označeno kao radna
verzija koja ide na pravnu proveru pre javnog lansiranja.
**Napomena:** tvrdnje u njoj su pisane prema stvarnom ponašanju aplikacije
— ako se mehanika menja, ovaj dokument mora da se menja s njom.

## Sitno
- Footer: mrtav tekst → pravi linkovi (privatnost, `/en` koji je postojao
  ali nije bio linkovan, aplikacija, mailto).
- `Inter` uklonjen iz font stacka — nikad se nije učitavao. Google Fonts
  namerno NISAM dodao: slao bi IP posetioca trećoj strani, što bi bilo u
  suprotnosti sa politikom privatnosti koju istog dana objavljujemo.

## Ostaje tebi
1. **`og.png` i dalje star** (ljubičasto-pink brend). Jedina preostala
   vizuelna laž na sajtu — prvi share je pokazuje.
2. **`kontakt@afterbefore.app`** — proveri da domen stvarno prima poštu;
   sada je i u footeru i u politici privatnosti kao zvanična adresa.
3. **Dva glasa** i dalje postoje: landing govori „earning layer / Phase 2",
   aplikacija „koliko ljudi je večeras napolju". Preraspored je ublažio,
   ali odluka o punom `/scena` splitu je tvoja.

---

## Dodatak E — Landing IA v3 + analitika petlje (2026-08-04)

**Zatečeno stanje.** Landing (`afterbefore-landing/index.html`, statički HTML na
grani `landing`) objašnjavao je viziju pre nego proizvod: `kako-radi` je bio
jedna sekcija sa četiri apstraktna koraka, a Phase 2 / zarada zauzimali su više
prostora od same bete. Posetilac nije mogao da odgovori na „šta ovo radi večeras".

**Nova arhitektura (11 sekcija, redosled je poruka).**

| # | Sekcija | Zadatak |
|---|---------|---------|
| 1 | Hero | jedna rečenica: nađi → vidi energiju → ekipa → pasoš |
| 2 | `#vecera-s` Večeras u Beogradu | proizvod odmah — kartice sa „planira" vs „je tu" |
| 3 | `#kako-radi` | 6 koraka + eksplicitna razlika **Idem** ↔ **Tu sam** |
| 4 | `#pasos` Pasoš noći | „Svaka noć ostavlja trag." + Podeli noć |
| 5 | `#ekipe` | max 6, slot krugovi, „Lokacija dostupna nakon odobrenja." |
| 6 | `#misija` | jedna misija kroz ceo životni ciklus (6 faza) |
| 7 | `#venue` | „Od online interesovanja do stvarnih dolazaka." + dashboard + pilot |
| 8 | `#status` | validacija sa oznakama, bez nepotkrepljenih brojeva |
| 9 | `#bezbednost` | privatnost kao 6 tvrdnji koje kod stvarno ispunjava |
| 10 | `#kasnije` | roadmap — spojene stare `scena`/`zarada`/`phase2` |
| 11 | `#prijava` | opšta prijava + **pilot forma za prostore** |

**Ključne odluke.**
- Svaki izmišljen broj nosi `DEMO PRIKAZ` oznaku. Nigde nema tvrdnje o broju
  korisnika, klubova ni preuzimanja.
- Monetizacija je izbačena iz glavnog toka i svedena na roadmap sa disklejmerom
  („Prihod nije garantovan"). Beta priča je sada duža od Phase 2 priče.
- Vizuelni sistem je netaknut — iste `--acid/--line/--muted` promenljive, isti
  `.card/.eyebrow/.section-head` primitivi. Dodato je ~40 linija CSS-a za nove
  komponente, ništa nije prepisano.

**Forme.** Obe idu na postojeći `landing_signup` RPC (`SECURITY DEFINER`,
tabela deny-all). Pilot forma šalje `role='venue'`, uz klijentsku validaciju
(naziv, grad, kontakt osoba, email) sa inline greškama na srpskom.
⚠️ Naziv prostora / grad / kontakt osoba **se trenutno ne upisuju** — RPC prima
samo `(email, role)`. Lead nije izgubljen (email + uloga stižu u War Room), ali
za pun zapis treba migracija koja doda kolone i proširi RPC.

**Analitika.** Landing sada šalje na isti `track` RPC koji koristi aplikacija
(anon je dozvoljen — provereno, 204), pa se landing i app događaji vide u jednom
toku pod `surface:'landing'`:
`landing_view`, `section_viewed` po sekciji (IntersectionObserver, jednom po
učitavanju), `cta_*`, `going_clicked`, `passport_shared`,
`registration_started/completed/failed`, `pilot_form_started/submitted/failed`.

U aplikaciji dodato 6 događaja koji su nedostajali (postojalo ih je 26):
`event_viewed` (klik na red događaja), `going_clicked` (Idem u venue sheetu),
`mission_viewed` / `crew_viewed` (prelazak na MISIJE / LJUDI u GRAD-u),
`mission_accepted` (Prihvati na sponzorisanoj misiji), `passport_opened` /
`passport_created` / `passport_shared` (JA).

**Provereno.** `tsc --noEmit` čist · `vite build` prolazi · landing bez konzolnih
grešaka, bez horizontalnog scroll-a na 375px · validacija pilot forme testirana
(prazna polja → inline greške; ispravna → poziv ka `landing_signup` pa `track`) ·
u aplikaciji potvrđeno da `mission_viewed`, `crew_viewed`, `passport_opened` i
`event_viewed` stvarno lete.

**Nije urađeno / ostaje.**
1. Migracija za pilot polja (naziv/grad/kontakt) — traži svež `SBP_TOKEN`.
2. Tri QA naloga iz istrage registracije (`qa.reg.*`, `qa.reg5.*`, `qa.ui.*`)
   su još u produkciji — brisanje traži isti token.
3. Landing **nije deplojovan** — čeka tvoju potvrdu.
