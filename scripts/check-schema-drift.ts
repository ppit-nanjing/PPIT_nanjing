/**
 * Cek drift antara `src/db/schema.ts` dan database (kolom + nilai enum).
 *
 * Kenapa ada: migrasi di repo ini dijalankan MANUAL (`src/db/apply-sql.ts`),
 * dan sudah dua kali kolom yang di-select kode belum ada di database —
 * terakhir `news_articles.content_html` (migrasi 0051) membuat beranda
 * produksi 500. Jalankan skrip ini setelah menarik perubahan yang membawa
 * migrasi baru, SEBELUM push/deploy:
 *
 *   npm run check:drift
 *
 * Yang dicek: setiap tabel/kolom di schema ada di DB, dan setiap nilai enum
 * pgEnum di schema ada di tipe enum Postgres. Yang TIDAK dicek: index,
 * constraint, tipe kolom, dan kolom ekstra di DB (kolom lama yang tak dipakai
 * schema sengaja dibiarkan — lihat riwayat drift di AGENTS.md).
 */
import { sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { db } from "@/db";
import * as schema from "@/db/schema";

async function main() {
  const colRows = await db.execute<{ table_name: string; column_name: string }>(
    sql`select table_name, column_name from information_schema.columns where table_schema = current_schema()`,
  );
  const dbCols = new Map<string, Set<string>>();
  for (const r of colRows.rows) {
    const s = dbCols.get(r.table_name) ?? new Set<string>();
    s.add(r.column_name);
    dbCols.set(r.table_name, s);
  }

  const enumRows = await db.execute<{ typname: string; labels: string[] }>(
    sql`select t.typname, array_agg(e.enumlabel order by e.enumsortorder) labels
        from pg_type t join pg_enum e on e.enumtypid = t.oid
        group by t.typname`,
  );
  const dbEnums = new Map(enumRows.rows.map((r) => [r.typname, r.labels]));

  const problems: string[] = [];
  let tablesChecked = 0;

  for (const value of Object.values(schema)) {
    // getTableConfig melempar untuk non-tabel (enum, relations, tipe) — lewati.
    let cfg: ReturnType<typeof getTableConfig>;
    try {
      cfg = getTableConfig(value as never);
    } catch {
      continue;
    }
    tablesChecked += 1;

    const cols = dbCols.get(cfg.name);
    if (!cols) {
      problems.push(`TABEL HILANG: ${cfg.name}`);
      continue;
    }
    const missingCols = cfg.columns.filter((c) => !cols.has(c.name)).map((c) => c.name);
    if (missingCols.length > 0) {
      problems.push(`KOLOM HILANG di ${cfg.name}: ${missingCols.join(", ")}`);
    }
    for (const c of cfg.columns) {
      const asEnum = c as unknown as { columnType?: string; enumValues?: string[]; dataType?: string };
      if (asEnum.columnType === "PgEnum" && asEnum.enumValues) {
        const enumName = asEnum.dataType ?? "";
        const dbLabels = dbEnums.get(enumName);
        if (!dbLabels) {
          problems.push(`ENUM HILANG di DB: ${enumName} (dipakai ${cfg.name}.${c.name})`);
        } else {
          const missing = asEnum.enumValues.filter((v) => !dbLabels.includes(v));
          if (missing.length > 0) {
            problems.push(`NILAI ENUM KURANG di ${enumName}: ${missing.join(", ")}`);
          }
        }
      }
    }
  }

  console.log(`Tabel dicek: ${tablesChecked}`);
  if (problems.length === 0) {
    console.log("OK: semua tabel, kolom, dan enum di schema.ts ada di database.");
  } else {
    console.log(`DITEMUKAN ${problems.length} masalah — jalankan migrasi yang tertinggal:`);
    for (const p of problems) console.log(" - " + p);
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
