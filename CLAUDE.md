# AfterBefore — project guide (for Claude Code)

Belgrade nightlife social app. **Vite + React + TypeScript + Tailwind/shadcn + Supabase.**

## Backend (Supabase)
- **Owned project ref: `aptahdctlvrhmrhpaccs`** (live DB for dev + beta).
- Migrations live in `supabase/migrations/`. The Supabase **CLI is NOT linked** —
  apply migrations via the **Management API** (personal access token in shell env only;
  POST to `https://api.supabase.com/v1/projects/<ref>/database/query` with a browser
  `User-Agent` header, otherwise Cloudflare returns 1010).
- RPCs/tables not in `src/integrations/supabase/types.ts` → cast `const db = supabase as any`.
- New RPCs: `SECURITY DEFINER SET search_path = public`; parsable error tokens
  (`TOO_FAR`, `LEVEL_REQUIRED`, `BAD_EMAIL`, …). ⚠️ `CREATE OR REPLACE` with a new
  signature creates an OVERLOAD (PostgREST → PGRST203); DROP the old signature +
  `NOTIFY pgrst, 'reload schema'`.

## Branches & hosting
- `main` — source code. `landing` — GitHub Pages: **landing at `/`**, **beta app at `/app/`**.
- `.github/workflows/deploy-beta.yml` auto-builds the app to `landing/app` on every
  push to `main` (md-only / migrations-only pushes do NOT trigger deploy).
- Live: https://ahmedkvz.github.io/afterbeforeBeta/ · app: https://ahmedkvz.github.io/afterbeforeBeta/app/
- Landing source lives outside this repo (`../afterbefore-landing/`), deployed via a
  worktree on the `landing` branch.

## Build & routing gotchas
- **HashRouter** (GitHub Pages subpath — no server rewrites).
- Beta build = `VITE_OPEN_CHECKIN=true npx vite build --base=/afterbeforeBeta/app/`
  (geofence off for remote testers). Plain `npm run build` enforces the geofence.
- ⚠️ CI builds from **committed `main`**, not the working tree.
- Verify with `npm run build` + `npx tsc --noEmit -p tsconfig.app.json` after changes.
- Persisted react-query cache is **JSON-only** — never put `Date` objects in query data;
  bump the cache buster on shape changes.

## Design system
- AB tokens as CSS vars in `src/index.css` (`--ab-*`), consumed via `AB.*` /`OS.*`
  in `src/os/osTheme.ts`. Dark void + acid (#c7ff21) + uv accents.
- Signature: hue-based oklch gradients in `src/lib/gradients.ts` (`hueFromString`).
- Overlay z-map: nav 70 < sheets 74/75 < feedback 80 < night card 81 < picker 93 < hub 95 < celebrations 130+.

## Secrets — NEVER commit (already in `.gitignore`)
- `.supabase-new-project.json`, `.supabase-sr.txt`, `BACKEND-MIGRATION.md`.
- The personal access token (`sbp_…`) is used only in shell commands — never in files or commits.
- `.env` IS tracked on purpose — it holds only the **anon/publishable** key (public by design).

## Auth
- Email/password; **auto-confirm ON**. `site_url` points at the beta app URL.

## Conventions
- Commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Commit/push only when asked; on `main` it's OK to push when the user requests it.
- One shared DB → clean test data before public launch.

## Internal docs
Strategy/planning docs live **outside the repo** in `../interno/` (this repo is public —
GitHub Pages requires it). Do not add internal analyses, handoffs, credentials or
grant material to the repo. Test-account credentials: see `../interno/` notes.
