import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ContributeForm } from "@/components/inventory/contribute-form";

export default async function ContributePage() {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent("/inventory/contribute")}`);

  const all = await db.select({ category: inventoryItems.category }).from(inventoryItems);
  const categories = [...new Set(all.map((i) => i.category).filter((c): c is string => !!c))];

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16">
        <h1 className="text-headline-lg text-on-background mb-2">Sumbangkan / Pinjamkan Barang</h1>
        <p className="text-body-md text-on-surface-variant mb-8 max-w-2xl">
          Punya barang pribadi yang ingin disumbangkan atau dipinjamkan ke PPIT? Ajukan di sini. Admin akan meninjau
          pengajuan dan mengabari kamu lewat notifikasi.
        </p>
        <ContributeForm categories={categories} />
      </main>
      <SiteFooter />
    </div>
  );
}
