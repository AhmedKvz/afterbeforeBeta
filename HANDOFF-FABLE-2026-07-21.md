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
