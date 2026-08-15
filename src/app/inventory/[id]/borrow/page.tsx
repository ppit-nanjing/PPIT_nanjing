import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { submitBorrowRequest } from "@/app/actions/inventory";

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

        <form action={submitBorrowRequest.bind(null, id)} className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jumlah *</span>
            <input
              type="number"
              name="quantity"
              min={1}
              max={item.availableQuantity}
              defaultValue={1}
              required
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Dari Tanggal *</span>
              <input
                type="date"
                name="requestedFrom"
                required
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Sampai Tanggal *</span>
              <input
                type="date"
                name="requestedTo"
                required
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Keperluan *</span>
            <textarea
              name="purpose"
              rows={4}
              required
              placeholder="mis. Dokumentasi acara Sumpah Pemuda"
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
            />
          </label>
          <button
            type="submit"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3.5 rounded-md hover:bg-primary transition-colors"
          >
            Kirim Pengajuan
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
