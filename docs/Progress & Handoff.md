# Progress & Handoff

> Living status doc — updated as the project moves. If you're picking this up in a new AI session or as a new dev, start here, then [README.md](./README.md) for full documentation.

**Last updated:** 2026-08-27
**Repo:** https://github.com/Fx-4/PPIT_nanjing (branch `master`, repo root = the app)
**Live:** deployed on Vercel by the project owner (project `ppit-nanjing`). Auto-deploy on push **is** connected (every commit → READY production deploy in ~2 min). ⚠️ Watch the commit-author email: Vercel rejects deploys whose tip-commit author isn't verified on the GitHub account — local `git config user.email` must stay `Haikalhelmy13@Gmail.com`.

## What's built and working

**Full application, every module from the original IA — every page is real, no mockups.** Public flows (Events, Jobs, Career, Join Us, Sensus, Inventory, Documents) all write to Neon via server actions. Admin console at `/console` has working CRUD for every module.

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4, design tokens from [Design System Overview.md](./Design%20System%20Overview.md). `proxy.ts` (not `middleware.ts` — Next 16 rename).
- **Neon Postgres** (`ap-southeast-1`) via Drizzle ORM — schema matches [Entity Relationship Diagram.md](./Entity%20Relationship%20Diagram.md). Real org structure seeded from the recruitment guidebook, all 32 PPI Tiongkok branches, 349 campuses across those branches, the 9 coverage cities, the 2026/2027 recruitment dates, and the WIF 2026 committee skeleton.
- **Auth.js** — Google + Credentials (email/password) providers, **JWT sessions**. Session carries `adminScope` (`"full" | string[] | null`) + `emailSubscribed` + `locale`, all re-derived from one fused DB query per request (`loadSessionContext` in `src/auth.ts`), `auth()` deduped with React `cache()`. Password reset flow at `/reset-password` (added 2026-08-27). Sign-up self-service at `/signup`; no admin "create user" flow, but admins can pre-provision **invited** accounts (paste-a-list form on `/console/users`) that the person then claims via Google or password.
- **i18n** — hand-rolled flat dictionary (`src/lib/i18n/`), locales **id + en**, cookie `NEXT_LOCALE` + nullable `users.locale` (cookie wins). **Every public surface is translated** — ~48 of 51 public pages plus every shared card/component, localised metadata, relative times, and the `/api/upload` error envelope. `en.ts satisfies` the id keys so a missing translation is a `tsc` error. **The console is deliberately Indonesian-only** (all pengurus speak Indonesian — Phase 4, not started).
- **Email** — `sendEmail()` in `src/lib/email.ts`, two interchangeable transports: Gmail SMTP (`GMAIL_USER` + `GMAIL_APP_PASSWORD`, wins when set) and Resend (`RESEND_API_KEY` + `EMAIL_FROM`). Gmail is the working path today; Resend needs a verified domain PPIT doesn't own yet. `emailSenderStatus()` = off / testing / ready. Sends: membership decisions, news announcements to subscribers, password reset. **Verify `GMAIL_*` is set in Vercel env, not just local `.env`** — otherwise every email silently no-ops in production.
- **Vercel Blob** — `/api/upload` (auth-gated, folder-allowlisted, size/type-checked) + `FileUpload` / `ImageUploadCropper` clients, site-wide WebP re-encode pipeline. Store is provisioned; `BLOB_READ_WRITE_TOKEN` set in Vercel (⚠️ local `.env` is still blank — uploads only work in the deployed app until you add it locally too).
- **Motion** for animation (matches the "no heavy libraries" PRD constraint).
- `web/docs/` mirrors the full Obsidian documentation set.

### Console modules (`/console/*`)

Layout gates on "any admin access"; each page + its server actions additionally call `requireModuleAccess`/`hasModuleAccess` (`src/lib/admin-scope.ts`). Shared error + loading boundaries on every route; `ConfirmButton` modal (not `window.confirm`) before destructive actions; per-page guide buttons.

- `/console` — dashboard: feedback counts + weekly trends
- `/console/users` — roster, role/department assignment, **invited-account paste-list**, CSV export (full-tier only)
- `/console/organization` — departments/divisions inline CRUD, set Kepala, edit `adminModuleScope`, React Flow structure chart, audit log (full-tier only)
- `/console/membership` — recruitment period controls, application review + **auto-provisioning on approval**, form builder (`/form`, Google-Forms parity incl. quiz mode), responses (full-tier / `membership` scope)
- `/console/events` — create/edit (sectioned form), registration roster with attendee origin, check-in + QR scanner, **per-event committee divisions** (tree + quotas + gaps), one-click staffing, participant/committee e-certificates, **manual HTM payment verification**, per-event custom questions, structure templates, CSV export
- `/console/work-ledger` — who sits on how many committees, certificate issuing
- `/console/inventory` — items (inline edit), borrow approve/reject/return, contributions, procurement, external loans, audit log
- `/console/content` — news (draft/publish + email announce), gallery albums/photos (highlight picker, mosaic, captions)
- `/console/katalog` — places / universities / merchandise / sponsors / donation channels + verification
- `/console/documents` — Google Drive module, per-division RBAC, auto short-link
- `/console/links` — short-link / custom redirect module (QR, CSV export, public `/l/` directory)
- `/console/reports` — sensus aggregate + full central-field export, CSV/xlsx, re-run from history
- `/console/notifications` — wording of the 7 automatic in-app notifications (full-tier only)
- `/console/docs` — help articles + `/changelog`

## Shipped since 2026-08-21 (this doc's previous snapshot)

**i18n** — the whole public front-end went from Indonesian-only to fully bilingual: dictionary infra, every public page/card/component through `t()`, localised metadata + relative time + upload errors, the radial language-switch reveal animation. Console untouched (deliberate).

**Sensus aligned field-for-field with the PPI Tiongkok central form** (`src/lib/sensus-form.ts` shared validator) — 38-province dropdown, branch→campus cascading select (349 campuses), `+86` phone lock, WeChat-ID regex, `passport_number` now `UNIQUE` (kills the two-Gmail duplicate), server-enforced completeness. `sensus_summary` export widened to every central field in their order. Membership status is **derived** (Anggota / Cabang lain / Tamu), not a stored `account_type`.

**Events + kepanitiaan** — per-event division tree (Departemen → sub-tim, quota + jobdesc), committee console section with gap counts, one-click + bulk staffing, participant e-certificates (auto on completion) + committee attendance QR tickets, public volunteer signup with one-click approval, manual HTM verification (paid registrations stay QR-less until verified), treasurer Alipay QR upload, per-event custom registration questions, committee structure templates, event branch question (only when sensus incomplete), roster "Asal" column. **WIF 2026 registration (2026-08-27):** `requiresBiodata` mode with sensus reuse, `event_fee_options` tiered pricing (Freshmen ¥15 / Non-freshmen ¥25), `file` registration-question type, `events.confirmationInfo` post-registration panel, and a **stepped (Google-Forms-style) registration wizard** (`EventRegisterWizard`). Migrations 0015–0021. (An Alipay-bill CSV auto-match tool was built then removed — payment verification stays 100% manual.)

**Documents & links** — Google Drive module with per-division RBAC + auto short-link generation; short-link / custom-redirect module with QR + CSV export + public directory. IDOR + RSC-crash + folder/race fixes followed.

**Membership** — recruitment period activation controls, auto-provisioning of an account when an application is accepted (survives provisioning races), the "field inti over-locked" fix, decision emails.

**Auth** — nav "Log in" buttons now route through `/login` instead of straight to Google (GitHub issue #1); **password reset** (`/reset-password`, sha256 tokens, 1h single-use, `password_reset_tokens` migration 0022, 90s per-email cooldown); session-lookup perf (fused query + `cache()` dedup).

**Console polish** — shared form primitives (`Select`/`CheckboxField`/`ToggleSwitch`/`RadioGroupField` + custom select chevron), `ConfirmButton` modal, shared error/loading boundaries, sectioned event forms + collapsible sidebar + two-column layout, dashboard weekly trends, feedback reply-by-email, xlsx reports, inline editing for inventory + catalog, CSV exports, React Flow org chart, department Kepala assignment, emoji → lucide icons.

**Inventory** — handover step, borrower-initiated return requests, tabbed profile, contributions / procurement / external-loans flows (from the Advanced Features spec).

**Uploads** — site-wide WebP pipeline, stream-based Drive media upload with a 4 MB guard, camera-permission policy fix.

**Ops** — `publish-events` cron scheduled (then the stray 15-min cron removed), CSP `unsafe-eval` restricted to dev.

## Known gaps — do these next

Ordered roughly by who's blocked on what.

### Blocked on the org / pusat (not code)

1. **Subdomain `nanjing.ppitiongkok.com`** — pusat hasn't added the DNS records. This is the linchpin: it unblocks a Resend verified domain (email to any address, no daily cap) + a proper `EMAIL_FROM`, and it's where the site should live. Runbook + ready-to-send request: [Migrasi Subdomain ppitiongkok.md](./Migrasi%20Subdomain%20ppitiongkok.md).
2. **`branch_universities` not reconciled with pusat's official dropdown** — 349 real campuses are seeded but they are not a copy of pusat's list (which isn't published). Spelling must be matched before the sensus recap is submitted, or rows won't match their system. The "Lainnya" fallback in the university dropdown is the safety valve until then — don't remove it. See [Progress notes below] / `src/db/seed-branch-universities.ts`.
3. **Admin-scope confirmation sheet** — `adminModuleScope` / `grantsFullAdminAccess` for Usaha Dana / Desain / Komunikasi & Konten are still *inferred* from guidebook job descriptions. The audit + 3-question sheet is in [Konfirmasi Akses Admin.md](./Konfirmasi%20Akses%20Admin.md). Now self-service to fix (`/console/organization` → edit division → checkboxes).
4. **Hero background** is an original SVG placeholder — swap for a licensed Nanjing photo once the org has one. Don't hotlink.
5. **Account migration** off the owner's personal accounts (GitHub / Vercel / Neon / Google OAuth / Groq / Resend) onto a PPIT identity — cheapest to do *before* the domain + email setup so the OAuth-redirect and Resend-domain work isn't done twice. Plan: [Migrasi Akun ke PPIT Nanjing.md](./Migrasi%20Akun%20ke%20PPIT%20Nanjing.md).

### Code / verification

6. **Confirm production auth end-to-end** — one real Google sign-in in production to close the loop. Credentials + JWT path verified locally. Brute-force throttle in `src/auth.ts` is best-effort in-memory per Lambda — real protection needs a shared store (Upstash Redis), not provisioned.
7. **`reports`/`sensus` and `content`/`gallery` scope keys alias to the same console page** — a division scoped to just `sensus` sees the full reports page (incl. CSV export). Keys are stored separately so splitting the routes later needs no data migration.
8. **Console i18n (Phase 4)** — 1 of 30 console pages is translated. Deliberately deferred (all pengurus Indonesian); listed so it isn't forgotten if an English-speaking pengurus ever joins.
9. **`§6.1` invited-account linking** — the Google-sign-in-links-invited-account path (`signIn` callback in `src/auth.ts`) is now reachable (invite flow shipped 2026-08-21, Blob unblocked) but has never had a live runtime test.

### Data cleanup (owner's call)

10. **`permissions` + `role_permissions` tables are dead** — defined in `schema.ts` with a `relations` entry, empty, queried nowhere. They were an ERD-era design for fine-grained *per-action* RBAC (`key` = `"event.publish"` etc.); the app shipped with coarser *module-level* scope (`adminModuleScope`) and that's been enough. Keep them (zero cost, empty) unless the org confirms it wants per-action permissions — dropping is a pengurus decision, not a unilateral cleanup.
11. **`neon_auth` schema in the database** (9 empty tables) is Neon's platform Better-Auth feature, not this app — the app uses Auth.js with its own `public` tables. Disable from the Neon console if unwanted; don't `DROP SCHEMA`.
12. **One stale sensus row** is `complete` with `funding_source` NULL (predates server validation). With the default export filter it exports as send-ready and pusat will reject it. Backfill or downgrade to `incomplete`.

Every module in the original IA has a real `/console/*` page — there is no "unbuilt screen" gap, only the items above.

## Decisions worth knowing about (so they don't get re-litigated)

- **Neon over Supabase** — the user provided a live Neon connection string mid-project. Auth (Auth.js) and Storage (Vercel Blob) were assembled separately since Neon doesn't bundle them.
- **`/console` not `/admin`** — deliberately less guessable; the real boundary is the session check, not the name.
- **Motion, not GSAP/Aceternity/a full UI kit** — "no heavy libraries" constraint.
- **`proxy.ts` not `middleware.ts`** — Next.js 16 rename.
- **Self-service sign-up + invited accounts, no admin "create user" form** — accounts self-register (Google or email/password) then an admin assigns role/department; OR an admin pre-provisions an `invited` row that the person claims. Signing up with an email that already has a Google-only account is rejected ("use Google instead") — no silent email linking without verification. `users.email` unique is respected, never worked around.
- **i18n: hand-rolled, no library** — flat `id.ts` / `en.ts`, `t()`, `en.ts satisfies typeof id`'s keys so a missing translation fails `tsc`. No URL prefix, no middleware. Cookie wins over `session.user.locale` (JWT can't be rewritten from a plain server action). DB content (news/events/questions) stays as authored — UI strings only.
- **Payment verification is 100% manual** — for events (HTM) and donations alike. Alipay/WeChat personal receive-QRs expose no webhook, and the merchant APIs that do (当面付 / F2F) need a PRC business entity PPIT doesn't have. Participant uploads proof → treasurer checks against the app → `updatePaymentStatus` issues the QR. An Alipay-bill CSV auto-match tool was built and then removed at the user's request.
- **Event registration asks branch only when sensus is incomplete** — one-shot answer stored on `event_registrations.branch`, never copied to the profile or used for the pusat recap (`effectiveBranch()` prefers sensus). `requiresBiodata` events suppress the branch question entirely (the biodata block already asks city).
- **Membership status is derived, not stored** — Anggota (sensus complete + branch Nanjing) / Cabang lain / Tamu. A stored `account_type` would immediately conflict with the sensus when someone fills it late or moves branch. "Tamu" is one mixed bucket — from sensus alone, "Nanjinger who hasn't filled it" and "outside guest" can't be told apart; that's why `event_registrations.branch` exists.
- **Identity: Gmail is the account key in the portal, passport number is the person key in the pusat recap** — `users.email` UNIQUE; `sensus_profiles.passport_number` UNIQUE (NULL repeats allowed). The pusat form has no email field at all. Duplicate passport is *rejected at the Biodata step*, never auto-migrated (that would let anyone who knows a passport number take over a sensus row) — resolution is via pengurus deleting the unused account.
- **Sensus form matches the pusat form field-for-field** — data collected here is re-entered into pusat's system, so anything outside their fields has nowhere to go and anything missing has to be chased per member. Deliberate consequences: province dropdown (38), campus cascading dropdown locked until branch is picked, `+86` phone lock, WeChat-ID regex, server-enforced completeness. NOT copied: pusat's 205 KB upload cap + auto-shrink (our storage has no such limit; check card image size manually if it must be re-uploaded to their form).
- **Git commits are one-file-per-commit** by explicit user preference. (Slipped a few times in big batches — not rewriting pushed history, but hold the discipline going forward.)
- **`drizzle-kit push` churn** — after `0014` renamed constraints to Drizzle's convention, push runs with no destructive prompt, but a few composite PKs and one 63-char-truncated FK name always show as "changed" (harmless, verified by OID compare). For explicitly-written migrations, `src/db/apply-sql.ts` (run the file as-is) stays the audited path — don't trust the differ blind.
- **`npm run build` passing does NOT mean the live Neon schema is in sync, and does NOT mean auth works** — the build only statically analyses routes, never runs a query or a real sign-in. Two real bugs (schema drift; `DrizzleAdapter(db)` missing its table-mapping arg → `42P01 undefined_table` on every sign-in) stayed invisible through many green builds and only surfaced as a live 500 on the first production Google sign-in. After anything touching `src/auth.ts` or the adapter-facing tables, the only real test is an actual sign-in.
