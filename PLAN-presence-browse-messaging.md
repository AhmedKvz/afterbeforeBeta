# Plan: Prisustvo · Browse (Hibrid) · Poruke

> Status: **PLAN za pregled** — još se ne gradi. Odluke ispod su zaključane.

## Zaključene odluke
- **Browse unutar venue-a = Hibrid (Opcija C, Hinge + Happn):** avatar rail (scan) → swipe karta (fokus) → „▦ grid" toggle (kad je gužva).
- **Prisustvo = Opt-in + RECIPROČNO:** uvek doprinosiš anonimnom broju („184 ovde"); profil ti se vidi tek kad uključiš **„Prikaži me ovde"**. Ghost po defaultu. **Kad si OFF — ne vidiš ni ti druge** (samo headcount); da listaš ljude, moraš i sam biti vidljiv. Fer, anti-lurker.
- **Poruke = Wave → chat:** 👋 wave može **svako** (otvoreno, bez meča); **bilo koji odgovor** primaoca (uzvratni wave ili poruka) otvara chat; **block** uvek dostupan. Inbox = Matches tab.

---

## 1. Data model (Supabase)

**Nove tabele:**
- `venue_presence` — `id, user_id, venue_name, visible bool default false, last_seen, expires_at`
  - Check-in (GPS) upiše/osveži red; `visible` kontroliše „Prikaži me ovde".
- `conversations` — `id, user_a, user_b, status ('wave'|'active'), initiated_by, last_message_at, created_at`, UNIQUE(par)
- `messages` — `id, conversation_id, sender_id, body, created_at, read_at`
- `blocks` — `id, blocker_id, blocked_id` (bezbednost)

**Postojeće:** `waves`, `swipes`, `matches`, `notifications`, `event_checkins`.

## 2. Privatnost / RLS
- `venue_presence` SELECT: vrati samo redove gde `visible=true` (+ svoj). Headcount „184" = ukupno prisutnih (anonimno, preko RPC-a, ne otkriva identitete).
- **Nikad tačne koordinate** drugima — samo `venue_name`.
- `conversations`/`messages`: čitaju samo učesnici.
- `blocks` se poštuje svuda (presence, browse, poruke).
- Presence **ističe** (`expires_at` / kad GPS pokaže da si otišao).
- GDPR: eksplicitan pristanak za lokaciju, retencija/auto-brisanje presence-a.

## 3. RPC / logika
- `set_venue_visibility(venue, visible)` — toggle „Prikaži me ovde".
- `get_venue_presence(venue)` — uvek vraća `headcount` (svi prisutni, anonimno). Vraća `people[]` (vidljivi, bez koordinata) **samo ako je sam pozivalac vidljiv** na toj lokaciji (recipročno); inače `people = []`.
- `send_wave(target)` — **svako sme** (osim ako je blokiran); nađe/napravi `conversation status='wave'`, notifikacija primaocu.
- `respond_opens_chat` — **bilo koji odgovor primaoca** (uzvratni wave ili prva poruka) prebacuje `status='active'` i otvara chat za oba.
- `send_message(conversation_id, body)` — inicijator može poslati prvu poruku uz wave; pun chat kad je `active`. Block prekida konverzaciju.
- `block_user(target)` — gasi konverzaciju + skriva oba jedno od drugog (presence, browse, poruke).
- Realtime: subscribe na `messages` po konverzaciji; inbox subscribe na `conversations`.
- Match (obostran like) → konverzacija automatski `active`.

## 4. UI

### A) Heat Map „who's here" → Hibrid (Opcija C)
- Access banner (offsite / at-venue / pass) — ostaje.
- **„Prikaži me ovde"** toggle u presence kartici (opt-in) + ghost indikator.
- **Browse hibrid:**
  1. **Avatar rail** (samo `visible` ljudi) — tap → otvara fokus.
  2. **Swipe karta** (jedna osoba): ✕ pass · ❤️ like · 👋 wave.
  3. **„▦ Grid"** toggle → pun mozaik (Happn-stil) vidljivih; tap pločice → fokus.
- Headcount „184 ovde" = ukupno (anonimno); vidljivi profili su podskup.
- ❤️ like → swipe; obostrano = match. 👋 wave → intro → chat.

### B) Matches tab = Inbox
- Dve sekcije: **„Pozdravi"** (wave requests) + **„Razgovori"** (aktivni).
- Red → chat view (bubble poruke, composer, realtime).
- Unread badge na tabu + notifikacije (zvono).
- Chat se otvara i iz „who's here" (tapneš osobu sa kojom imaš konverzaciju).

### C) Notifikacije
- Nov wave → notifikacija + zvono.
- Nova poruka → notifikacija + unread badge. (Kasnije native push na mobilnom.)

## 5. Tok (korak po korak)
1. **Otkrivanje:** Heat Map → check-in (GPS) → uključi „Prikaži me ovde" → browse hibrid → ❤️/👋.
2. **Wave→chat:** A pošalje 👋 B → B notif → B otvori „Pozdravi" → uzvrati/odgovori → konverzacija `active` → chat.
3. **Match:** obostran like → match → konverzacija auto-`active` → chat.

## 6. Faze gradnje (kad krenemo)
1. **Prisustvo opt-in** — `venue_presence` + toggle + anonimni headcount + read za browse.
2. **Hibrid browse UI** — rail + swipe + grid toggle (zamena trenutne pretrpane liste).
3. **Poruke** — `conversations`/`messages` + wave→chat + inbox (Matches) + chat + realtime + notifikacije.
4. **Bezbednost** — block/report.

## 7. Otvorena pitanja (pre gradnje)
1. ✅ **REŠENO:** wave može svako (otvoreno); bilo koji odgovor primaoca otvara chat; block uvek dostupan.
2. ✅ **REŠENO:** tačan headcount (npr. „184 ovde").
3. ✅ **REŠENO:** recipročno — kad si OFF nevidljiv si SVIMA (i mečevima) i **ne vidiš ni ti druge** (samo headcount). Da listaš, uključi „Prikaži me ovde".
4. ✅ **REŠENO:** fotke obavezne — preko **upload-a** + **Instagram connect**. Avatar rail (krugovi) **duplira se kao Story** (efemerni sadržaj vezan za noć/venue).
   - ⚠️ Napomena: Instagram „Basic Display" API (auto-povlačenje fotki) je Meta ugasila kraj 2024. Realno: **direktan upload je primarni**; IG connect za handle/verifikaciju + ručni izbor fotki. Auto-import fotki sa IG-a više nije pouzdan.
5. ✅ **REŠENO:** u rail/grid idu **svi vidljivi** (bez filtera u v1; filteri kasnije).

## 8. Story (dodato uz #4)
- Avatar krugovi u railu = i **Story** ulaz (kao IG): efemerna objava (foto/tekst) vezana za venue/noć, ističe za 24h.
- Tabela `stories` (user_id, venue_name?, media_url, created_at, expires_at) + view tracking.
- Tap na krug → otvara story; ako nema story → otvara profil/fokus.
