import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { managementPeriods, shortLinks } from "@/db/schema";
import { LinkDirectory } from "@/components/link-directory";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  documentation: "Dokumentasi",
  file: "Berkas",
  form: "Formulir",
  other: "Lainnya",
};

export default async function LinkDirectoryPage() {
  const now = new Date();
  const links = await db
    .select({
      id: shortLinks.id,
      slug: shortLinks.slug,
      title: shortLinks.title,
      description: shortLinks.description,
      category: shortLinks.category,
      createdAt: shortLinks.createdAt,
      periodLabel: managementPeriods.label,
    })
    .from(shortLinks)
    .leftJoin(managementPeriods, eq(shortLinks.managementPeriodId, managementPeriods.id))
    .where(
      and(
        eq(shortLinks.isActive, true),
        or(isNull(shortLinks.expiresAt), gt(shortLinks.expiresAt, now)),
      ),
    )
    .orderBy(desc(shortLinks.createdAt));

  const periods = await db
    .select({ id: managementPeriods.id, label: managementPeriods.label })
    .from(managementPeriods)
    .orderBy(managementPeriods.label);

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-headline-lg text-on-background mb-2">Tautan & Dokumen</h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          Kumpulan dokumentasi & berkas PPIT Nanjing. Cari berdasarkan judul, atau filter per kategori & periode
          kepengurusan.
        </p>
        <LinkDirectory
          links={links.map((l) => ({
            slug: l.slug,
            title: l.title,
            description: l.description ?? "",
            category: l.category,
            categoryLabel: CATEGORY_LABEL[l.category] ?? l.category,
            periodLabel: l.periodLabel ?? "-",
          }))}
          periods={periods}
          categoryLabels={CATEGORY_LABEL}
        />
      </div>
    </main>
  );
}
