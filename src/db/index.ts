import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { createRequire } from "node:module";
import * as schema from "./schema";

type Database = NeonHttpDatabase<typeof schema>;

// Neon cuma bisa diakses lewat HTTP API-nya, jadi driver neon-http tidak bisa
// menyambung ke Postgres biasa. Di mesin lokal (docker compose, lihat
// docker-compose.yml) `DB_DRIVER=pg` memakai driver node-postgres.
//
// createRequire dipakai supaya `pg` - devDependency - tidak ikut terbundel ke
// fungsi produksi: namanya tidak bisa dibaca statis oleh bundler.
const requireLocal = createRequire(import.meta.url);

function localDatabase(connectionString: string): Database {
  const { Pool } = requireLocal("pg") as unknown as typeof import("pg");
  const { drizzle: drizzlePg } = requireLocal(
    "drizzle-orm/node-postgres",
  ) as unknown as typeof import("drizzle-orm/node-postgres");
  // Dua driver ini memakai query builder yang sama, bedanya cuma cara mengirim
  // query ke server. Cast-nya demi tipe yang sudah dipakai pemanggil.
  return drizzlePg(new Pool({ connectionString }), { schema }) as unknown as Database;
}

const connectionString = process.env.DATABASE_URL!;

export const db: Database =
  process.env.DB_DRIVER === "pg"
    ? localDatabase(connectionString)
    : drizzle(neon(connectionString), { schema });
