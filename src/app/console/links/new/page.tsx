import { asc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { managementPeriods } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { ShortLinkForm } from "@/components/console/short-link-form";
import { createShortLink } from "@/app/actions/short-links";

export default async function NewShortLinkPage() {
  await requireModuleAccess("links");
  const periods = await db
    .select({ id: managementPeriods.id, label: managementPeriods.label })
    .from(managementPeriods)
    .orderBy(asc(managementPeriods.label));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <Link href="/console/links" className="text-label-caps uppercase tracking-wide text-secondary hover:text-on-background">
        ← Kembali ke Tautan
      </Link>
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mt-2 mb-6">Buat Tautan</h1>
      <ShortLinkForm action={createShortLink} periods={periods} submitLabel="Simpan Tautan" />
    </div>
  );
}
