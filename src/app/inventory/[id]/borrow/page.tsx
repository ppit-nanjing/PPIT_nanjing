import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { BorrowRequestForm } from "@/components/borrow-request-form";
import { requireCompletedSensus } from "@/lib/sensus-gate";

export default async function BorrowRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCompletedSensus(`/inventory/${id}/borrow`);

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
  if (!item) notFound();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <h1 className="text-headline-lg text-on-background mb-2">Ajukan Peminjaman</h1>
        <p className="text-body-md text-on-surface-variant mb-10">
          {item.name} &middot; {item.availableQuantity} unit tersedia
        </p>

        <BorrowRequestForm itemId={id} maxQuantity={item.availableQuantity} itemLocation={item.location} />
      </main>
      <SiteFooter />
    </div>
  );
}
