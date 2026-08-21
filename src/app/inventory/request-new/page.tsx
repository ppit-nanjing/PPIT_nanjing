import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProcurementForm } from "@/components/inventory/procurement-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function RequestNewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent("/inventory/request-new")}`);

  const all = await db.select({ category: inventoryItems.category }).from(inventoryItems);
  const categories = [...new Set(all.map((i) => i.category).filter((c): c is string => !!c))];

  const { t } = await getT();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16">
        <Link
          href="/inventory"
          aria-label={t("inventory.back")}
          className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md mb-6 motion-reduce:transition-none"
        >
          <ArrowLeft size={14} aria-hidden /> {t("nav.inventory")}
        </Link>
        <h1 className="text-headline-lg text-on-background mb-2">{t("inventory.requestNew")}</h1>
        <p className="text-body-md text-on-surface-variant mb-8 max-w-2xl">
          {t("inventory.requestNewIntro")}
        </p>
        <ProcurementForm categories={categories} />
      </main>
      <SiteFooter />
    </div>
  );
}
