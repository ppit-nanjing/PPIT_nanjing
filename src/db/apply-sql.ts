/**
 * Menjalankan satu berkas SQL di ./drizzle terhadap DATABASE_URL, pernyataan
 * per pernyataan.
 *
 * Ada karena `drizzle-kit push` di proyek ini TIDAK aman dipakai buta: ia
 * mendeteksi drift lama (unique constraint `coverage_cities.slug` yang belum
 * ada di database) dan menawarkan MEN-TRUNCATE tabel itu — dengan `--force`
 * tawaran itu diiyakan tanpa bertanya, dan 9 baris kota naungan hilang.
 * Menjalankan berkas migrasinya sendiri hanya mengubah apa yang memang ditulis.
 *
 * Pakai: npx tsx --env-file=.env src/db/apply-sql.ts drizzle/0012_xxx.sql
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "./index";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Sertakan path berkas SQL, contoh: drizzle/0012_sensus_branch_universities.sql");

  const raw = readFileSync(file, "utf8");
  // Pisah per ";" di akhir baris. Cukup untuk DDL sederhana di ./drizzle —
  // tidak ada function body atau string bertitik-koma di berkas-berkas itu.
  const statements = raw
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(--[^\n]*\n?)*$/.test(s));

  for (const statement of statements) {
    const label = statement.split("\n").filter((l) => !l.trim().startsWith("--"))[0]?.slice(0, 70);
    process.stdout.write(`→ ${label}\n`);
    await db.execute(sql.raw(statement));
  }

  console.log(`\nSelesai: ${statements.length} pernyataan dari ${file}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
