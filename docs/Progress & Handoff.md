# Progress & Handoff

> Living status doc — updated as the project moves. If you're picking this up in a new AI session or as a new dev, start here, then [README.md](./README.md) for full documentation.

**Last updated:** 2026-08-15
**Repo:** https://github.com/Fx-4/PPIT_nanjing (branch `master`, repo root = the app)
**Live:** deployed on Vercel by the project owner directly (project `ppit-nanjing`) — auto-deploy on push is **not** connected yet, see Known Gaps.

## What's built and working

**Full application — every page is real, no mockups.** Public flows (Events, Jobs, Career, Join Us, Sensus, Inventory borrowing) all write to Neon via server actions. Admin console (`/console`, not `/admin` — deliberately less guessable) has working CRUD for Users, Organization, Events, Inventory, Reports, and Feedback.

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4, design tokens from [Design System Overview.md](./Design%20System%20Overview.md).
- **Neon Postgres** (`ap-southeast-1`) via Drizzle ORM — schema matches [Entity Relationship Diagram.md](./Entity%20Relationship%20Diagram.md). Real org structure seeded from the recruitment guidebook (3 Departemen, 9 Divisi, BPH), plus the 9 known PPI Tiongkok regional branches and the actual 2026/2027 recruitment period dates.
- **Auth.js** (Google provider, database sessions) — session carries `isAdmin` (role tier + Divisi Teknologi override) and `emailSubscribed`.
- **Public pages**: Home, About, Organization Structure, Regional Branches, AD/ART, Terms, Privacy, News (list+detail), Gallery (list+album), Events (list+detail+register+QR ticket), Jobs (list+detail+apply), Career Center + Guide + Mentorship, Join Us (open/closed states), Sensus (3-step wizard, upsert), Inventory catalog + borrow request, Login, Profile (subscription toggle), 404, Maintenance.
- **Admin console** (`/console/*`, gated at the layout level — redirects signed-out users to `/login`, non-admins to `/`):
  - `/console` — dashboard (real feedback counts)
  - `/console/users` — role + department + status assignment
  - `/console/organization` — hierarchical CRUD, up/down reorder, audit-logged; `/console/organization/audit-log` shows the trail
  - `/console/events` — create/edit, registration roster, check-in
  - `/console/inventory` — add items, approve/reject/return borrow requests (atomically adjusts `availableQuantity`)
  - `/console/reports` — real sensus aggregate tallies + CSV student export
  - `/console/feedback` — inbox for the floating feedback widget
- **Feedback widget** on every page: 4 categories with per-category draft persistence (localStorage), DOM element picker, admin inbox with filters/copy/status workflow.
- **Motion** for animation (not GSAP/Aceternity — matches the original "no heavy JS libraries" PRD constraint). `components.json` registers the `@react-bits` registry for future use.
- `web/docs/` mirrors the full Obsidian documentation set so any dev cloning the repo has IA/design system/ERD/tech stack without the Obsidian vault.

## Known gaps — do these next

1. **Auth doesn't work in production yet** — needs real `AUTH_SECRET` / `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` **and** `DATABASE_URL` as Vercel env vars (all four, not just the auth three — this tripped up an earlier deploy attempt). Google OAuth client: console.cloud.google.com, redirect URI `<deploy-url>/api/auth/callback/google`.
2. **Connect GitHub integration on Vercel** (Project Settings → Git) so pushes auto-deploy — my Vercel MCP connector 403'd trying to do this, so it's manual on the owner's end each time.
3. **Documentation Hub / Help Center** (`/console/docs` + the 7 guide pages) is the one admin module from the original prototype IA still unbuilt — everything else is done.
4. Resume/CV on job applications is a URL field (e.g. a Drive link), not a file upload — Vercel Blob isn't wired up yet.
5. Hero background is an original SVG placeholder, not a photo — swap for a licensed Nanjing photograph via Vercel Blob once the org has one, don't hotlink.
6. `adminModuleScope` seed values for Usaha Dana / Desain / Komunikasi & Konten are inferred from the guidebook's job descriptions, not confirmed by the org, and aren't actually enforced yet (the app currently gates by `isAdmin` only — full vs. none, not per-module scoping). Worth building out if granular per-division admin access matters in practice.
7. Only 9 of the stated 32 PPI Tiongkok regional branches are seeded — the other 23 aren't named anywhere available to this project.
8. `favicon.ico` uses the Next.js default, not a custom one.

## Decisions worth knowing about (so they don't get re-litigated)

- **Neon over Supabase** — the user provided a live Neon connection string mid-project. Auth (Auth.js) and Storage (Vercel Blob, not yet wired) were assembled separately since Neon doesn't bundle them.
- **`/console` not `/admin`** — deliberately less guessable path; the real access boundary is the session check on the layout, not the name.
- **Motion, not GSAP/Aceternity/a full UI kit** — matches the "no heavy libraries" constraint in the original animation PRD.
- **`proxy.ts` not `middleware.ts`** — Next.js 16 renamed the convention.
- **No manual "create user" admin flow** — accounts only exist via Google OAuth, so user management is role/department assignment for people who've already signed in once, not provisioning.
- **Borrow requests decrement stock on admin approval, not on submission** — a pending request doesn't reserve inventory.
- **Git commits are one-file-per-commit** by explicit user preference — keep doing this for future changes.
