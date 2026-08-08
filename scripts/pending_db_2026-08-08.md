# Pending DB radovi — ✅ IZVRŠENO 2026-08-08 (svež token)

Koraci 1–4 primenjeni i verifikovani; korak 5 (prvi umetnici) čeka founderov
izbor imena. Ispod je originalni plan radi zapisa.

# Pending DB radovi — čekaju svež SBP_TOKEN (2026-08-08)

Management token je istekao (401). Kad se osveži
(https://supabase.com/dashboard/account/tokens → `export SBP_TOKEN=sbp_...`
u shell, ili u `~/.zshenv`), redom:

## 1 · SCENA migracija (kod je već live i čeka tabele)

```bash
cd /Users/macbook/Desktop/AfterBeforer/afterbeforeBeta
SQL=$(cat supabase/migrations/20260808120000_scena_artists.sql)
curl -s -X POST "https://api.supabase.com/v1/projects/aptahdctlvrhmrhpaccs/database/query" \
  -H "Authorization: Bearer $SBP_TOKEN" -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0" -d "$(jq -Rs '{query: .}' <<< "$SQL")"
```

## 2 · Landing pilot polja (pa tek onda landing forma šalje nova polja)

```bash
SQL=$(cat supabase/migrations/20260808150000_landing_pilot_fields.sql)
curl -s -X POST "https://api.supabase.com/v1/projects/aptahdctlvrhmrhpaccs/database/query" \
  -H "Authorization: Bearer $SBP_TOKEN" -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0" -d "$(jq -Rs '{query: .}' <<< "$SQL")"
```

Napomena: trenutna landing v4 nema pilot polja u formi (v3 ih je imala) —
kad migracija legne, odluka je da li vraćamo proširenu pilot formu na
landing ili polja skupljamo kroz razgovor. RPC podržava oba.

## 3 · QA čišćenje (jednokratno — NE ide u migrations/)

```bash
SQL=$(cat scripts/cleanup_qa_2026-08-08.sql)
curl -s -X POST "https://api.supabase.com/v1/projects/aptahdctlvrhmrhpaccs/database/query" \
  -H "Authorization: Bearer $SBP_TOKEN" -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0" -d "$(jq -Rs '{query: .}' <<< "$SQL")"
```

## 4 · Pair-mode rušenje (klijent je očišćen u 38c071d+)

Tabele `meet_pairs`/`pair_swipes` + 6 pair RPC-jeva su bez klijenta.
Pre DROP-a proveriti da su prazne (bilo je 0 redova 2026-08-03).

## 5 · Prvi umetnici (kad ih founder izabere)

```sql
UPDATE public.profiles SET account_type='artist', artist_type='dj', is_ambassador=true
WHERE user_id = '<uuid>';
INSERT INTO public.event_artists (event_id, artist_id) VALUES ('<event-uuid>', '<user-uuid>');
```
