# WAR ROOM UPDATE — 2026-07-19 · Master integracija proizvod-ekonomija-rast

> Izvor: founder master prompt 2026-07-19 (6 strateških dokumenata sažetih u njemu).
> Kanon primljen u: `ECONOMY.md` §12–14 · `QUEST.md` §6 · `PARTNERS.md` (Venue Growth
> Network) · `SECTION-LOCKS.md` §10 · `GAPS.md` §8. Ovaj fajl = truth audit, scope
> matrica, War Room taskovi i founder summary.
> ⚠️ 6 izvornih deep-dive MD fajlova NIJE u repou (nisu dostavljeni) — kad stignu,
> commit-uju se kao specifikacije; kanonske odluke su već ovde.

---

## OUTPUT A — Repository Truth Audit

| Odluka / Feature | Dokaz u repou | Status | Konflikt | Akcija | Faza |
|---|---|---|---|---|---|
| 6 kanonskih ekrana u novom vizuelnom jeziku | commits `10be6fc`…`7101f8c` (2026-07-19) | **LIVE** | — | potvrditi u produkciji (P0) | LIVE |
| Profile v2 (cover/avatar/bio/link) + RLS fix putanje | `d68bda0`, `5864964`; migracija `20260719120000` | **LIVE** | — | founder end-test uploada | LIVE |
| ŠIFRA / Crew ŠIFRA | migracije `20260710180000`, `20260710220000`; SQL E2E prošao | **LIVE** (uz uslov) | fantomski confirm u simulaciji | 2-uređaja QA = P0 | B1 |
| War Room DB-backed (war_tasks/war_members) | `20260710140000`, `WarRoomPlan.tsx` | **LIVE** | — | dodati nove sekcije (Output D) | LIVE |
| XP/REP ≠ AFC (ledger) | `claim_quest` RPC kreditira XP+AFC+ledger (`9374dc2`); GAPS F3 zatvoren | **LIVE** | UI još piše „XP" | REP/AFC copy pass (backlog) | LIVE |
| Sponsored questovi (perk + content/MEGA) | trigger `advance_sponsored_on_checkin`; `OSCampaign`; War Room forma | **LIVE** (concierge) | — | Jungle pilot = validacija | B1→MVP |
| Venue self-serve + klejm | `20260710100000`; `VenueSelfServe.tsx`; OSClaimCard | **LIVE** | — | statusne labele iz §12 u MESTA tab | LIVE→MVP |
| Kuriran imenik (44 mesta) | `20260709180000` seed | **LIVE** | bez statusnih labela | `Curated/Confirmed/Claimed/Partner` UI | MVP |
| Venue Growth Network (free→paid, tierovi) | — (novo) | **LOCKED ODLUKA** (dok.) | cene NISU kanon | willingness-to-pay intervjui | MVP/validacija |
| Weekday Active + Iskra (isto mesto) | VISIBLE/ghost + iskra + check-in rade svaki dan | **PARTIAL** | nema Active auto-expiry ni iskra volumen limita | dorada + gustina pilot | B1→MVP |
| Home day-adaptive stanja | HOME lock Faza 2 „Živi Home" (TODO Talas 2) | **PARTIAL** (dizajn) | graditi tek sa sadržajem | ostaje deferred, sada sa Pon–Pet spec-om | MVP |
| Contributor tokovi (predlog mesta/eventa) | recenzije/satnica/story/self-serve žive; USER predlog mesta/eventa NE postoji | **PARTIAL** | Scout rola već u backlogu — spojeno | suggestion flow + moderacija | MVP |
| Weekend Roadmaps + Afterglow | — (novo) | **B1/MVP kandidat** | drži odvojeno (QUEST §6) | Roadmap quest v0; Event 2 validira | MVP |
| Raverboard (ponderisan) | samo dance leaderboard postoji | **PHASE 2** | formula = GAP | scoring dizajn pre builda | PHASE 2 |
| Night Motion | Dance lock: web pokazno / native merilo; score cap dug | **PHASE 2 (native)** | ne sirovi koraci; bez GPS trail istorije | u native fazu (#51) | PHASE 2 |
| VS Moments | — (novo) | **PHASE 2** | obostrani pristanak (CHAT kanon fit) | posle share engine v1 | PHASE 2 |
| Memento timeline | achievements + YourNights legacy | **PHASE 2** | privatnost = GAP | dizajn posle B1 podataka | PHASE 2 |
| Organic Share Engine | referral rail plaća aktivaciju (#15) ✅; shareable kartice NE postoje | **PARTIAL** | — | achievement kartica v0 + deep link tracking | B1→MVP |
| AFC „AXP" closed-loop + QR | AFC kanon već closed-loop (§1); QR tok NE postoji | **LOCKED ODLUKA** | ime: **AFC ostaje kanon**, AXP=sinonim | QR pilot (1 partner, 1 nagrada) | MVP + LEGAL |
| Night Care sloj | Z4 kanon, CarGo/Knjaz angle u PARTNERS; poseban sloj NE | **PHASE 2** | nikad paywall (lock §10.10) | spec posle B1 | PHASE 2 |
| Ticketing MVP (RSVP+extern+pass) | „Idem" postoji; pass/checkout NE | **LOCKED SCOPE** | bez in-app naplate | RSVP→pass tok za Event 2 | MVP |
| Profesionalni brend paket | AFTERBEFORE_DESIGN v1 + kanon migracija ✅; logo/social šabloni NE | **PARTIAL** | vlasništvo = GAP | senior dizajner engagement | DESIGN |
| 4-event launch plan | B1 (18.08) planiran; E2–E4 novi | **LOCKED PLAN** | ne trpati sve u E1 | E2–E4 skice posle B1 | MVP |
| Anti-scroll / consent / novac≠reputacija / kulturna specifičnost | Ustav + ECONOMY §11.5 | **VEĆ KANON** | — | sada i eksplicitno u §10 | LIVE |

## OUTPUT B — Mapa integracije (izvor → kanonski vlasnik)

| Izvorni dokument (sažet u master promptu) | Kanonski vlasnik | Napomena |
|---|---|---|
| VENUE_GROWTH_REVENUE_MODEL | `ECONOMY.md` §12 + `PARTNERS.md` | cene ne-kanon do intervjua |
| HOME_QUESTS_CONTRIBUTOR_ARCHITECTURE | `QUEST.md` §6 + SECTION-LOCKS §10.1 | Home Faza 2 spec obogaćen |
| SPONSORED_QUEST_ENGINE | `ECONOMY.md` §8b/8c (već pokriva!) | novi doc = potvrda postojećeg kanona; hibrid glasanje isto |
| ORGANIC_SHARE_VIRAL_GROWTH_ENGINE | `ECONOMY.md` §14 | referral rail = temelj |
| AXP_PARTNER_REWARDS_QR_REDEMPTION | `ECONOMY.md` §13 | AXP→AFC ime; LEGAL flag |
| PROFESSIONAL_BRAND_MARKETING_CONTROLLED_LAUNCH | GAPS §8 + War Room „Brand & Launch" | deep-dive ostaje standalone kad stigne |
| (§5 Weekday Active/Iskra) | SECTION-LOCKS §10.2 | dorada tasks ispod |
| (§12 Raverboard/Motion/VS/Memento, §15 Night Care) | GAPS §8 + Parking Lot | PHASE 2/VISION |

## OUTPUT D — Novi war_tasks (uneto u bazu, source=`canon-2026-07-19`)

Sekcije i taskovi — vidi bazu (War Room → PLAN). Sažetak po sekciji:

**P0 · B1 Safety & Tech Blockers** — šifra 2-device QA (fantomski confirm) ·
identitet ne curi pre obe potvrde · leave/report/block putevi · Profile v2 upload
potvrda · 6 ekrana u produkciji · B1 feature freeze presuda · B1 analytics checklist ·
geofence #57 · crew chat report · venue_intent privacy · media bucket cap.

**B1 · Founding Night petlja (18.08)** — run-of-show po ZAVRTI-NOC · QR ulaz
deep-link štampa · check-in→šifra→quest→share tok uvežban · W1→W2 kohorta merenje.

**Product Canon Integration** — 6 deep-dive fajlova u repo kad stignu · REP/AFC
copy pass · statusne labele mesta u MESTA tabu · Ustav referenca u repo.

**Weekday Active + Iskra** — Active auto-expiry prozor · iskra volumen limit ·
midweek gustina pilot (1 kafić) · Home midweek stanje.

**Venue Network Pilot** — 5–8 pilot mesta regrutovano · willingness-to-pay
intervjui (≥5) · claim funnel merenje · venue-funded nagrada test (1 mesto).

**Contributor & Roadmaps** — predlog mesta flow (moderisan) · predlog eventa flow ·
Weekend Roadmap quest v0 · validaciona pravila (nagrada posle prihvatanja).

**Sponsored Quest Pilot** — Jungle MEGA pilot (pravni template #43 prvo) ·
content prava checklist · sponsor report v0.

**Organic Share Engine** — achievement share kartica v0 · deep-link tracking
(share→signup→check-in) · recap kartica posle B1.

**AXP/AFC Reward Pilot** — QR redemption spec · 1 partner + 1 nagrada pilot ·
katalog v0 sa realnim partnerima.

**Night Care** — care info polja na venue (declared/community/verified separacija) ·
nikad-paywall potvrda u copy.

**Brand & Launch** — senior dizajner brief · logo/ikonica · social šabloni ·
SR/EN voice guide · E2–E4 event skice.

**Legal / Accounting** — AFC loyalty tretman mišljenje · alkohol nagrade ograda ·
UGC/kampanja template (#43) · d.o.o. plan.

**Analytics & Validation** — share funnel eventi · weekday Active density metrika ·
venue attribution polja.

**Smart Start Documentation** — uskladiti prijavu sa scope matricom (MVP ≠ sve) ·
walkthrough osvežiti posle B1.

**Post-MVP / Parking Lot** — Raverboard scoring dizajn · Night Motion native ·
VS Moments · Memento timeline · Night Care pun sloj · settlement faza AFC.

## OUTPUT E — Scope matrica (bez dvosmislenosti)

| Faza | Sadržaj |
|---|---|
| **LIVE** | 6 kanon ekrana · Profile v2 · ŠIFRA/Crew (uz QA uslov) · sponsored perk+content · venue self-serve+klejm · imenik 44 · AFC ledger+claim RPC · referral aktivacija · War Room DB · evaluator paket |
| **B1 (18.08)** | šifra QA · feature freeze · run-of-show · QR ulaz · analytics checklist · prva share kartica (recap) · geofence/safety P0 |
| **SMART START MVP** | Capacitor native · weekday Active dorada (expiry/limit) · Roadmap quest v0 · contributor suggestion flows · venue network pilot (5–8) + intervjui · QR redemption pilot · share engine v1 · statusne labele mesta · Živi Home |
| **PHASE 2** | Raverboard ponderisan · VS Moments · Memento · Night Motion (native) · Night Care sloj · Quest Ads pijaca (F3) · Diagnostics SaaS pun · settlement |
| **VISION** | white-label festivali · city/tourism agregati · token (F3, post-grant) · međunarodno širenje |
| **LEGAL VALIDACIJA (pre launcha te oblasti)** | AFC/AXP fiskalni tretman · alkohol nagrade · UGC/kampanja prava · Memento/movement privatnost · ticketing svaka promena scope-a |

## OUTPUT F — WHAT WE JUST ACHIEVED — 2026-07-19

AfterBefore od danas nije „nightlife app sa feature-ima" nego **povezan ekonomski
i bihevioralni sistem** sa jasnim lancem:

```
DISCOVERY → VERIFIED PRESENCE → CONTRIBUTION → REPUTATION → ACCESS → REWARDS
→ SHAREABLE ACHIEVEMENTS → ORGANIC ACQUISITION → VENUE VALUE → B2B MONETIZACIJA
```

Konkretno sada imamo, na papiru i delom u kodu:
1. **Venue-led B2B put** — kuriramo grad besplatno, prodajemo rast (ECONOMY §12);
   prvi platiša je venue/brend/festival, ne korisnik.
2. **Contributor ekonomiju** — korisnik gradi imenik, rute i vodiče; XP za
   učešće, reputacija za korisnost, plaćena saradnja za operativu (QUEST §6).
3. **Sponsored Quest prihod** — već živ (perk+MEGA); novi dokument je potvrdio
   postojeći kanon §8b/8c, ne promenio ga.
4. **Organic share mašinu** — postignuće kao marketing; nagrada na aktivaciju,
   ne na klik (ECONOMY §14).
5. **Partner nagrade (AFC/AXP)** — closed-loop, QR redemption pilot put, pravna
   ograda pre launcha (ECONOMY §13).
6. **Weekday relevantnost** — Active+Iskra u istom mestu radnim danima = lock
   (SECTION-LOCKS §10.2); vikend-app postaje grad-app.
7. **Profesionalnu launch arhitekturu** — 4 kontrolisana eventa, svaki validira
   drugu petlju; brend paket kao svesna investicija.
8. **Koherentan put od doprinosa korisnika do prihoda biznisa** — uz nepromenjene
   ustavne ograde: consent first, novac ne kupuje reputaciju, isplate ≤ fond,
   safety se ne naplaćuje.

**Pogodili smo centar: sve novo se naslonilo na postojeće šine (imenik, klejm,
AFC ledger, referral, sponsored, ŠIFRA) — ništa nije moralo da se ruši.**

---

## BLOKERI + narednih 10 prioriteta

**Blokeri:** (1) 6 deep-dive MD fajlova nije dostavljeno u repo · (2) fantomski
dare_confirm — 2-device QA pre B1 · (3) AFC/alkohol pravno mišljenje pre
redemption pilota · (4) utorak 18.08 još nepotvrđen · (5) vikend program nije unet.

**Top 10 akcija:** 1) šifra 2-device QA · 2) founder: potvrdi datum + unesi
vikend program · 3) geofence #57 · 4) B1 feature freeze presuda (vibe/artist/badge)
· 5) pravni template kampanje (#43) → Jungle pilot · 6) willingness-to-pay
intervjui (5 mesta) · 7) achievement share kartica v0 · 8) QR redemption spec+pilot
· 9) Active auto-expiry + iskra limit · 10) statusne labele mesta u MESTA tabu.
