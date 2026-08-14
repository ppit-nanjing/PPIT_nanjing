# Progress & Handoff

> Living status doc — updated as the project moves. If you're picking this up in a new AI session or as a new dev, start here, then [README.md](./README.md) for full documentation.

**Last updated:** 2026-08-14
**Repo:** https://github.com/Fx-4/PPIT_nanjing (branch `master`, repo root = the app)
**Live:** deployed on Vercel by the project owner directly (project `ppit-nanjing`) — auto-deploy on push is **not** connected yet, see Known Gaps.

## What's built and working

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4, design tokens ported from [Design System Overview.md](./Design%20System%20Overview.md).
- **Neon Postgres** (`ap-southeast-1`) via Drizzle ORM — full schema at `src/db/schema.ts` matching [Entity Relationship Diagram.md](./Entity%20Relationship%20Diagram.md), plus Auth.js adapter tables and a `feedback` table.
- Real organization structure (3 Departemen, 9 Divisi, BPH) seeded in `src/db/seed.ts` from the 2026/2027 recruitment guidebook, including the admin-access rule: full access = Ketua Umum + any Koordinator Divisi + every member of Divisi Teknologi; everyone else scoped to their own division's admin module (`roles.accessTier`, `departments.grantsFullAdminAccess`, `departments.adminModuleScope`).
- Auth.js (next-auth v5) with Google provider, database sessions, Drizzle adapter. Session carries `isAdmin` and `emailSubscribed`.
- Homepage (`/`) with real guidebook figures, Motion-based hero animation, layered visual hero (see "Known Gaps" re: photo).
- Profile hover menu with a role-gated "Masuk ke Console" link (`src/components/account-menu.tsx`).
- First-login email-subscription prompt (`src/components/onboarding-modal.tsx`) + toggle on `/profile`.
- Floating feedback widget on every page: 4 categories with per-category draft persistence, DOM element picker for pinpointing UI issues, admin inbox at `/console/feedback` (filters, per-item and bulk copy, status workflow).
- Custom 404, `/maintenance` page, `src/proxy.ts` env-var-gated maintenance redirect.
- `components.json` registers the `@react-bits` component registry for future use.

## Known gaps — do these next

1. **Auth doesn't work in production yet.** Needs real `AUTH_SECRET` / `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` as Vercel env vars (see `.env.example`). Create the Google OAuth client at console.cloud.google.com — authorized redirect URI is `<deploy-url>/api/auth/callback/google`.
2. **Connect the GitHub integration on Vercel** (Project Settings → Git → Connect Repository) so pushes to `master` auto-deploy. Right now every push needs a manual redeploy.
3. Only `/`, `/profile`, `/console/feedback`, `/maintenance` are real pages. Everything else in [Information Architecture.md](./Information%20Architecture.md) (~60 more screens) is still prototype-only.
4. Hero background is an original SVG placeholder, not a photo — swap for a licensed Nanjing photograph (City Wall / Fuzimiao) via Vercel Blob once the org has one, don't hotlink.
5. `adminModuleScope` for Usaha Dana / Desain / Komunikasi & Konten in the seed data is inferred from the guidebook's job descriptions, not confirmed by the org — sanity-check before enforcing real permission boundaries on those divisions.

## Decisions worth knowing about (so they don't get re-litigated)

- **Neon over Supabase** for the database — the user provided a live Neon connection string mid-project; Supabase was the original recommendation for its bundled Auth/Storage/RLS, so Auth (Auth.js) and Storage (Vercel Blob, not yet wired) had to be assembled separately.
- **`/console` not `/admin`** — deliberately less guessable, requested explicitly. The real access boundary is the session check on each console page, not the path name.
- **Motion, not GSAP/Aceternity/a full UI kit** — the original animation PRD said "no heavy external JS libraries"; Motion tree-shakes small and is the engine most animated-component kits (including react-bits) are built on anyway.
- **`proxy.ts` not `middleware.ts`** — Next.js 16 renamed the convention; using the current one from the start.
