# AfterBefore — TODO (živi backlog)

> **Pravilo:** ovaj fajl se ažurira uz svaki radni blok — šta je urađeno izlazi, šta je odlučeno ulazi.
> Otvara se iz War Room → DOCS. Poslednje ažuriranje: **2026-07-19**.

---

## 🔥 SLEDEĆE — akcije koje otključavaju sve ostalo

0. **[FOUNDER] B1 pilot odluke** — ✅ DATUM: **18.08.2026** (⚠️ utorak — potvrdi da li namerno) · scope presuda za 3 feature rupe (vibe tags / artist vote / badge — graditi ili seći PRE freeze-a) · mapiranje nagrada na REP/AFC · PM engagement model · OnlyClubbing ponuda. Board: War Room → PLAN (588 taskova čeka).

1. **[FOUNDER] Unesi vikend program** — War Room → DOGAĐAJI (forma ili „⚡ Zalepi vikend").
   Sve je spremno i čeka sadržaj: Home kartice → pun sheet (check-in/Idem/ekipa rade),
   onboarding korak 4 nudi prave evente, „ko ide" brojevi kreću. **Bez ovoga je app pozornica bez predstave.**
2. **[FOUNDER] Prođi MESTA tab** — proveri/dotegni koordinate novih 14 mesta; dodaj festivale ako želiš (tip 🎪 postoji).
3. ✅ **#46 · Grant paket** (2026-07-19) — evaluator nalog `evaluator@afterbefore.rs` (login verifikovan) + `GRANT-EVALUATOR-WALKTHROUGH.md` (EN tura, 10 min). Ostaje founder deo: EN prijava + 3-min video sa timom.

## 🎮 PRAVAC: IGRA VELIKIH (founder odluka 2026-07-13 — „definitivno idemo u ovom pravcu")

Noć kao igra uživo — app izaziva, grad je tabla, ljudi su potezi. Temelj postavljen:
🎲 Točak (smele misije) + 🔐 ŠIFRA (upareni susreti, co-presence + obostrani pristanak).
**Sledeći potezi ovog pravca (redom):**
1. ŠIFRA QA sa 2 uređaja → pa ŠIFRA na B1 kao Q7 „Meet the Scene"
2. ✅ Crew šifra ŽIVA (dva čina: reči po članovima → ekipa traži ekipu; obavezno u B1 QA sa 2 uređaja)
3. LLM personalizovane misije (grant faza, Quest Copilot pattern + moderacija)
4. Venue „chill zona" oznaka u MESTA tabu (gde se igra sastavlja)

## 🛠 DEV BACKLOG (po prioritetu)

- **#49 · „Ko ide" crew signal** — Idem → vidiš ko još ide → ekipa se formira (nadovezuje se na people-first sheet).
- **Talas 2 · „Živi Home"** — time-aware hero (3 stanja: sprema se / večeras / gori), 4-blok disciplina, **RECAP motor** iz pravih check-in/dance podataka, kontekstualni Lucky100+glasanje. ⚠️ Graditi TEK kad ima sadržaja/korisnika — inače pokazuje praznu tišinu.
- **#41 · ČET quest-drop ritual** — nedeljni ritam objave questova (četvrtak).
- **#50 · Nađi ekipu v2** — safety (ženski crew), auto-match po Idem/check-in, Quest-hub ulaz.
- **Scout rola** — reputation-gated najavljivanje evenata (klaberi sa statusom pune program umesto tebe; founder approve queue). Dugoročno rešenje content pipeline-a.
- **REP/AFC pun jezički pass** — ostatak „XP" stringova u UI (quest hub brojevi itd.).
- **Kanon migracija ekrana** — ✅ Quests + ✅ Home + ✅ Venue sheet + ✅ Heat shipovani 2026-07-19 (AB tokeni u osTheme; Heat: mapa hero + glass pilule + puls samo gde ima ljudi). Ostalo: Profile → Matches (§9 promptovi u AFTERBEFORE_DESIGN.md).
- **Motion audit — ostatak** (report: `motion-audits/afterbefore-2026-07-19.html`): ✅ shipovano 2026-07-19: os-screen enter, overlay enter/exit (sheet+točak+dance+crew+kampanja), reduced-motion gate za spin, os-press na CTA, pulse čišćenje (10→liveonly), tab crossfade (Home lens + točak modovi), +REP float na check-in, šifra/dare stamp beat. Ostalo: Explore/WarRoom tab crossfade, landing CTA hover ring, per-genre burst na check-in.
- **Landing v3 dovršetak** — flywheel vizual u #ekonomija + Fond scene blok (osnova shipovana; fino podešavanje uz grant paket).
- **#43 · Pravni template kampanja + Jungle pitch.**
- **#20 · Feature-voting board** (Z11/Z12).

## 🔴 PRE-LAUNCH DUG (mora pre paljenja geofence-a / javnog launcha)

- **ŠIFRA QA pre B1** — test sa DVA prava uređaja (ceo tok: join→match→potvrde→reveal); u simulaciji viđen fantomski dare_confirm (verovatno artefakt automatizovanog testiranja, ali potvrditi ručno pre pilota).
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
- **War Room v2 ŽIV** — PLAN tab: timski task board u bazi (588 B1 taskova, statusi/vlasnici/pretraga), war_members pristup za PM/mentora (+ ČLAN po email-u), START-OVDE onboarding. Sledeća faza: migracija CILJEVI/MEETINGS/GRANT iz localStorage u bazu.
- **Venue self-serve ŽIV** — svako registrovano mesto objavljuje događaje iz dashboarda (auto-upis u imenik), postavlja IG + cover + lokaciju; ti zadržavaš edit/delete u War Room. Verifikacija (✓) ostaje tvoja odluka po mestu.
- **Home date-filter** (HANDOFF §4.4) — uključiti kad prvi pravi vikend bude unet (sad bi ispraznio Home).
- **Higgsfield AI produkcijski sloj (POSLE BETE)** — pun brainstorm: `BRAINSTORM-AI-PRODUKCIJA.md` (19 ideja × filteri; V1 auto-poster + K2 AFC-sink kao radna teza).
- **AI Intelligence Layer** (Night Guide, Quest Copilot, Scene Summary) — kanon: `AfterBefore_AI_Intelligence_Layer_Claude_Brief.md`; podaci se već skupljaju (onboarding prefs). Grant faza.
- **Push notifikacije (#18)** — native/Capacitor faza (grant M1–3).

## 📦 NATIVE / CAPACITOR FAZA (posle granta)

- #51 Dance meter auto-start na check-in (background, bez dijaloga) + sponzorske nagrade samo za native sesije.
- Push notifikacije · pun mutation outbox (preživi reload) · geofence ON.

## ✅ Nedavno završeno (kontekst — puna istorija u git logu)

ECONOMY §11 Economic Engine + §11.8 Fond scene · 🔐🔐 Crew Šifra (ekipa traži ekipu) · 🔐 ŠIFRA (igra uparivanja: opt-in → algoritam → pola šifre svakom → chill zona → obostrana potvrda; B1 Q7 kandidat) · 🎲 Zavrti noć (dare wheel — venue sheet + quest hub) · Landing „poziv sceni“ (hero + PRILIKA manifest, SR+EN) · Ultra-review talasi A–E (perf/čišćenje/realtime/PWA) · economy lockdown · War Room DOGAĐAJI + MESTA admini · imenik 44 mesta · onboarding v2 (muzika→crew→vikend) · LOCK audit svih 9 sekcija · dizajn polish + responsive + „Pun ulaz" Home pass · legacy /venue penzionisan · Make-us-famous šablon · Festivali tip.
