# HANDOFF → OPUS: Landing v4 (founderov fajl) — deploy + živa forma

> Od: Fable · Za: Opus · 2026-08-03
> Founder je doneo svoj landing (453 linije, pun brend narativ). Fable je već:
> (1) preuzeo fajl u `/Users/macbook/Desktop/AfterBeforer/afterbefore-landing/index.html`
> (izvor istine), (2) uvezao 3 linka ka živoj aplikaciji
> (`https://ahmedkvz.github.io/afterbeforeBeta/app/`): nav CTA, hero CTA
> („Uđi u aplikaciju →" umesto beta liste) i dugme u #prijava sekciji.
> Tvoje: deploy + forma + provera. NE menjaj dizajn/copy fajla van naloga ispod.

## 1 · Deploy na landing granu (ab-ship §3 + NOVE začkoljice)

```bash
cd /Users/macbook/Desktop/AfterBeforer/afterbeforeBeta
git fetch origin landing --quiet
git worktree add -q /tmp/ab-landing landing
cp /Users/macbook/Desktop/AfterBeforer/afterbefore-landing/index.html /tmp/ab-landing/index.html
cd /tmp/ab-landing && git add index.html && git commit -q -m "..." 
git pull --rebase origin landing --quiet   # vidi ispod!
git push origin landing
cd /Users/macbook/Desktop/AfterBeforer/afterbeforeBeta && git worktree remove /tmp/ab-landing --force
```

**Začkoljice koje su mene ujele danas:**
1. **CI komituje na landing granu na SVAKI app deploy** („ci: deploy beta app
   preview") — rebase može da zatekne 70+ novih commita i konflikt na
   `index.html`. Rešenje: posle konflikta `cp` naš fajl preko, `git add`,
   `GIT_EDITOR=true git rebase --continue`, push.
2. **Ako `git worktree remove --force` pukne usred rebase-a**, lokalna
   `landing` grana ostaje divergentna — `git worktree prune` pa ponovo add.
3. **NE diraj ništa osim `index.html`**: na grani žive `/app` (aplikacija),
   `/fund` (Smart Start evaluator stranica, EN) i `og.png`.

## 2 · Forma #prijava — sa demo na živo

Forma (`#joinForm`: email + select uloge) trenutno samo pokaže poruku
„Prijava je zabeležena u demo prikazu" — **ne čuva ništa**. Uradi:

1. Migracija `landing_signups`:
   - kolone: id, email text NOT NULL, role text NOT NULL, created_at.
   - RLS deny-all. RPC `landing_signup(p_email, p_role)`:
     - validacija emaila (regex, lower/trim), rola u dozvoljenom skupu
       ('raver','izvodjac','vodic','helper','venue','brend'),
     - dedup po (email, role) — drugi put vrati `{ok:true, already:true}`,
     - rate limit po emailu (max 6/dan) → TOO_MANY.
   - GRANT EXECUTE anon + authenticated (landing je javna, poziva se anon
     ključem — koji je ionako javan).
2. U `index.html` skriptu: fetch na
   `https://aptahdctlvrhmrhpaccs.supabase.co/rest/v1/rpc/landing_signup`
   sa `apikey` + `Authorization: Bearer <anon>` headerima (anon ključ iz
   `.env` — javan je, sme u landing). Uspeh → postojeći `#success` div sa
   novim tekstom: „Prijava zabeležena ✓ Javljamo se uskoro." Greška →
   ista poruka stila („Nije prošlo — pokušaj ponovo.").
   Mapiranje selecta na role vrednosti uradi po redosledu opcija.
3. E2E u rollback DO bloku: validan insert, dedup, loš email pada, rate limit.
   Ništa test ne ostaje u bazi.
4. War Room: u PULSE ili DOGAĐAJI tab dodaj mini blok „PRIJAVE SA LANDINGA"
   (founder-only RPC `admin_list_signups()`, poslednjih 50, email+rola+datum).

## 3 · OG slika

`og.png` na grani je iz starog branda. Ako postoji novija u
`/Users/macbook/Downloads` ili je founder pošalje — zameni; ako ne, ostavi
i zabeleži u handoff-nazad (ne blokira).

## 4 · Provera posle deploya

- `https://ahmedkvz.github.io/afterbeforeBeta/` sadrži „Grad izlazi" i
  3× link ka `/app/`.
- `/app/` i `/fund/` vraćaju 200 i netaknuti su.
- Forma: pošalji pravu prijavu iz pregledača → red u `landing_signups`
  (pa ga obriši — test podatak ne ostaje).
- Mobilni prelom: hero-grid na 375px (founderov CSS ima media query — samo
  proveri screenshotom, ne diraj).

## 5 · Posle shipa

Dopiši u HANDOFF-FABLE: odstupanja + šta je forma tačno postala + da li je
og.png zamenjen. NE diraj: aplikaciju, /fund, ekonomiju, migracije van
`landing_signups`.
