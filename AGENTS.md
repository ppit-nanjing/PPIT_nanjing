<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PPIT Nanjing project guide

## Purpose and source of truth

- This repository is the public website and administration console for PPIT Nanjing, serving Indonesian students in and around Nanjing. It includes public content, membership and census flows, events, inventory, organization management, notifications, documents, and reports.
- Treat current source code, `package.json`, and configuration files as the implementation truth. Use `docs/README.md` as the product and design index, but verify technical claims against the code before acting; several documents describe an earlier target state.
- Keep changes focused on the requested behavior. Do not refactor adjacent features, change dependencies, rewrite copy, or modify generated files unless the task requires it.
- Preserve the generated Next.js block at the top of this file exactly. `next dev` may regenerate it.

## Stack and commands

- Runtime: Next.js 16.3 App Router, React 19, strict TypeScript, and Node.js-compatible server code.
- UI: Tailwind CSS 4 tokens in `src/app/globals.css`, Motion, Lucide React, and custom reusable components.
- Data and services: Drizzle ORM, Neon Postgres, Auth.js v5, Vercel Blob, Google Drive, Nodemailer/Resend, and Groq.
- Use npm and keep `package-lock.json` authoritative. Do not add or modify `bun.lock` unless the user explicitly chooses Bun for the project.
- Common commands:
	- `npm install`
	- `npm run dev`
	- `npx tsc --noEmit`
	- `npm run lint`
	- `npm run build`
	- `npm run db:seed` only with an intentional target database
- Copy `.env.example` to `.env` for local setup. Never commit `.env` or credentials.

## Repository map

- `src/app/`: App Router pages, layouts, errors, route handlers, and feature routes.
- `src/app/actions/`: shared Server Actions and mutations. Every module starts with `"use server"`.
- `src/app/console/`: authenticated administration UI. Individual modules still require their own authorization checks.
- `src/components/`: reusable UI. Feature-specific components live in subdirectories; cross-site components live at the root.
- `src/lib/`: domain services and shared server/client-safe helpers.
- `src/db/schema.ts`: canonical Drizzle schema. `src/db/index.ts` owns the Neon client.
- `drizzle/`: reviewed SQL migrations. Do not infer deployed state solely from `drizzle/meta/_journal.json`.
- `docs/`: product, flow, data-model, and design references. Update relevant docs when behavior or operational setup changes.

## Next.js and React conventions

- Read the relevant versioned guide in `node_modules/next/dist/docs/` before changing Next.js code. Do not rely on remembered APIs from older releases.
- Pages and layouts are Server Components by default. Fetch sessions and database data directly on the server, and add `"use client"` only to the smallest component that needs state, effects, browser APIs, or event handlers.
- Keep the React Server Component boundary serializable. Pass plain data to Client Components; do not pass ordinary functions, database objects, or component constructors across it. Server Action references are allowed where the existing pattern uses them.
- In Next.js 16 routes, dynamic `params` and `searchParams` can be promises and must be awaited. Prefer generated `PageProps`, `LayoutProps`, or `RouteContext` types where applicable.
- Use `src/proxy.ts`, not `middleware.ts`, for request interception. The current proxy is deliberately limited to maintenance mode.
- Never perform database mutations during Server Component rendering. Put writes in a Server Action or route handler, then call `revalidatePath`, `redirect`, or `notFound` as appropriate.

## Server actions and route handlers

- Treat every exported Server Action and every route handler as a public request boundary, even when only an admin form currently calls it.
- Authenticate and authorize inside the action or handler. UI visibility and parent layouts are not security controls.
- Normalize and validate all `FormData`, path, query, and JSON values before writing. Reuse nearby parsers and domain helpers so create and update paths cannot drift.
- Return structured form state for recoverable validation errors when the form already supports inline feedback. Throw for forbidden access or exceptional failures.
- Use `src/lib/safe-redirect.ts` for user-controlled return URLs.
- After mutations, revalidate every affected public and console path. Preserve Next.js control-flow errors from `redirect()` and `notFound()` rather than wrapping them as ordinary failures.
- Route handlers should return explicit status codes and stable JSON error shapes. Keep upload authentication, origin checks, folder authorization, size/type allowlists, and filename sanitization intact.

## Authentication and authorization

- Use the cached `auth()` export from `src/auth.ts`. The app uses JWT sessions with Google and Credentials providers plus database-derived user metadata.
- Admin scope is `"full"`, a list of module keys, or `null`. The `/console` layout only checks whether a user has any admin access; each module page, Server Action, export, and API handler must enforce its own module.
- On server code, prefer `requireModuleAccess()` from `src/lib/admin-scope.ts`. Use `hasModuleAccess()` when a request needs a custom response instead of a redirect.
- Client Components must import pure authorization constants and helpers from `src/lib/admin-scope-constants.ts`, never server-only auth or database modules.
- Preserve the current `reports`/`sensus` and `content`/`gallery` aliases unless the task explicitly changes the access model. Sensitive scope assignment must remain server-enforced.
- Never expose password hashes, session tokens, OAuth tokens, database URLs, passport numbers, or private census data to the browser, logs, analytics, or error responses.

## Database and migrations

- Update `src/db/schema.ts` and add a matching reviewed SQL migration for schema changes. Inspect the existing migration directory and choose a unique descriptive filename; duplicate numeric prefixes already exist.
- Do not run `drizzle-kit push --force`, and do not approve destructive operations from `npm run db:push` blindly. This repository has known schema drift and incomplete migration journal history.
- When an explicit migration must be applied, use `npx tsx --env-file=.env src/db/apply-sql.ts drizzle/<migration>.sql` only after confirming the target database and reviewing the SQL.
- Preserve foreign-key actions, uniqueness constraints, enum values, Auth.js adapter column names, and data backfills. Schema edits without corresponding migration SQL are incomplete.
- `npm run db:seed` modifies persistent data. Specialized scripts under `src/db/seed-*.ts` are not part of the default seed and must not be run casually.

## Internationalization

- The app uses custom dictionaries, not `next-intl`. Supported locales are `id` and `en`; Indonesian is the default.
- Server Components use `getT()` from `src/lib/i18n/server.ts`. Client Components use `useT()` inside `LocaleProvider`.
- Add interface keys to both locale dictionaries and keep their structure aligned. Use `INTL_LOCALE` for locale-sensitive dates and numbers.
- Locale resolution is cookie first, then session preference, then `Accept-Language`, then Indonesian. There is no locale URL prefix.
- Database-authored content is not automatically translated, and some console copy remains Indonesian. Match the surrounding feature rather than claiming full translation coverage.

## UI and accessibility

- Treat `src/app/globals.css` as the live visual source of truth. Use its semantic color, spacing, type, radius, and surface tokens instead of one-off hex values or duplicated theme CSS.
- Reuse existing components and feature patterns before adding a new abstraction or dependency. `components.json` is generator configuration, not evidence that Radix or a complete shadcn component set is installed.
- Use Lucide icons and `next/image` where suitable. Avoid runtime font, icon, image, or script dependencies on blocked/slow external CDNs because the primary audience is in mainland China.
- Preserve keyboard operation, visible focus states, semantic labels, responsive layouts, and reduced-motion behavior. Motion code must respect the global `MotionConfig` and `prefers-reduced-motion` fallbacks.
- Use `ConfirmButton` from `src/components/console/confirm-button.tsx` for destructive confirmation. ESLint forbids `window.confirm()` and `window.alert()`.
- Test light and dark modes plus all city themes when changing shared tokens or global UI. Do not fix accessibility by hiding overflow or suppressing warnings without identifying the cause.

## Configuration and security

- Keep secrets server-only. Do not introduce `NEXT_PUBLIC_*` variables for database, Auth.js, Blob, Drive, email, cron, or AI credentials.
- When adding an environment variable, update `.env.example` and the relevant setup documentation without inserting real values.
- Preserve the CSP, security headers, remote image allowlist, Server Action body limit, and scanner-only camera exception in `next.config.ts`. The scanner route and catch-all header rules must remain disjoint.
- `CRON_SECRET` must protect scheduled publishing in production. External integrations should fail clearly and without corrupting local state when credentials are missing.
- Treat uploads and external URLs as untrusted input. Keep authorization, same-origin checks, allowlists, size limits, sanitized names, and safe redirects at the server boundary.

## Validation and completion

- There is currently no automated test runner or test suite. Do not claim tests passed when only lint or type checking ran, and do not introduce a test framework for an unrelated task.
- Start with the narrowest relevant check, then run `npx tsc --noEmit` and `npm run lint`. Run `npm run build` for changes that affect routing, server/client boundaries, configuration, or deployment behavior.
- Builds require valid environment configuration and do not prove database, OAuth, email, Blob, Drive, cron, or Groq behavior. Perform a focused browser or endpoint check for changed user-facing flows when those services are available.
- For schema work, inspect generated SQL and verify the intended database operation separately. Never use production data as an ad hoc test fixture.
- Report commands that were not run and checks blocked by missing credentials or services. Leave unrelated working-tree changes untouched and do not commit unless the user asks.
