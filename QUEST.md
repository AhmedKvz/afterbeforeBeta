# QUEST — trenutno stanje i vizija

> Living doc za Quest sekciju: šta je danas u produkciji, šta je zaključano, i kuda ide.
> Kanon-veze: `SECTION-LOCKS.md` §4 (lock) · `ECONOMY.md` §2, §8b, §8c (ekonomija/kampanje/pijaca) · `PARTNERS.md` (ko časti) · Ustav `AfterBefore-Istina-i-Zakoni.md` (Z5/Z6/Z10/Z11, raver #4/#5/#7).
> Poslednje ažuriranje: 2026-07-05.

---

## 0 · Srž (jedna rečenica)

**Quest = mašina doprinosa:** svaki quest je content brief koji od korisnika pravi graditelja scene, a od doprinosa pravi realnu vrednost (AFC → nagrade od partnera) — i na kraju, reklamnu pijacu gde brendovi plaćaju scenu umesto da je prekidaju.

**Test za svaki novi quest:** (1) šta scena dobija? (2) koji zakon služi? (3) ima li OS akciju koja ga meri? (4) ko finansira nagradu? — bez sva četiri odgovora, ne ulazi.

---

## 1 · TRENUTNO STANJE (u produkciji, verifikovano 2026-07-05)

### Sadržaj — weekly set v2 (živ u bazi)
9 questova, srpski scene-voice, **content-out** (svaki proizvodi nešto):

| Quest | Tip | Output za scenu |
|---|---|---|
| Vikend ritual | check_in | gustina noći |
| Novi teren | explore | gustina/pokrivenost |
| Iz prve ruke | review | **vodič za scenu** (supply koji turista plaća) |
| Najavi se | signal | ekipa se skuplja (intent) |
| Iskra na podijumu | match | veze na podijumu (graf) |
| Prvi talas | social | veze (uzvraćanje) |
| Pomeri pod | dance | **energija poda** (jedinstveni signal) |
| Trag od 24h | story | scena se dokumentuje |
| Tvoj glas, tvoja scena | vote_best_party | glas zajednice (Z11) |

`vibe` izbačen — nema OS akciju koja ga meri (pravilo #3 iz srži).

### Sponsored — dva tipa (`kind`)
- **perk** — nagrada na licu mesta: Kult „Prvih 50", 25 Bar „Before ritual", Para „Dovedi ekipu".
- **content** 🆕 — UGC kampanja (ECONOMY §8b): ljudi postave **foto/video sa aftera**, verifikovani članovi (≥1 check-in) glasaju, sponzor plaća nagradu (karte/putovanje/roba). Showcase u beti: Heineken „Najbolja after fotka" (foto), Jungle Travel „Najbolji before video" (video). Kroz `campaign_submissions` + `campaign_votes` + `OSCampaign` galeriju. **Ovo je pravac sponsored questova** — ne check-in mehanika (raniji #40 napušten). Founder pravi content kampanje sam u War Room-u (kind/media polja).

### Mehanika (kod)
- **Tracking pokrivenost 100% u OS toku:** check-in→`check_in`+`explore` · spark→`match` · Idem→`signal` · uzvrati iskru→`social` · dance sesija→`dance` · story→`story` · recenzija→`review` · glas→`vote_best_party`. Engine: `src/services/questProgress.ts` (`incrementQuestProgress`).
- **Nedeljna dodela = top-up do 5** iz aktivnog pool-a (content-swap safe, bez duplikata) — `src/hooks/useQuests.ts`.
- **3 huba** (`src/os/screens/OSQuests.tsx`): QUESTOVI (weekly + žurka meseca glas + custom/crew maker) · NAGRADE (AFC balans + katalog + redemption) · STREAK (+ Weekend Shield).
- **PARTNERI ČASTE** sekcija: partner label, open-frame opis, zelena nagrada-chip, PRIHVATI/progres, „nagrada se uzima na licu mesta" (Z6).
- **Ekonomska petlja vidljiva:** `DOPRINOS → AFC → NAGRADE OD PARTNERA` na baneru; output chip na svakoj kartici.
- Custom/crew questovi sa moderacijom (`moderation_status`) i `tier_required` — postoje, rade.

### Ograničenja danas (iskreno)
- XP i AFC su još **isti broj** (spendable_xp) — pravi `contribution_ledger` je ECONOMY F1 posao.
- Sponsored progres za „Prvih 50"/“Before ritual" tipove nije automatski vezan za check-in događaje (accept → ručni tok) — dorada.
- Nagrade-katalog je seed (eng. naslovi u rewards tabeli) — čeka katalog v0 pass sa realnim partnerima.
- Nema još: nedeljni ritual drop (ČET), MEGA QUEST UI, brend nalozi.

---

## 2 · LOCK (sažetak — pun tekst u SECTION-LOCKS §4)

**JESTE:** mašina doprinosa; quest = content brief; 3 huba; sponsored samo realni partneri, open frame, nagrada na licu mesta (Z6); srpski scene-voice; role-boje.
**NIJE:** domaći zadatak (brojač bez outputa); mesto za fejk sponzore; Lucky100 ostaje ODVOJEN od AFC ekonomije (kockanje separacija).
**Zakoni:** Z5 (poverenje→pristup) · Z6 (lock na lokaciju) · Z10 (ritual/streak) · Z11 (glas) · raver #4/#5 (open frame, ne kavez) · #7 (after-kamera za content).

---

## 3 · VIZIJA — tri sloja monetizacije (ECONOMY §2→§8b→§8c)

```
SLOJ 1 · LOYALTY PETLJA (F1, sad)
  doprinos → AFC ledger → katalog nagrada (partneri pune fond)
  gvozdeno pravilo: isplate ≤ prihod fonda

SLOJ 2 · MEGA QUEST (kampanje — concierge)
  sponzor plati nagradu (svoj proizvod) → crew pravi AFTER-video
  → upload YT/IG + app → GLASANJE SAMO U APPU → shortlist → žiri
  primer: Jungle Travel → put u Amsterdam („Argentina mehanika", sponzor plaća)
  USP: proof-of-presence sadržaj — „authenticity, verified"

SLOJ 3 · QUEST ADS PIJACA (self-serve)
  brendovi SAMI postavljaju (Composer: crew-content / presence / density)
  ekipe učestvuju PO REPUTACIJI (Z5 tier = kvalifikacija)
  moderacija svakog brend questa + prize escrow + anti-spam
  flywheel: brendovi → nagrade → ekipe → reach → brendovi
```

### Ključna pravila vizije (ne krše se)
1. **Žurka je sveta — kamera izlazi na afteru.** Content questovi traže video **sa aftera** (before/pre-game kao dopuna), nikad sa same žurke (raver #7). Brief: „snimi svoj after, ne set".
2. **Hibrid glasanje:** verifikovani nalozi sa istorijom prisustva (trust-weighted), zajednica bira top 5 → žiri/sponzor finale. Ubija vote-farming; pravno = konkurs veštine, ne igra na sreću.
3. **Prize escrow pre objave** — mi nikad ne avansiramo nagrade.
4. **Moderacija svakog brend questa** — kultura-fit (open frame, Z9 separacija: mainstream ≠ underground noć), pravni check, 18+.
5. **Reputacija = kvalifikacija:** otvoreni questovi za sve; premium kampanje (pivo/festival) traže tier — „reputacija zarađena nogama plaća festivale".
6. **Jedna MEGA kampanja u isto vreme** (event, ne inventar).

### Primeri kampanja (PARTNERS mapping)
- Kafeterija: „najbolji jutarnji intermezzo crew" → 4× VIP Lovefest (crew-content)
- Heineken: „najbolji before/after story" → EXIT karte (18+, tek posle čistog pilota)
- Jungle Travel: „snimi svoj after" → put u Amsterdam (**prvi MEGA pilot** — čist brend)
- Rezident program: mladi DJ questovi („dođi na warm-up", oceni set) — PARTNERS Prsten 1

---

## 4 · ROADMAP

| Faza | Šta | Status |
|---|---|---|
| ✅ v2 sadržaj | srpski content-out set + realni sponsored + tracking 100% + top-up dodela | **živo u prod** |
| **F1 ledger** | `contribution_ledger` (AFC odvojen od XP) + katalog v0 sa realnim partnerima + saldo UI | sledeće (ECONOMY §9) |
| **F1.5 ritual** | ČET quest-drop (nedeljni ritam: Pon–Sre recap/glas → Čet drop → Pet–Sub live → Ned after) | posle ledgera |
| **F2 MEGA QUEST** | `sponsor_campaign` + submissions + trust-weighted votes migracija; MEGA kartica u hubu + galerija za glasanje; pravni template; Jungle pilot (concierge) | posle 1. hero noći |
| **F2.5 sponsored auto-progres** | vezati presence/density šablone direktno za check-in event | uz F2 |
| **F3 QUEST ADS** | brend nalog (`account_type`), Composer (šabloni + moderacija), escrow, brend dashboard, cenovnik | posle 2–3 uspešne concierge kampanje |

**KPI po sloju:** L1 — % korisnika sa ≥1 isplatom + uticaj na W1→W2 · L2 — submissions/reach/glasači/instalacije po kampanji · L3 — broj aktivnih brendova, fill-rate kampanja, prihod po kampanji (pokrivenost fonda ≥ 1.0 uvek).

---

## 5 · Data model (sketch za F2/F3)

- `sponsor_campaign` (brand_id, šablon, brief, nagrada, escrow_status, prozor, tier_required, moderation_status)
- `campaign_submissions` (campaign_id, user/crew, in-app media, spoljni linkovi, night_ref/check-in proof)
- `campaign_votes` (submission_id, voter, weight — iz trust/tier)
- `sponsored_quests` +`tier_required`, +`brand_id` (postojeća tabela, proširenje)
- brend nalog = proširenje `profiles.account_type`
