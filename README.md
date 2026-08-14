# PPIT Nanjing

Portal web resmi Perhimpunan Pelajar Indonesia Tiongkok (PPIT) Cabang Nanjing.

Full docs (information architecture, design system, spacing system, ERD, tech stack): **[docs/README.md](./docs/README.md)**

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Drizzle ORM + Neon (Postgres). See [docs/Tech Stack.md](./docs/Tech%20Stack.md) for the full rationale.

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL
npm run db:push        # create tables in Neon
npm run db:seed        # seed org structure (departments/roles) from the recruitment guidebook
npm run dev
```
