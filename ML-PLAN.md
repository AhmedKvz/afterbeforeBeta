# AfterBefore — Real ML plan (grant deliverable, 2026-08-08)

Cilj granta: tri ML sistema na REALNIM podacima koje app već skuplja.
Princip: **poštena skala** — na 30–2.000 korisnika klasičan ML + statistika
pobeđuju deep learning; svaki model ima glupu-ali-jaku baseline verziju koja
radi od prvog dana i „pametnu" verziju u koju uraste kad podaci stignu.

## 0. Šta već imamo (temelj — bez ovoga ML ne postoji)

- **Label pipeline već radi:** analitički levak `event_viewed → going_clicked
  (idem) → check_in (GPS-verifikovan) → review/vibe` = implicitni signali
  interesovanja SA verifikovanim ishodom. Ovo je zlato: većina appova ima
  klikove, mi imamo POTVRĐEN dolazak (ground truth koji se ne može lažirati).
- Onboarding (žanrovi, crew intent, fav venues), check-in istorija, „Idem"
  signali, recenzije + vibe tagovi, quest completion, grupe, set times.
- Supabase Postgres → **pgvector + pg_cron su built-in ekstenzije** (samo se
  uključe, nema nove infrastrukture).

## 1. Preporuke — „Za tebe večeras" (M1–M4)

**Baseline (radi odmah, dan 1):** skor = w1·žanr-poklapanje (onboarding ∩
event žanr) + w2·istorija (bio si u tom prostoru / kod tog umetnika) +
w3·socijalno (tvoja ekipa / follow ide) + w4·momentum (idem-signali rastu) −
w5·udaljenost. Čist SQL view, objašnjiv evaluatoru i korisniku
(„zato što slušaš techno i M. ide").

**ML verzija (M3–M4):** implicit-feedback matrix factorization (ALS) nad
matricom korisnik×(venue/umetnik/žanr); event-viewed=0.2, idem=1, check-in=3,
pozitivna recenzija=4. Embeddinzi (64d) u **pgvector**; preporuka = cosine
najbliži događaji večeras. Trening: noćni Python job (jedan mali worker,
Cloud Run/Railway — grant-eligible trošak), upis nazad u Postgres; serviranje
= običan RPC nad prekomputiranim skorovima (0 latencije, 0 GPU).

**Evaluacija:** offline recall@5 na held-out check-inovima; online A/B kroz
postojeći levak — konverzija `rec_shown → going_clicked → check_in` vs
baseline. Metrika uspeha za grant: ML digne konverziju levka ≥20% nad baseline.

## 2. Predikcija gužve — „koliko će biti živo" (M3–M6)

**Baseline (radi na 30 korisnika):** beta-binomial konverzija idem→dolazak
po prostoru (Bayes smoothing — malo podataka ne pravi lude brojke) ×
idem-signali do tog sata + kriva dolazaka iz prošlih noći. Output: očekivani
broj ljudi + interval („verovatno 25–40 do ponoći").

**ML verzija (M5–M6):** LightGBM regresija po venue×noć: featuri = idem do
sata X, follow umetnika, dan, žanr, istorijska kriva, sezona, vreme
(meteo API). Trenira se istim noćnim jobom. Ovo je direktna vrednost za
**venue dashboard** (staffing, bar zalihe) — B2B ugao koji Fond nagrađuje.

## 3. AI quest assist (M4–M7)

Ovo nije klasičan ML nego LLM sloj: Claude API + naši podaci.
- Input: profil prostora, žanr, prošli questovi + njihov completion rate,
  Z-zakoni kao guardrail checklist.
- Output: 3 predloga misije za vikend → **founder/venue odobrava u War Room-u**
  (human-in-the-loop, ništa ne ide živo bez odobrenja — bitno za prijavu).
- Petlja učenja: completion rate svake misije se vraća u prompt kontekst →
  sledeći predlozi uče šta scena stvarno radi.

## 4. Infra + budžet (grant-eligible)

| Stavka | Šta | Trošak |
|---|---|---|
| Supabase pgvector + pg_cron | embeddinzi, feature tabele, schedule | 0 (postojeći plan) |
| Python ML worker | noćni trening (ALS, LightGBM) | ~10–20 €/mes (Cloud Run/Railway) |
| Claude API | quest assist | potrošnja, ~50 €/mes na pilot skali |
| Meteo API | featur za gužvu | free tier |

Nema GPU, nema MLOps platforme — ceo ML sloj je < 100 €/mes, što u prijavi
pokazuje zrelost („znamo šta je dovoljno"), a plate tima nose posao.

## 5. Privatnost (za prijavu)

Featuri su agregati ponašanja u aplikaciji; lokacija se koristi SAMO kao
potvrda dolaska (ne trajektorije); modeli ne izlaze iz naše baze; prostori
dobijaju predikcije i zbirove, nikad pojedinačne profile. Data minimization
= već postojeći princip, ML ga ne menja.

## 6. Mapa na grant mesece

M1–2 feature store (pg_cron SQL) + baseline preporuke → M3–4 ALS embeddinzi
+ A/B → M3–4 baseline gužva → M5–6 LightGBM gužva + venue dashboard →
M4–7 quest assist → M8–9 evaluacija, izveštaj, KPI validacija.
Svaki milestone ima merljiv izlaz za tranše Fonda.
