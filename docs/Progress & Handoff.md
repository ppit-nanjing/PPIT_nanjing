# Progress & Handoff

> Living status doc — updated as the project moves. If you're picking this up in a new AI session or as a new dev, start here, then [README.md](./README.md) for full documentation.

**Last updated:** 2026-08-15
**Repo:** https://github.com/Fx-4/PPIT_nanjing (branch `master`, repo root = the app)
**Live:** deployed on Vercel by the project owner directly (project `ppit-nanjing`) — auto-deploy on push is **not** connected yet, see Known Gaps.

## What's built and working

**Full application, every module from the original IA — every page is real, no mockups.** Public flows (Events, Jobs, Career, Join Us, Sensus, Inventory borrowing) all write to Neon via server actions. Admin console (`/console`, not `/admin` — deliberately less guessable) has working CRUD for every module: Users, Organization, Events, Inventory, Reports, Documentation, and Feedback.

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4, design tokens from [Design System Overview.md](./Design%20System%20Overview.md).
- **Neon Postgres** (`ap-southeast-1`) via Drizzle ORM — schema matches [Entity Relationship Diagram.md](./Entity%20Relationship%20Diagram.md). Real org structure seeded from the recruitment guidebook (3 Departemen, 9 Divisi, BPH), plus the 9 known PPI Tiongkok regional branches and the actual 2026/2027 recruitment period dates.
- **Auth.js** (Google provider, database sessions) — session carries `adminScope` (`"full" | string[] | null`, computed from `accessTier` + department `adminModuleScope`/`grantsFullAdminAccess`) and `emailSubscribed`. `isAdmin` is now a derived convenience boolean (any non-empty scope), not the source of truth.
- **Public pages**: Home, About, Organization Structure, Regional Branches, AD/ART, Terms, Privacy, News (list+detail), Gallery (list+album), Events (list+detail+register+QR ticket), Jobs (list+detail+apply), Career Center + Guide + Mentorship, Join Us (open/closed states), Sensus (3-step wizard, upsert), Inventory catalog + borrow request, Login, Profile (subscription toggle), 404, Maintenance.
- **Admin console** (`/console/*`) — layout gates on "any admin access at all"; each module page + its server actions additionally call `requireModuleAccess`/`hasModuleAccess` (`src/lib/admin-scope.ts`) so a 'scoped' user (e.g. Divisi Logistik) only sees and can write to the modules their department is actually scoped to, not every module a 'full'-tier BPH member sees. Sidebar nav filters itself the same way.
  - `/console` — dashboard (real feedback counts), visible to anyone with any admin access
  - `/console/users`, `/console/organization`, `/console/feedback` — full tier only (not delegable, no seed row scopes them)
  - `/console/events` — create/edit, registration roster, check-in
  - `/console/inventory` — add items, approve/reject/return borrow requests (atomically adjusts `availableQuantity`)
  - `/console/content` — news articles (draft/publish) + gallery albums/photos — was a real gap (no way to publish anything) until this batch
  - `/console/reports` — real sensus aggregate tallies + CSV student export (also reachable via the `sensus` scope key, see `admin-scope.ts` comment)
  - `/console/docs` — help articles by section (5 seeded from what's actually built) + editable in-app, `/console/docs/changelog` for release notes — visible to anyone with any admin access, same as Dashboard
- **Feedback widget** on every page: 4 categories with per-category draft persistence (localStorage), DOM element picker, admin inbox with filters/copy/status workflow.
- **Motion** for animation (not GSAP/Aceternity — matches the original "no heavy JS libraries" PRD constraint). `components.json` registers the `@react-bits` registry for future use.
- `web/docs/` mirrors the full Obsidian documentation set so any dev cloning the repo has IA/design system/ERD/tech stack without the Obsidian vault.

## Known gaps — do these next

1. **Auth doesn't work in production yet** — needs real `AUTH_SECRET` / `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` **and** `DATABASE_URL` as Vercel env vars (all four, not just the auth three — this tripped up an earlier deploy attempt). Google OAuth client: console.cloud.google.com, redirect URI `<deploy-url>/api/auth/callback/google`.
2. **Connect GitHub integration on Vercel** (Project Settings → Git) so pushes auto-deploy — my Vercel MCP connector 403'd trying to do this, so it's manual on the owner's end each time.
3. Resume/CV on job applications and every image URL field (news cover, gallery photos, album covers) are plain URL inputs, not file uploads — Vercel Blob isn't wired up yet.
4. Hero background is an original SVG placeholder, not a photo — swap for a licensed Nanjing photograph via Vercel Blob once the org has one, don't hotlink.
5. `adminModuleScope` seed values for Usaha Dana / Desain / Komunikasi & Konten are still **inferred** from the guidebook's job descriptions, not confirmed by the org — enforcement now exists (see `src/lib/admin-scope.ts`) but the underlying scope assignments themselves should be reviewed with PPIT Nanjing before this matters in practice. The `/console/organization` UI doesn't yet expose editing `adminModuleScope`/`grantsFullAdminAccess` directly (only name/description) — for now, adjusting scope means editing the seed or a direct DB update.
6. `reports` and `sensus` scope keys both unlock the same `/console/reports` page (it hasn't been split into a sensus-only view vs. a full-reports view) — so Divisi Hubungan Masyarakat (scoped to `sensus`) currently sees the same page, including the CSV export button, as Divisi Usaha Dana (scoped to `reports`). Same simplification for `content` vs `gallery` on `/console/content`.
7. Only 9 of the stated 32 PPI Tiongkok regional branches are seeded — the other 23 aren't named anywhere available to this project.
8. `favicon.ico` uses the Next.js default, not a custom one.

Every module in the original IA now has a real `/console/*` page — there is no remaining "unbuilt screen" gap, only the polish items above.

## Decisions worth knowing about (so they don't get re-litigated)

- **Neon over Supabase** — the user provided a live Neon connection string mid-project. Auth (Auth.js) and Storage (Vercel Blob, not yet wired) were assembled separately since Neon doesn't bundle them.
- **`/console` not `/admin`** — deliberately less guessable path; the real access boundary is the session check on the layout, not the name.
- **Motion, not GSAP/Aceternity/a full UI kit** — matches the "no heavy libraries" constraint in the original animation PRD.
- **`proxy.ts` not `middleware.ts`** — Next.js 16 renamed the convention.
- **No manual "create user" admin flow** — accounts only exist via Google OAuth, so user management is role/department assignment for people who've already signed in once, not provisioning.
- **Borrow requests decrement stock on admin approval, not on submission** — a pending request doesn't reserve inventory.
- **Git commits are one-file-per-commit** by explicit user preference — keep doing this for future changes. (Slipped twice so far and bundled a few files together when moving fast through a big batch — not rewriting the already-pushed history for those, but the discipline should hold going forward.)
