# Product

<!-- impeccable:product-schema 1 -->

<!--
Product truth for PPIT Nanjing. Captures users, purpose, positioning, constraints —
NOT visual/aesthetic direction (that lives in DESIGN.md, written later via
`/impeccable document`). Sources: web/docs/*, web/AGENTS.md, current source, and a
2026-09-09 product interview. Mirrored to the Obsidian vault at
`Projects/PPIT Nanjing/PRODUCT.md`.
-->

## Platform

web

## Users

Two audiences, three groups. The **public website is built for the first two with equal
weight** — a newcomer and a returning member each get a clear path from the homepage.

- **Prospective members / outside public** — Indonesian students newly arrived in the
  Nanjing coverage area, plus sponsors, the parent body (PPI Tiongkok pusat), and other
  chapters checking what PPIT Nanjing is. Job: understand the organisation, judge that it
  is real and official, find how to join or get involved.
- **Active members** — Indonesian students already in one of the 9 covered cities. Jobs:
  complete the census, register for events and collect a QR ticket, borrow equipment,
  read news and the AD/ART, apply to jobs / mentorship, join a division.
- **Pengurus (committee / admins)** — the elected student committee, which **turns over
  every term**. They run the `/console` administration UI: users and roles, organisation
  structure, events, inventory, content (news + gallery), reports, in-app documentation,
  and a feedback inbox. Admin scope is per-division (`full`, a module list, or none).

## Product Purpose

PPIT Nanjing is the **official web portal of the Nanjing regional chapter of PPI
Tiongkok** (Perhimpunan Pelajar Indonesia Tiongkok — the umbrella body for Indonesian
students studying in China, with 32 regional chapters).

It exists to (a) be the credible official face of the chapter for members, newcomers,
sponsors and the parent body, and (b) run the chapter's recurring operations — census,
events, inventory, membership, content — as connected software rather than spreadsheets
and chat messages.

**Success, this term, is measured by two things:**

1. **Census completeness** — as many Indonesian students across the 9 covered cities as
   possible complete a *full* census profile. This data is re-entered into PPI
   Tiongkok's central system, so an incomplete profile is a rejected profile, not just a
   gap in an internal archive.
2. **Lower committee workload** — a rotating volunteer committee can run every module
   through the console, and member self-service (census, event registration, borrow
   requests, job applications) removes manual back-and-forth.

## Positioning

What a neighbouring product could not truthfully copy:

- It is **the** official portal for the Nanjing chapter specifically — endorsed by the
  chapter, aligned with `ppitiongkok.com`, and headed toward `nanjing.ppitiongkok.com`.
- Its census is **a pipeline into PPI Tiongkok's central member system**, field-for-field
  aligned with the central form (passport number is the identity key; membership status
  is derived, not stored). A generic org-website builder produces an internal form; this
  produces central-ready records.
- It is scoped to a **defined 9-city coverage area** across two provinces (Jiangsu +
  Ma'anshan in Anhui) — distinct from the 32 national chapters and from Nanjing's own 11
  city districts. Three separate maps exist for these three different things.
- It is **operated from inside mainland China**, for users behind the Great Firewall, by
  a student organisation that cannot obtain Chinese business API access.

## Operating Context

- **Primary audience is physically behind the Great Firewall.** Google Fonts, Firebase,
  and many global CDNs are slow or blocked. Everything user-facing is self-hosted /
  bundled; payload size is a correctness concern, not just performance.
- **Bilingual.** Indonesian is the source language and default; English is a full
  translation of the interface (`id` / `en`, cookie → session → `Accept-Language`, no URL
  prefix). Sibling chapter Chongqing runs fully in English; the parent site is Indonesian.
  Most `/console` copy stays Indonesian on purpose (readers are all Indonesian committee).
- **The committee rotates yearly.** The console and its in-app documentation / changelog
  are written for someone taking over a module with no verbal handover.
- **Census → central rekap** is the load-bearing workflow: 3-step wizard, server-enforced
  completeness, one row per person (passport UNIQUE), export filtered to the Nanjing
  chapter and complete profiles only. Student ID card upload is mandatory to finish.
- **Events** issue digital QR tickets; attendance is scanned at the door (participants and
  committee separately). Some events are paid (tiered fees, early-bird) and biodata-gated.
- **Inventory** covers internal borrowing, member contributions of items, procurement
  requests, and lending the chapter's own assets to outside parties.
- **Payments and WeChat verification are manual by necessity.** Alipay / WeChat Pay
  merchant APIs and the WeChat Official Account API all require a PRC-registered legal
  entity; a student organisation does not qualify. Donations, event fees, and WeChat-group
  verification therefore follow a publish-QR → user-pays-outside → admin-verifies pattern.
- **Hosting is a deliberate interim.** Vercel Hobby (non-commercial only — fine while
  merchandise is a showcase and money moves outside the app), Neon Postgres in Singapore
  (closest reachable region). A move to a paid host and to `nanjing.ppitiongkok.com` is
  planned and blocked on the parent body adding DNS records.
- **Some integrations are provisioned but dormant** pending owner action: Vercel Blob
  (`BLOB_READ_WRITE_TOKEN` unset → uploads return 503 → census cannot complete), email
  sending, production Google OAuth re-verification.

## Capabilities and Constraints

**Public capabilities:** home, about, organisation structure + 32 national chapters +
coverage map, AD/ART with review flow, terms / privacy, news, gallery + archive, events
(detail, registration wizard, QR ticket, committee ticket), jobs + applications, career
centre + mentorship, join-us (configurable form), census wizard, inventory catalogue +
borrow / contribute / procurement requests, universities by city, Nanjing places and
district map, in-app help centre with an AI chatbot, a floating feedback widget, in-app
notifications, profile with social links and a submissions history, login / signup /
password reset.

**Console capabilities:** users and roles, organisation and division structure, events
(with committee assignment, work ledger, certificates, payment verification, attendance
scan), inventory (approve / reject / return, external loans, audit log), content (news
CRUD with archive, gallery albums), reports (census aggregate + CSV export), documents
(help articles + changelog), catalogue (places / universities / districts / merchandise /
sponsors, with per-field AI auto-translation), feedback inbox, short links, audit logs.

**Hard constraints future work must respect:**

- No runtime dependency on blocked / slow external CDNs (fonts, icons, scripts, images).
- No `NEXT_PUBLIC_*` for any secret. Server Actions and route handlers are public
  boundaries — each authenticates and authorises itself; UI visibility is not security.
- Private census data, passport numbers, tokens, and hashes never reach the browser,
  logs, or analytics.
- Uploads capped at 4 MB (Vercel Function body ceiling); no automated payment or WeChat
  verification is possible.
- No automated test suite exists; changes are verified by types, lint, build, and a
  focused browser or endpoint check.
- Preserve the CSP, security headers, remote-image allowlist, and the scanner-only camera
  exception in `next.config.ts`.

**Terminology (use consistently):** *sensus* (census), *pengurus* (committee / admins),
*cabang* (chapter — one of 32 national), *coverage city* (one of the 9 PPIT Nanjing
serves — NOT a chapter), *kabinet* (the term's committee), *panitia* (per-event
committee, distinct from kabinet), *AD/ART* (the org's articles / bylaws), *kota naungan*
(coverage cities).

## Brand Commitments

Binding — locked, not open to redesign:

- **Name:** "PPIT Nanjing", the Nanjing chapter of **PPI Tiongkok**. Parent site
  `ppitiongkok.com`; target subdomain `nanjing.ppitiongkok.com`.
- **The three-verb motto stays verbatim in both languages** —
  *bersinergi, berkarya, berkontribusi* / *synergize, create, contribute* — as does the
  parent tagline: *"Wadah resmi perhimpunan pelajar Indonesia di Tiongkok untuk
  bersinergi, berkarya, dan berkontribusi bagi bangsa."* Never paraphrase either.
- **Must read as visually distinct from `ppitiongkok.com` and
  `chongqing.ppitiongkok.com`.** Nanjing's lighter, city-rooted look is a deliberate
  identity decision, not an accident to "correct". (Chongqing: dark maroon + gold,
  Archivo / Fraunces. Nanjing went light on purpose.)
- **The three Nanjing city themes** — *zijin* (紫金山, pine green + gold of the
  namesake forested mountain, default; retuned from a flat violet, and the last
  violet accent removed 2026-09-10), *meihua* (梅花, city flower, rose-crimson),
  *mingwall* (明城墙, Ming-wall blue-slate) — each with a dark variant, are part of
  the identity, not decoration. All six are WCAG-AA verified. Do not remove them.

Established but open to impeccable's review:

- Overall direction is "Warm Institutional" (inherited from the Google Stitch prototype
  lineage): official authority balanced with community warmth, generous whitespace, an
  Indonesia × China cultural fusion accent.
- Type: **Spectral** (serif) for H1–H3, **Plus Jakarta Sans** for body / UI, both
  self-hosted. Icons: **Lucide React**. (Set 2026-09-09; see `docs/Typography.md`.)
- A small set of hand-built animated icons in `src/components/icons/` (nav toggle, bell,
  CTA arrow), deliberately restrained.

## Evidence on Hand

- **Real reference content** scraped from `ppitiongkok.com` →
  `../stitch_ppit_nanjing_web_portal/.../extracted_text_from_https_www.ppitiongkok.com.md`.
- **Sibling site** `chongqing.ppitiongkok.com` — a live chapter portal, used as an
  anti-reference (be different) and a feature-parity check.
- **Seeded real data:** 32 national chapters, 9 coverage cities with real administrative
  boundary GeoJSON (`src/data/nanjing-coverage.geo.json`), ~349 universities across the 32
  chapters + 66 across the 9 cities, 11 Nanjing landmarks, 11 Nanjing districts.
- **Superseded prototypes:** ~95 Google Stitch `code.html` screens in
  `../stitch_ppit_nanjing_web_portal/` and `../stitch_ppit_nanjing_web_portal (1)/`,
  including two generations of `DESIGN.md` (`patriotic_institutional`, `warm_institutional`).
  Reference only — the built app has diverged; `docs/Goal.md` tracks the gap.
- **Documentation set:** `web/docs/` (product, IA, data model, design system, per-screen
  flows) and its Obsidian mirror `Projects/PPIT Nanjing/`.

**Absences future work must NOT fabricate:**

- No licensed photograph of Nanjing for the hero — it is still an SVG placeholder.
- No per-campus coordinator names / emails, no per-place street addresses, no merchandise
  catalogue (items / prices / stock), no per-city student counts — these are committee
  decisions or internal data, not findable facts.
- The official central-form university dropdown list is not published; the 349 seeded
  campuses are real but not a verified copy of it.

## Product Principles

1. **Two front doors, equal weight.** A first-year who just landed and a member coming
   back to file their census each get an obvious next step from the homepage. Neither is
   the "real" audience.
2. **Anything an anonymous visitor can reach stays light.** The audience is on varied
   devices behind the Great Firewall; a heavy page is an excluded reader, not a slow one.
3. **The census is an outcome, not a form.** It exists to feed the central system, so
   completeness is enforced on the server and the interface removes every reason to stop
   halfway.
4. **The console is infrastructure for a team that changes every year.** A new pengurus
   with no handover should be able to operate their module from what the screen and the
   in-app docs tell them.
5. **Official, but warm.** Credible enough for the parent body and sponsors; approachable
   enough that a nervous newcomer feels invited.

## Accessibility & Inclusion

- **WCAG AA is already enforced** across all three city themes × light / dark, and every
  new shared-token change is checked against all six.
- Keyboard operation, visible focus states, semantic labels, and a real
  `prefers-reduced-motion` alternative (state and hierarchy preserved, not a global
  motion kill) are mandatory — see `AGENTS.md` § UI and accessibility.
- Bilingual by default with Indonesian as the source of truth; interface strings live in
  both dictionaries and stay aligned.
- Payload discipline (principle 2) is an inclusion requirement: the target reader is on a
  mid-range or older Windows / Android device on a constrained connection.
