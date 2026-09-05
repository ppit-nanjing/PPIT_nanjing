import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { BorrowRequestForm } from "@/components/borrow-request-form";
import { auth } from "@/auth";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { upcomingReservations } from "@/lib/inventory-reservations";
import { conditionLabel } from "@/lib/inventory-labels";
import { ArrowLeft, CalendarClock, Info } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function BorrowRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
  if (!item) notFound();

  const reservations = await upcomingReservations(id);

  // Jalur peminjam: INTERNAL = mahasiswa tersensus yang login; sisanya EKSTERNAL
  // (pihak luar) - isi kontak lengkap, tanpa akun.
  const session = await auth();
  const isInternal = session?.user?.id ? await hasCompletedSensus(session.user.id) : false;

  const { t } = await getT();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <Link
          href="/inventory"
          aria-label={t("inventory.back")}
          className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md mb-6 motion-reduce:transition-none"
        >
          <ArrowLeft size={14} aria-hidden /> {t("nav.inventory")}
        </Link>
        <h1 className="text-headline-lg text-on-background mb-2">{t("inventory.borrowButton")}</h1>
        <p className="text-body-md text-on-surface-variant mb-10">
          {item.name} &middot; {t("inventory.unitsAvailable", { count: item.availableQuantity })} &middot;{" "}
          {t("inventory.conditionLabel")}: {conditionLabel(item.condition)}
        </p>

        {item.availableQuantity < 1 ? (
          // Stok habis: semua unit sedang dipinjam. Daftar /inventory memang
          // menyembunyikan tombol pinjam saat ini, tapi rute ini bisa diakses
          // langsung atau stok bisa habis setelah halaman dimuat.
          <div className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-5">
            <Info className="mt-0.5 shrink-0 text-primary-container" size={18} aria-hidden />
            <div>
              <p className="text-body-md text-on-background mb-1">{t("inventory.form.outOfStockTitle")}</p>
              <p className="text-body-sm text-on-surface-variant">{t("inventory.form.outOfStockDesc")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-5">
              <Info className="mt-0.5 shrink-0 text-primary-container" size={18} aria-hidden />
              <p className="text-body-sm text-on-surface-variant">
                {isInternal
                  ? "Kamu mengajukan sebagai peminjam internal PPIT — nama & kontakmu diambil dari akun."
                  : "Kamu mengajukan sebagai pihak luar. Isi data kontak selengkapnya; Divisi Logistik akan menghubungimu lewat WeChat / Email untuk konfirmasi. Pengajuan tidak otomatis disetujui."}
              </p>
            </div>

            {reservations.length > 0 && (
              <div className="mb-8 flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-5">
                <p className="flex items-center gap-2 text-label-caps uppercase tracking-wide text-primary-container">
                  <CalendarClock size={14} aria-hidden /> Tanggal yang sudah dipesan
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  Barang ini sudah dibooking untuk acara PPIT pada periode berikut — pengajuan dengan tanggal yang beririsan akan ditolak.
                </p>
                <ul className="flex flex-col gap-1">
                  {reservations.map((r) => (
                    <li key={r.id} className="text-body-md text-on-background">
                      {r.reservedFrom} – {r.reservedTo} <span className="text-on-surface-variant">· {r.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <BorrowRequestForm
              itemId={id}
              maxQuantity={item.availableQuantity}
              itemLocation={item.location}
              external={!isInternal}
            />
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
