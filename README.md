# AfterBefore — landing

Marketing landing for AfterBefore, hosted at **afterbefore.rs**.

Static single-page site (`index.html`, self-contained). The waitlist form posts to the
AfterBefore Supabase `waitlist` table via the public anon key.

## Hosting
This branch (`landing`) contains only the site at root — point your host's publish dir at the branch root.
- **GitHub Pages:** Settings → Pages → deploy from branch `landing` / root. `CNAME` sets the custom domain.
- **Netlify/Vercel:** connect repo, branch `landing`, publish dir `/`, add domain afterbefore.rs.

## DNS for afterbefore.rs
Point the domain at your host (e.g. GitHub Pages):
- A records → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
- or CNAME `www` → <user>.github.io
