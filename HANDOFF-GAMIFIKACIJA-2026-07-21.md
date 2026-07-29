# HANDOFF → OPUS: Gamifikacija v2 — TELO JE KONTROLER (PRE B1)

> Odluka: SECTION-LOCKS §11.5 (izmena 2026-07-21: sve PRE B1). Radi se POSLE
> HANDOFF-GRAD-ORB faza 1–4 (hub večeri mora postojati — mehanike žive u njemu).
> Konvencije: migracija u `supabase/migrations/` + apply kroz /ab-ship (SBP_TOKEN
> u shellu) · SECURITY DEFINER + `SET search_path = public` · RLS deny-all, sve
> kroz RPC · `const db = supabase as any` · SQL E2E simulacija JWT-om
> (`set_config('request.jwt.claims', ...)`) u rollback DO bloku pre klijenta.
> Noć = `nightlife_date_of(ts)` (postoji). Svi AFC krediti idu kroz afc_ledger
> + profiles.spendable_xp (šablon: claim_quest / moderate_roadmap).
> ROK: build 08.08 · 2-device QA 08–09.08 · freeze 11.08. Šta ne prođe QA →
> app_settings flag OFF za B1.

## M1 · IRL STREAK (dijadni co-presence streak) — bez novih tabela

**Pravilo:** par postoji SAMO između mutuala (obostrana iskra, isti crew, ili
završena ŠIFRA) — nikad random stranci (consent: veza već postoji). Jedinica =
ISO nedelja; streak raste ako par ima ≥1 zajedničku noć te nedelje (oba imaju
venue_checkins na ISTOM mestu iste nightlife noći). Prekid = propuštena nedelja.
Bez ekonomije u v1 — čist socijalni trofej (nula rizika po fond).

**RPC `get_irl_streaks()` → json[]** (computed, bez upisa):
1. Mutuali: `sparks` status='mutual' ∪ `crew_members` (isti crew) ∪ `dare_pairs`
   completed — DISTINCT partner user_id + display_name.
2. Za svaki par: zajedničke noći = join venue_checkins po (venue_id,
   nightlife_date_of(created_at)) za oba; grupiši po ISO nedelji; izračunaj
   trenutni uzastopni niz do tekuće nedelje (tekuća nedelja bez zajedničke noći
   NE prekida dok se ne završi).
3. Vrati: partner_id, partner_name, streak_weeks, last_night, last_venue.
   Limit 10 parova, sortirano po streak_weeks desc. Prazno = [].

**UI:** HUB VEČERI sekcija „🔥 TVOJI LJUDI" (parovi sa streak≥1: „ti i Mila —
3 vikenda zaredom") + JA profil red ispod statova (top streak). Ako je partner
večeras čekiran na istom mestu → chip „večeras zajedno ✓" (podatak već u RPC).

## M2 · KONVERGENCIJA (raid drop na mestu)

**Migracija `convergence_drops`:** id uuid pk · venue_id uuid NOT NULL ·
title text · reward_label text (šta se fizički dobija — venue/sponzor puni,
ECONOMY §13 redosled) · afc_bonus int default 50 · capacity int NOT NULL ·
starts_at/ends_at timestamptz · status text default 'scheduled'
(scheduled|live|done|cancelled) · created_by uuid. RLS deny-all.
**`convergence_claims`:** drop_id+user_id pk, claimed_at. RLS deny-all.

**RPC-jevi:**
- `get_convergences()` — javno (auth): drops gde ends_at > now()-2h, sa venue
  imenom, claimed count, my_claimed bool, i `is_live` (now() ∈ [starts,ends]).
- `claim_convergence(p_drop)` — gate lanac: drop live · claims < capacity ·
  korisnik ima venue_checkins na TOM venue u zadnjih 12h (isti EXISTS kao
  presence gate) · nije već claim-ovao. Prolaz → insert claim + afc_bonus kroz
  ledger (reason 'convergence', ref drop id, balance_after) + return pozicija
  („#7 od 30"). Sve greške parsabilne: DROP_NOT_LIVE / FULL / CHECKIN_REQUIRED /
  ALREADY.
- `create_convergence(...)` / `cancel_convergence(id)` — `_is_founder()` gate.

**UI:** GRAD feed kartica (hot boja, countdown do starts_at, „prvih {capacity}",
posle starta „LIVE · {claimed}/{capacity}") + hub dugme „PREUZMI" kad si na tom
mestu. War Room DOGAĐAJI tab dobija mini formu (title/venue select/reward/
capacity/vreme) → create_convergence. Founder-only.

## M3 · GRADSKA ŠIFRA (jedna zagonetka po noći, fragmenti po mestima)

**Migracija `city_ciphers`:** id · night date NOT NULL UNIQUE · phrase text
(original za prikaz) · phrase_norm text (lower, bez dijakritike — normalizuj u
SQL funkciji `_norm(text)`: lower + translate šđčćž→sdccz) · fragments jsonb
`[{venue_id, word}]` (3–5) · reward_afc int default 150 · status
(draft|live|done). **`cipher_completions`:** cipher_id+user_id pk, completed_at.
RLS deny-all.

**RPC-jevi:**
- `cipher_status()` — za live cipher večerašnje noći: moji fragmenti = reči čiji
  venue_id ∈ (moji check-ini te noći ∪ check-ini SVIH članova mog crew-a te
  noći — crew pooling je poenta: ekipa se deli po gradu). Vrati: total_fragments,
  collected [{word, venue_name}], completed bool, reward_afc. Bez live ciphera →
  {active:false}.
- `cipher_submit(p_phrase)` — gate: live cipher · imam ≥1 svoj check-in te noći ·
  nisam završio. `_norm(p_phrase) = phrase_norm` → completion + reward_afc kroz
  ledger (reason 'cipher') + json {ok}. Pogrešno → {ok:false, hint: broj
  sakupljenih}. Rate limit: max 10 pokušaja/noć (brojač u completions? ne —
  poseban count preko posebne male tabele NIJE potreban: čuvaj attempts int u
  cipher_completions redu koji se kreira na prvi submit sa completed_at NULL).
- `create_cipher(night, phrase, fragments, reward)` — founder.

**UI:** GRAD kartica kad je cipher live („🔐 GRADSKA ŠIFRA · {collected}/{total}
fragmenata · tvoja ekipa zna više") + hub sekcija: sakupljene reči kao mono
pilule + input za pokušaj + „fragmenti čekaju na {N} mesta" (bez imena mesta —
mapa i kretanje su igra). War Room forma za kreiranje (venue picker po
fragmentu). Founder-only kreacija.

## Redosled builda + QA
1. M2 Konvergencija (najprostija, odmah testabilna solo)
2. M1 IRL streak (computed, bez rizika)
3. M3 Gradska šifra (najsloženija — crew pooling)
4. SQL E2E za sva tri (rollback DO blokovi: happy + svaki gate) PRE klijenta.
5. 2-device QA checklist u war_tasks (sekcija „IA v2"): konvergencija claim race
   (2 telefona, capacity 1) · šifra crew pooling · streak prikaz za pravi par.
6. app_settings flagovi: `convergence_enabled`, `cipher_enabled` (default true;
   kill-switch za B1 ako QA padne). get_* RPC-jevi ih čitaju.

## NE DIRAJ / OGRADE
Postojeću ŠIFRU (dare_*) ne diraš — gradska je NOVA mehanika pored nje ·
isplate ≤ fond: afc_bonus/reward_afc su interni poeni, fizičke nagrade samo kroz
postojeći redemption · bez GPS trail čuvanja · poruke/consent: streak samo
mutuali · pošteni brojevi (claimed count = istina).
