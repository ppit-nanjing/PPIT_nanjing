import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { BorrowRequestForm } from "@/components/borrow-request-form";
import { requireCompletedSensus } from "@/lib/sensus-gate";
import { conditionLabel } from "@/lib/inventory-labels";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function BorrowRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCompletedSensus(`/inventory/${id}/borrow`);

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
  if (!item) notFound();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <Link
          href="/inventory"
          aria-label="Kembali ke Inventaris"
          className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md mb-6 motion-reduce:transition-none"
        >
          <ArrowLeft size={14} aria-hidden /> Inventaris
        </Link>
        <h1 className="text-headline-lg text-on-background mb-2">Ajukan Peminjaman</h1>
        <p className="text-body-md text-on-surface-variant mb-10">
          {item.name} &middot; {item.availableQuantity} unit tersedia &middot; Kondisi:{" "}
          {conditionLabel(item.condition)}
        </p>

        <BorrowRequestForm itemId={id} maxQuantity={item.availableQuantity} itemLocation={item.location} />
      </main>
      <SiteFooter />
    </div>
  );
}
