# HANDOFF → OPUS: „LJUDI" — upoznavanje odvojeno od check-ina (1na1 + Ekipa)

> Od: Fable (odluke/spec) · Za: Opus (izvršenje) · Datum: 2026-08-03
> Founder odluke: (1) upoznavanje se odvaja od live check-ina, aktivno celu
> nedelju; (2) 1na1 (singles, like/dislike) + Ekipa (crew) kao dva moda;
> (3) **SVE JE FREE — monetizacija se NE radi sada, nigde** (nema boost,
> nema premium, nema „ko te lajkovao" — ni traga od naplate u UI/DB).
> Kill-switch flag obavezan. Freeze 11.08 — ovo je flag-gated v1.

## 0 · Doktrina (ne krši se)

- **Kartica = pasoš, ne selfie.** Deck kartica pokazuje verifikovan noćni
  identitet: taste line, žanr čipovi, top mesta iz PRAVIH check-inova, i
  ubica-signal: **„Bili ste iste noći u {mesto} · {datum}"** (co-presence).
  Nikad ne izmišljaj podatke — ako nema noći, nema tog reda (pošten broj).
- **Svaki match gura ka noći.** Posle matcha CTA: „Vidimo se u petak?
  Sastavite rutu." → dugme vodi u chat (postojeći) sa pre-popunjenom prvom
  porukom predlogom (samo placeholder u inputu, ne auto-slanje).
- **Opt-in, default OFF.** Niko nije u decku dok se sam ne uključi; mod se
  gasi jednim tapom i odmah nestaje iz decka. Ghost/privatnost netaknuti.
- Bez sirovih brojeva bodova na karticama (bez REP/AFC/XP).

## 1 · Migracija `202608031X0000_meet.sql` (Management API, ab-ship §1)

1. `profiles`: `ADD COLUMN IF NOT EXISTS open_dates boolean NOT NULL DEFAULT false,
   ADD COLUMN IF NOT EXISTS open_crew boolean NOT NULL DEFAULT false;`
2. `app_settings`: `meet_enabled` = 'true' (kill-switch; RPC-jevi ga čitaju,
   DISABLED greška kad je off).
3. Tabela `meet_swipes (from_user uuid, to_user uuid, mode text CHECK (mode IN ('dates','crew')),
   liked boolean NOT NULL, created_at timestamptz DEFAULT now(),
   PRIMARY KEY (from_user, to_user, mode))`. RLS deny-all.
4. RPC `get_meet_deck(p_mode text)` — SECURITY DEFINER, search_path=public:
   - gate: auth; flag; JA moram biti opted-in za taj mod (`NOT_OPTED_IN`).
   - kandidati: opted-in za isti mod, nisam ih već swipe-ovao u tom modu,
     nisu ja, imaju display_name; isključi postojeće matcheve (proveri kako
     se zove postojeća match/spark struktura i isključi već-mutual parove).
   - polja po kandidatu: user_id, display_name, avatar_url, cover_url, bio,
     city, music_preferences, `top_venues` (do 3 imena po broju check-inova),
     `nights` (broj različitih noći — nightlife_date logika),
     `shared_venues` (broj zajedničkih mesta sa mnom, lifetime),
     `together` (broj noći kad smo bili na ISTOM mestu ISTE noći) i
     `together_last` (mesto + datum poslednje takve noći, ili NULL).
   - redosled: together DESC, preklapanje žanrova DESC, poslednja aktivnost
     DESC. LIMIT 15.
5. RPC `meet_swipe(p_to uuid, p_mode text, p_like boolean)`:
   - gate: auth, flag, opt-in, p_to ≠ ja, target opted-in.
   - rate limit: max 50 swipe-ova / 24h po modu → `LIMIT_REACHED`.
   - upsert u meet_swipes (dozvoli promenu dislike→like).
   - ako p_like i postoji recipročan like → **kreiraj match kroz POSTOJEĆU
     infrastrukturu** (isti put kao mutual iskra: šta god pravi thread u
     PORUKE danas — nađi i pozovi to; NE praviti paralelni chat sistem).
     Vrati `{matched: true, partner: {...}}`, inače `{matched: false}`.
6. E2E u rollback DO bloku (set_config jwt sub pattern): 2 test usera,
   opt-in oba, like oba smera → match postoji, deck ga više ne vraća,
   rate-limit test; RAISE EXCEPTION na kraju (rollback). Nikakav test
   podatak ne sme ostati u prod bazi.

## 2 · Klijent

1. **GRAD dobija 4. pilulu: `Lista | Karta | Misije | Ljudi`** (red pilula
   postaje horizontalno skrolabilan ako ne staje na 375px). `ab-grad-view`
   event već postoji — dodaj 'ljudi'.
2. Novi fajl `src/os/OSMeet.tsx` + hook `src/hooks/useMeet.ts`:
   - **Nije opted-in** → objašnjenje + 2 prekidača:
     „1 NA 1 · Upoznaj nekoga sa scene" i „EKIPA · Nađi s kim se izlazi",
     copy: *„Vidljiv/a si samo onima koji su se isto uključili. Isključi kad
     hoćeš."* (profiles update open_dates/open_crew).
   - **Opted-in** → mode switch (1 na 1 | Ekipa) + deck: JEDNA kartica u
     fokusu (ne beskonačni feed): cover/avatar hero, ime, city, taste čipovi,
     TOP MESTA (mono), i ako postoji: acid red **„BILI STE ISTE NOĆI U
     {X} · {datum}"**. Dugmad: ✕ (levo) i ✦ Iskra (desno), min 48px,
     os-press; sledeća kartica os-swap animacijom. Bez gesture biblioteka.
   - Match → postojeći match momenat (isti kao mutual iskra danas — ako
     postoji modal/toast, koristi ga) + CTA „Piši — dogovorite petak".
   - Prazan deck → *„To je cela scena za sada. Pozovi ekipu — deck raste."*
     + share dugme (postojeći referral share).
   - Ekipa mod v1: isti deck/mehanika nad open_crew poolom + na vrhu tihi
     ulaz u postojeći „Nađi ekipu" (OSCrew) ako je korisnik čekiran.
3. JA (pasoš): u Podešavanja kutiju dodaj red „Upoznavanje" → vodi na
   GRAD → Ljudi (dispatch os-go + ab-grad-view). NE dodavati deck na JA.
4. LEVEL gate NE važi ovde (nije skriveno mesto). Check-in NIJE uslov.
5. Buster: bump SAMO ako menjaš oblik postojećih query-ja (novi ključevi ne
   traže bump).

## 3 · QA (08–09.08, 2 telefona) — dopiši u War Room PLAN „IA v2" sekciju

- Opt-in na A, ne vidi se na B dok se B ne uključi; opt-out → nestaje odmah.
- Like A→B pa B→A → match na OBA, thread radi u PORUKE.
- Dislike ne pravi match; promena dislike→like radi.
- Rate limit 50 → LIMIT_REACHED poruka.
- `meet_enabled` off → ceo Ljudi tab pokazuje „Uskoro" (flag-gated).
- Co-presence red se pokazuje SAMO kad postoji stvarna zajednička noć.

## 4 · Proces

- ab-ship runbook: migracija preko Management API ($SBP_TOKEN u shell
  sesiji, nikad u fajl/commit); typecheck; build mirror; push na main;
  proveri live bundle. cwd se resetuje — uvek apsolutne putanje.
- Posle shipa: dopiši HANDOFF-FABLE (odstupanja + šta si našao usput).
- NE diraj: ekonomiju/ledger, venue sheet, postojeću ŠIFRU, geofence,
  landing, pasoš (OSProfile) osim reda u Podešavanjima.
