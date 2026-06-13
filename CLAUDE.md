# AfterBefore — project guide (for Claude Code)

Belgrade nightlife social app. **Vite + React + TypeScript + Tailwind/shadcn + Supabase.**

## Backend (Supabase) — IMPORTANT
- **Owned project ref: `aptahdctlvrhmrhpaccs`** (migrated off Lovable; this is the live DB for dev + beta).
- Migrations live in `supabase/migrations/`. The Supabase **CLI is NOT linked**.
- Apply migrations via the **Management API** (a personal access token + a POST to
  `https://api.supabase.com/v1/projects/aptahdctlvrhmrhpaccs/database/query` with `{"query": "<sql>"}`).
  Send a browser `User-Agent` header or Cloudflare returns 1010.
- `gh` CLI is installed at `~/.local/bin/gh` (auth via the git credential helper token).
- RPCs/tables not in `src/integrations/supabase/types.ts` → cast `const db = supabase as any`.

## Branches & hosting
- `main` — source code.
- `landing` — the GitHub Pages site: **landing at `/`**, **beta app at `/app/`**.
- GitHub Action **`.github/workflows/deploy-beta.yml`** auto-builds the beta app and pushes it to
  `landing/app` on every push to `main` (Pages serves the `landing` branch).
- Beta app preview: https://ahmedkvz.github.io/afterbeforeBeta/app/  · Landing: https://ahmedkvz.github.io/afterbeforeBeta/

## Build & routing gotchas
- App uses **HashRouter** (reliable on the GitHub Pages `/app/` subpath — no server rewrites).
- Beta build = `npx vite build --base=/afterbeforeBeta/app/` with **`VITE_OPEN_CHECKIN=true`** (bypasses the
  GPS geofence so remote testers can check in). Production build (plain `npm run build`) enforces the geofence.
- ⚠️ CI builds from **committed `main`**, not your working tree. Commit router/config changes before relying on the deploy.
- Always run `npm run build` to verify after changes.

## Design system
- Tokens in `src/index.css` (`:root`) + `tailwind.config.ts`. Dark nightlife theme; purple/pink/gold.
- Signature look = hue-based **oklch gradients** in `src/lib/gradients.ts`, applied via `<GradientImg>`.
  Venues/events/avatars are tinted by `hueFromString(name)`.

## Secrets — NEVER commit (already in `.gitignore`)
- `.supabase-new-project.json` (DB password), `.supabase-sr.txt` (service_role key), `BACKEND-MIGRATION.md`.
- The personal access token (`sbp_…`) is used only in shell commands — never write it to a file or commit it.
- `.env` IS tracked on purpose — it holds only the **anon/publishable** key (public, ships in the bundle).

## Auth
- Email/password; **auto-confirm ON**. `site_url` points at the beta app URL.

## Conventions
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Commit/push only when asked; on `main` it's OK to push when the user requests it.

## Test data (clean before public launch)
- Test accounts in DB: `beta@afterbefore.rs` / `Beta2026!`, plus `iva/marko/lana.test@afterbefore.rs` / `Test1234!`.
- Seeded `venue_presence` (Drugstore), a story, and a wave. One shared DB → "clean test data + prod build" before launch.

## Plans / docs in repo
- `PLAN-presence-browse-messaging.md` — presence/browse/messaging design + open decisions.
- `GAP-ANALIZA.md` — prototype vs app feature gap.
