// Seed idempoten untuk template Formulir BPH (docs/Formulir.md). Menyisipkan
// template bawaan yang slug-nya belum ada, sebagai DRAFT - tidak pernah
// menimpa template yang sudah diedit admin. Jalankan hanya dengan target DB
// yang disengaja:
//   npm run db:seed-forms
import { db } from "@/db";
import { formTemplates } from "@/db/schema";
import { FORM_TEMPLATE_DEFAULTS } from "@/lib/form-templates";

async function main() {
  const existing = await db.select({ slug: formTemplates.slug }).from(formTemplates);
  const existingSlugs = new Set(existing.map((row) => row.slug));
  const missing = FORM_TEMPLATE_DEFAULTS.filter((d) => !existingSlugs.has(d.slug));

  if (missing.length === 0) {
    console.log("Semua template bawaan sudah ada. Tidak ada yang diubah.");
    return;
  }

  await db.insert(formTemplates).values(
    missing.map((d) => ({
      slug: d.slug,
      title: d.title,
      description: d.description,
      status: "draft" as const,
      sections: d.sections,
    })),
  );
  for (const d of missing) console.log(`Dibuat (draft): ${d.slug} — ${d.title}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
