# AfterBefore — TODO (živi backlog)

> **Pravilo:** ovaj fajl se ažurira uz svaki radni blok — šta je urađeno izlazi, šta je odlučeno ulazi.
> Otvara se iz War Room → DOCS. Poslednje ažuriranje: **2026-07-13**.

---

## 🔥 SLEDEĆE — akcije koje otključavaju sve ostalo

1. **[FOUNDER] Unesi vikend program** — War Room → DOGAĐAJI (forma ili „⚡ Zalepi vikend").
   Sve je spremno i čeka sadržaj: Home kartice → pun sheet (check-in/Idem/ekipa rade),
   onboarding korak 4 nudi prave evente, „ko ide" brojevi kreću. **Bez ovoga je app pozornica bez predstave.**
2. **[FOUNDER] Prođi MESTA tab** — proveri/dotegni koordinate novih 14 mesta; dodaj festivale ako želiš (tip 🎪 postoji).
3. **[DEV] #46 · Grant paket** — evaluator demo nalog + EN walkthrough. App je vizuelno spreman; ovo je poslednji korak ka Smart Start prijavi.

## 🛠 DEV BACKLOG (po prioritetu)

- **#49 · „Ko ide" crew signal** — Idem → vidiš ko još ide → ekipa se formira (nadovezuje se na people-first sheet).
- **Talas 2 · „Živi Home"** — time-aware hero (3 stanja: sprema se / večeras / gori), 4-blok disciplina, **RECAP motor** iz pravih check-in/dance podataka, kontekstualni Lucky100+glasanje. ⚠️ Graditi TEK kad ima sadržaja/korisnika — inače pokazuje praznu tišinu.
- **#41 · ČET quest-drop ritual** — nedeljni ritam objave questova (četvrtak).
- **#50 · Nađi ekipu v2** — safety (ženski crew), auto-match po Idem/check-in, Quest-hub ulaz.
- **Scout rola** — reputation-gated najavljivanje evenata (klaberi sa statusom pune program umesto tebe; founder approve queue). Dugoročno rešenje content pipeline-a.
- **REP/AFC pun jezički pass** — ostatak „XP" stringova u UI (quest hub brojevi itd.).
- **Landing v3 dovršetak** — flywheel vizual u #ekonomija + Fond scene blok (osnova shipovana; fino podešavanje uz grant paket).
- **#43 · Pravni template kampanja + Jungle pitch.**
- **#20 · Feature-voting board** (Z11/Z12).

## 🔴 PRE-LAUNCH DUG (mora pre paljenja geofence-a / javnog launcha)

- **#57 · Geofence fix** — server čita venue radius (ne hardkodovanih 50m), klijent prag = server prag, poruka „priđi bliže — Xm".
- **`venue_intent` privacy** — world-readable user_id → agregat RPC.
- **Crew chat 🚩 Prijavi** — jedini interakcioni prostor bez report-a.
- **Media bucket size/mime cap** (kampanje/story upload).
- **`account_type` eskalacija** — set_account_type RPC + verify_redemption fallback.
- **Koordinate na terenu** — GPS provera za ~19 seedovanih mesta (Savamala 5 + full-scene 14) pre geofence-a.
- Dance score plausibility cap (pre prvih native nagrada).

## 🅾️ U OPCIJI (dostupno, čeka odluku/dogovor — ništa se ne gradi bez tebe)

- **„Make us famous"** — šablon spreman u QUESTOVI → SPONSORED → + NOVI → 🎬 dugme.
  Aktiviraš kad imaš dogovor (klub/restoran/kafić): upiši partnera → AKTIVAN. Nagrada: večera za pobednika i ekipu iz videa.
- **Sponzorisani questovi** — forma živa; čeka potpisane partnere (PARTNERS.md Prsten 1).
- **Reebok nedeljni dance leaderboard** — dizajn spreman (DANCE_FLOOR_STRATEGY §6); čeka native fazu + sponzora.
- **Festivali na Heat-u** — tip + filter postoje; dodaješ mesta kroz MESTA tab.
- **Klejm mesta** — kartica živa na svakom venue sheet-u; klubovi se sami prijavljuju, ti verifikuješ (claim_status u MESTA tabu).
- **Venue self-serve ŽIV** — svako registrovano mesto objavljuje događaje iz dashboarda (auto-upis u imenik), postavlja IG + cover + lokaciju; ti zadržavaš edit/delete u War Room. Verifikacija (✓) ostaje tvoja odluka po mestu.
- **Home date-filter** (HANDOFF §4.4) — uključiti kad prvi pravi vikend bude unet (sad bi ispraznio Home).
- **AI Intelligence Layer** (Night Guide, Quest Copilot, Scene Summary) — kanon: `AfterBefore_AI_Intelligence_Layer_Claude_Brief.md`; podaci se već skupljaju (onboarding prefs). Grant faza.
- **Push notifikacije (#18)** — native/Capacitor faza (grant M1–3).

## 📦 NATIVE / CAPACITOR FAZA (posle granta)

- #51 Dance meter auto-start na check-in (background, bez dijaloga) + sponzorske nagrade samo za native sesije.
- Push notifikacije · pun mutation outbox (preživi reload) · geofence ON.

## ✅ Nedavno završeno (kontekst — puna istorija u git logu)

ECONOMY §11 Economic Engine + §11.8 Fond scene · Landing „poziv sceni“ (hero + PRILIKA manifest, SR+EN) · Ultra-review talasi A–E (perf/čišćenje/realtime/PWA) · economy lockdown · War Room DOGAĐAJI + MESTA admini · imenik 44 mesta · onboarding v2 (muzika→crew→vikend) · LOCK audit svih 9 sekcija · dizajn polish + responsive + „Pun ulaz" Home pass · legacy /venue penzionisan · Make-us-famous šablon · Festivali tip.
