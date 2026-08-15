import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { BorrowRequestForm } from "@/components/borrow-request-form";

export default async function BorrowRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

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
