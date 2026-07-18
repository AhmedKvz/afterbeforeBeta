# 🎲 ZAVRTI NOĆ — igra velikih

> Living doc igračkog sloja. Pravac potvrđen od foundera 2026-07-13 („definitivno idemo u ovom pravcu").
> Teza: **noć kao IRL igra** — app izaziva, grad je tabla, ljudi su potezi. Anti-scroll DNK:
> svaka mehanika te gura U noć, nikad u telefon.
> Veže se na Ustav: **Z2** (veze sa podijuma), **Z4** (pristanak/bezbednost), **Z6** (vrednost na licu mesta), **Z10** (ritual).

---

## 0 · Zašto je ovo moat

RA ima listu. Dice ima karte. Snap ima mapu. **Niko nema dvoje stranaca koji naglas sastavljaju
„PONOĆ NEMA — KROV" u chill zoni.** Igra se ne kopira feature-om jer je kultura — a kultura
se gradi ritualima. Ovo su naši rituali.

---

## 1 · TRI MODA (svi u jednom overlay-u: venue sheet „Zavrti noć" + Quest hub)

### 🎲 TOČAK — smela misija za tebe
- Zavrtiš → 16 kuriranih misija u glasu scene (kopiraj korak najboljeg plesača · izgubi telefon
  na ceo set · traži DJ-u pesmu za nekog drugog · uvuci solo osobu u ekipu…).
- 2 respina („PREJAKO"). „ODRAĐENO" = **na reč** — scena veruje svojima; gura postojeći
  quest progres (social/dance/story/explore/review). **Nula nove ekonomije.**
- Pravilo misija: hrabrost uperena u TEBE, nikad u tuđe granice (Z4). Ništa što traži
  tuđi pristanak da bi bilo izvedeno bez njega.

### 🔐 ŠIFRA — dvoje se traži
```
opt-in za večeras (samo čekirani) → algoritam upari po ukusu (žanrovi iz onboardinga)
→ oboje dobiju misiju + po POLA šifre („PONOĆ NEMA" / „KROV")
→ chill zona → sastave je naglas → OBE potvrde → tek tad imena
→ social+match progres · „Upoznali ste se kako se u ovom gradu upoznaje — uživo."
```
12 šifri-parova (BAS ZNA / MOJE IME · SVITANJE JE / DOGOVOR · ISKRA PRE / IMENA…).

### 🔐🔐 CREW ŠIFRA — ekipa traži ekipu (anti-klika mašina)
**Čin 1 — ekipa sastavlja sebe:** svaki opted-in član dobija PO REČ svoje polovine
(„GRAD" · „NIKAD" · „NE SPAVA") → huddle uživo, rečenica se složi.
**Čin 2 — ekipa traži ekipu:** druga ekipa u istom mestu drži drugu polovinu
(„A MI SMO DOKAZ") → cela ekipa prilazi celoj ekipi (najniža socijalna barijera).
**Spajanje:** po jedna potvrda iz svake → imena svih + poruka u OBA crew chata:
*„Ekipe su spojene — večeras ste jedna scena."*
8 fraza-parova (EKIPA SE NE BIRA / EKIPA SE DESI · NIKO OD NAS / NE IDE KUĆI RANO…).

---

## 2 · USTAVNE BRAVE (bez ovih igra ne postoji)

1. **Opt-in prethodi mečovanju** — algoritam NIKAD ne aranžira susret nekome ko nije ušao
   u igru (usvojeni AI-kanon: algoritam ne odlučuje o pristupu/susretu). Kod crew verzije:
   **opt-in PO ČLANU** — ekipa ulazi u pool tek sa ≥2 pojedinačna pristanka.
2. **Samo co-presence** — mečuju se isključivo čekirani, isto mesto, ista noć (Z2).
3. **Identitet tek posle OBOSTRANE potvrde** — pre toga si samo polovina šifre (Z4).
4. **Izlaz kad god** (dok nisi uparen — dare_leave) · javna zona · 🚩 report na dohvat.
5. **„Algoritam", ne „AI"** — pošteno ime za prefs-overlap mečovanje (iskren-broj važi i za rečnik).
6. Ekonomija netaknuta: sve nagrade = postojeći quest progres, ništa se ne kuje mimo pravila.

---

## 3 · B1 FOUNDING NIGHT (18.08.2026) — run-of-show momenti

| Vreme | Momenat | Meri se |
|---|---|---|
| ~00:30 | Host najavi **TOČAK rundu** — „svi zavrtite" | dare_spin / dare_done |
| ~01:00 | **ŠIFRA runda** (Q7 „Meet the Scene" odgovor) | parovi · potvrde · vreme-do-susreta |
| ~01:30 | **CREW ŠIFRA runda** — ekipe se traže | ekipe · spajanja · veličine |
| after | Pobednički momenti = video materijal | UGC za Smart Start / TikTok |

Filmski kadar pilota: dve ekipe viču polovine rečenice jedna drugoj. To ne snima nijedna
druga aplikacija na svetu.

---

## 4 · MERENJE (analytics eventi već instrumentirani)

`dare_spin` · `dare_done{type}` · `sifra_join{matched}` · `sifra_completed`
· `crew_sifra_join{status}` · `crew_sifra_completed`
KPI igre: % čekiranih koji uđu u igru · match rate · completion rate (potvrde/parovi)
· vreme od para do potvrde · report rate (mora ~0).

---

## 5 · TEHNIČKI PREGLED

- **UI:** `src/os/OSDareWheel.tsx` (tri taba: TOČAK | ŠIFRA | EKIPE; 8s poll na status).
  Ulazi: venue sheet kartica + Quest hub kartica.
- **DB:** `dare_pool` / `dare_pairs` · `crew_dare_optins` / `crew_dare_pairs` — sve RLS deny-all.
- **RPC:** `dare_join/status/confirm/leave` · `crew_dare_join/status/confirm/leave`
  (SECURITY DEFINER, check-in gate kroz `nightlife_date_of`).
- **Migracije:** `20260710180000_sifra_game.sql` · `20260710220000_crew_sifra.sql`.
- E2E: puni SQL ciklusi za obe igre prošli (uklj. proveru da identitet NE curi pre potvrda).

---

## 6 · ROADMAP

1. **QA sa 2 prava uređaja pre B1** (obavezno — u simulaciji viđen fantomski confirm,
   najverovatnije artefakt automatizovanog testiranja; potvrditi ručno).
2. **Chill zona oznaka** po mestu (MESTA tab) — gde se šifre sastavljaju.
3. **Sezonske/tematske šifre** — Nova godina, festival izdanja; sponzorske šifre
   (brend u frazi = premium plasman kroz igru, ne banner).
4. **LLM personalizovane misije** (grant faza, Quest Copilot pattern + obavezna moderacija).
5. **Push** „šifra ti je stigla" (native faza — web čeka otvoren app).
6. Šifra istorija na profilu („sastavljene šifre" kao trofej-zid).

---

*Reference: `SECTION-LOCKS.md` (VENUE — people first), `ECONOMY.md` §2 (progres tipovi),
`AfterBefore_B1_War_Room_TODO.md` §Q7, `TODO.md` (pravac „igra velikih").*
