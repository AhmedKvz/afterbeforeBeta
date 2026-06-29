# AfterBefore — Section Locks

> Zamrznute odluke po sekciji (lead dev + PM + korisnik audit). Lock = šta sekcija JESTE, šta NIJE, koji zakon Ustava služi. Menja se samo svesno, ne ad-hoc.
> Ustav: `AfterBefore-Istina-i-Zakoni.md`. Status sekcija: 🔒 locked · 🟡 u radu · ⬜ čeka.

| Sekcija | Status |
|---|---|
| 1 · HOME | 🔒 locked (2026-06-27) |
| 2 · HEAT | ⬜ |
| 3 · CHAT | ⬜ |
| 4 · QUEST | ⬜ |
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

### Build (vs trenutno stanje)
- Trenutni OS Home je RA feed + railovi (realno) sa **mock energijom** — najjeftiniji wedge: `Za tebe | Sve` tabovi + **live stanje + realna energetska kartica** (koristi Dance Floor agregat = podatak koji već imamo i niko drugi nema).
- **Faza 2 (deferred):** real energy agregat → ubije mock; time-aware Home (Pon–Sre recap/vote, Pet–Sub live); „tvoja ekipa" rail; intel sloj (Reddit-killer + turist monetizacija); recap kao stalni sloj.
