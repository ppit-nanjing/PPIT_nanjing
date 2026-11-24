import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { eq, desc, and, isNull, asc } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { inventoryItems, borrowRequests, users, itemContributions, procurementRequests, externalLoans, itemReservations, events } from "@/db/schema";
import { createInventoryItem } from "@/app/actions/admin-inventory";
import { FileUpload } from "@/components/upload/file-upload";
import { BorrowRequestQueue } from "@/components/console/borrow-request-queue";
import { ContributionReview } from "@/components/console/contribution-review";
import { ProcurementReview } from "@/components/console/procurement-review";
import { ExternalLoanManager } from "@/components/console/external-loan-manager";
import { ReservationManager } from "@/components/console/reservation-manager";
import { InventoryItemList } from "@/components/console/inventory-item-list";
import { ConsoleTabPanel } from "@/components/console/console-tab-panel";
import { EventsPageHeader } from "@/components/console/events-page-header";
import { GuideButton } from "@/components/console/guide-button";
import { SubmitButton } from "@/components/console/submit-button";
import { fieldInput as input, primaryBtn } from "@/components/console/form";
import { getGuide } from "@/lib/guides";
import { markOverdueBorrows } from "@/lib/mark-overdue";
import { requireModuleAccess } from "@/lib/admin-scope";
import { conditionLabel, BORROW_HOLDS_STOCK } from "@/lib/inventory-labels";

export const metadata: Metadata = { title: "Inventaris" };

type InventoryTab = "peminjaman" | "barang" | "keluar" | "reservasi" | "usulan";

// Kartu ala Google Form (sama dengan Panel Admin acara): judul + keterangan, isi selalu terbuka.
function PanelCard({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-col gap-0.5 border-b border-outline-variant px-4 py-4 sm:px-6">
        <h3 className="text-headline-sm text-on-background">{title}</h3>
        {description ? <p className="text-body-sm text-on-surface-variant">{description}</p> : null}
      </div>
      <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

function LedgerCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-surface-container-lowest px-5 py-4">
      <dt className="text-body-sm text-on-surface-variant">{label}</dt>
      {children}
    </div>
  );
}

export default async function ConsoleInventoryPage() {
  await requireModuleAccess("inventory");
  // Defensif: kalau cron tidak jalan, buka halaman ini tetap menandai yang
  // lewat jatuh tempo (pola sama dengan publishDueEvents di halaman acara).
  await markOverdueBorrows();
  const [items, requests, contributions, procurements, loans, reservations, eventList, guide] = await Promise.all([
    db.select().from(inventoryItems).orderBy(asc(inventoryItems.name)),
    db
      .select({ req: borrowRequests, itemName: inventoryItems.name, userName: users.name, userEmail: users.email })
      .from(borrowRequests)
      .leftJoin(inventoryItems, eq(borrowRequests.itemId, inventoryItems.id))
      .leftJoin(users, eq(borrowRequests.userId, users.id))
      .orderBy(desc(borrowRequests.requestedAt)),
    db
      .select({ c: itemContributions, userName: users.name, userEmail: users.email })
      .from(itemContributions)
      .leftJoin(users, eq(itemContributions.userId, users.id))
      .where(eq(itemContributions.status, "pending")),
    db
      .select({ r: procurementRequests, userName: users.name })
      .from(procurementRequests)
      .leftJoin(users, eq(procurementRequests.userId, users.id))
      .orderBy(desc(procurementRequests.createdAt)),
    db
      .select({ l: externalLoans, itemName: inventoryItems.name })
      .from(externalLoans)
      .leftJoin(inventoryItems, eq(externalLoans.itemId, inventoryItems.id))
      .where(eq(externalLoans.status, "active"))
      .orderBy(desc(externalLoans.loanedAt)),
    db
      .select({ r: itemReservations, itemName: inventoryItems.name, eventTitle: events.title })
      .from(itemReservations)
      .leftJoin(inventoryItems, eq(itemReservations.itemId, inventoryItems.id))
      .leftJoin(events, eq(itemReservations.eventId, events.id))
      .where(eq(itemReservations.status, "active"))
      .orderBy(desc(itemReservations.reservedFrom)),
    db
      .select({ id: events.id, title: events.title })
      .from(events)
      .where(and(eq(events.status, "published"), isNull(events.deletedAt)))
      .orderBy(desc(events.startAt)),
    getGuide("inventaris"),
  ]);

  const activeItems = items.filter((i) => i.condition !== "retired");
  // Barang Pensiun tidak bisa dipilih untuk pinjam keluar, reservasi, atau sumbangan.
  const itemOptions = activeItems.map((i) => ({ id: i.id, name: i.name, availableQuantity: i.availableQuantity }));

  // Angka ringkas di kepala halaman.
  const unitsTotal = activeItems.reduce((sum, i) => sum + i.totalQuantity, 0);
  const unitsAvailable = activeItems.reduce((sum, i) => sum + i.availableQuantity, 0);
  const borrowedOut = requests.filter((r) => BORROW_HOLDS_STOCK.includes(r.req.status)).length;
  const overdue = requests.filter((r) => r.req.status === "overdue").length;
  const borrowQueue = requests.filter(
    (r) => r.req.status === "pending" || (r.req.returnRequestedAt && (r.req.status === "borrowed" || r.req.status === "overdue")),
  ).length;
  const proposals = contributions.length + procurements.filter((p) => p.r.status === "pending").length;
  const needsAction = borrowQueue + proposals;

  const tabs: { key: InventoryTab; label: string; pending?: number; content: ReactNode }[] = [
    {
      key: "peminjaman",
      label: "Peminjaman",
      pending: borrowQueue,
      content: (
        <BorrowRequestQueue
          requests={requests.map((r) => ({
            id: r.req.id,
            itemName: r.itemName ?? "(barang dihapus)",
            userName: r.userName,
            userEmail: r.userEmail,
            borrowerName: r.req.borrowerName,
            borrowerEmail: r.req.borrowerEmail,
            borrowerWechat: r.req.borrowerWechat,
            borrowerPhone: r.req.borrowerPhone,
            quantity: r.req.quantity,
            purpose: r.req.purpose,
            usageLocation: r.req.usageLocation,
            statementUrl: r.req.statementUrl,
            status: r.req.status,
            requestedFrom: r.req.requestedFrom,
            requestedTo: r.req.requestedTo,
            returnRequestedAt: r.req.returnRequestedAt ? r.req.returnRequestedAt.toISOString() : null,
          }))}
        />
      ),
    },
    {
      key: "barang",
      label: "Barang",
      content: (
        <InventoryItemList
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            category: i.category,
            description: i.description,
            imageUrl: i.imageUrl,
            totalQuantity: i.totalQuantity,
            availableQuantity: i.availableQuantity,
            condition: i.condition,
            location: i.location,
            custodian: i.custodian,
          }))}
        />
      ),
    },
    {
      key: "keluar",
      label: "Pinjam Keluar",
      content: (
        <PanelCard
          title="Pinjam keluar ke pihak luar"
          description="Aset PPIT yang dipinjamkan langsung ke pihak di luar website (tanpa pengajuan). Stok berkurang saat dicatat dan kembali saat ditandai kembali."
        >
          <ExternalLoanManager
            items={itemOptions}
            loans={loans.map((x) => ({
              id: x.l.id,
              itemName: x.itemName ?? "(barang dihapus)",
              borrowerName: x.l.borrowerName,
              borrowerContact: x.l.borrowerContact,
              quantity: x.l.quantity,
              conditionOut: x.l.conditionOut,
              loanedAt: x.l.loanedAt.toISOString(),
              expectedReturnAt: x.l.expectedReturnAt,
            }))}
          />
        </PanelCard>
      ),
    },
    {
      key: "reservasi",
      label: "Reservasi",
      content: (
        <PanelCard title="Reservasi aset untuk acara">
          <ReservationManager
            items={itemOptions.map((i) => ({ id: i.id, name: i.name }))}
            events={eventList.map((e) => ({ id: e.id, name: e.title }))}
            reservations={reservations.map((x) => ({
              id: x.r.id,
              itemName: x.itemName ?? "(barang dihapus)",
              reason: x.r.reason,
              reservedFrom: x.r.reservedFrom,
              reservedTo: x.r.reservedTo,
              eventTitle: x.eventTitle ?? null,
            }))}
          />
        </PanelCard>
      ),
    },
    {
      key: "usulan",
      label: "Usulan Nanjinger",
      pending: proposals,
      content: (
        <div className="flex flex-col gap-4">
          <PanelCard
            title="Sumbangan & pinjaman barang"
            description="Barang pribadi yang ditawarkan Nanjinger. Belum milik PPIT sampai disetujui."
          >
            <ContributionReview
              contributions={contributions.map((x) => ({
                id: x.c.id,
                name: x.c.name,
                category: x.c.category,
                condition: conditionLabel(x.c.condition),
                contributionType: x.c.contributionType,
                userName: x.userName,
                userEmail: x.userEmail,
              }))}
              items={itemOptions}
            />
          </PanelCard>
          <PanelCard title="Usulan pengadaan" description="Barang yang diusulkan untuk dibeli PPIT. Pembeliannya tetap di luar website.">
            <ProcurementReview
              requests={procurements.map((x) => ({
                id: x.r.id,
                itemName: x.r.itemName,
                category: x.r.category,
                justification: x.r.justification,
                imageUrl: x.r.imageUrl,
                estimatedCost: x.r.estimatedCost,
                urgency: x.r.urgency,
                status: x.r.status,
                userName: x.userName,
              }))}
            />
          </PanelCard>
        </div>
      ),
    },
  ];

  return (
    <div className="px-3 py-4 sm:px-6 lg:px-8 lg:py-10">
      <EventsPageHeader
        title="Manajemen Inventaris"
        createLabel="Tambah Barang"
        guide={
          <>
            {guide && <GuideButton title={guide.title} content={guide.content} docSlug="inventaris" />}
            <Link
              href="/console/inventory/audit-log"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2.5 text-label-caps uppercase tracking-wide text-on-surface-variant transition-colors hover:text-primary-container"
            >
              Log Audit <ArrowRight size={14} aria-hidden />
            </Link>
          </>
        }
      >
        <form action={createInventoryItem} className="flex flex-col gap-4 px-4 pb-5 sm:px-6">
          <label className="flex flex-col gap-1">
            <span className="text-label-caps text-on-surface-variant">Nama barang *</span>
            <input name="name" required className={input} />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-label-caps text-on-surface-variant">Jumlah total *</span>
              <input name="totalQuantity" type="number" min={1} required className={input} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-caps text-on-surface-variant">Kategori</span>
              <input name="category" list="inventory-categories" className={input} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-caps text-on-surface-variant">Lokasi penyimpanan</span>
              <input name="location" className={input} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-caps text-on-surface-variant">Pemegang</span>
              <input name="custodian" className={input} />
            </label>
          </div>
          <datalist id="inventory-categories">
            {[...new Set(activeItems.map((i) => i.category).filter((c): c is string => !!c))].sort().map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <label className="flex flex-col gap-1">
            <span className="text-label-caps text-on-surface-variant">Deskripsi</span>
            <textarea name="description" rows={2} className={`${input} resize-none`} />
          </label>
          <FileUpload name="imageUrl" folder="inventory" label="Foto barang (opsional)" placeholder="URL atau unggah gambar" />
          <SubmitButton successMessage="Barang ditambahkan." className={primaryBtn}>
            Tambah Barang
          </SubmitButton>
        </form>
      </EventsPageHeader>

      <dl className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-outline-variant bg-outline-variant lg:grid-cols-4">
        <LedgerCell label="Barang aktif">
          <dd className="text-headline-md tabular-nums text-on-background">{activeItems.length}</dd>
          <dd className="text-body-sm tabular-nums text-on-surface-variant">{items.length - activeItems.length} pensiun</dd>
        </LedgerCell>
        <LedgerCell label="Unit tersedia">
          <dd className="tabular-nums text-on-background">
            <span className="text-headline-md">{unitsAvailable}</span>
            <span className="text-body-sm text-on-surface-variant"> / {unitsTotal}</span>
          </dd>
          <dd className="text-body-sm text-on-surface-variant">Dari barang aktif</dd>
        </LedgerCell>
        <LedgerCell label="Sedang dipinjam">
          <dd className="text-headline-md tabular-nums text-on-background">{borrowedOut + loans.length}</dd>
          <dd className={`text-body-sm tabular-nums ${overdue > 0 ? "text-tertiary" : "text-on-surface-variant"}`}>
            {overdue > 0 ? `${overdue} terlambat` : `${loans.length} ke pihak luar`}
          </dd>
        </LedgerCell>
        <LedgerCell label="Perlu tindakan">
          <dd className={`text-headline-md tabular-nums ${needsAction > 0 ? "text-gold-ink" : "text-on-background"}`}>{needsAction}</dd>
          <dd className="text-body-sm tabular-nums text-on-surface-variant">
            {needsAction > 0 ? [borrowQueue > 0 && `${borrowQueue} peminjaman`, proposals > 0 && `${proposals} usulan`].filter(Boolean).join(", ") : "Tidak ada antrean"}
          </dd>
        </LedgerCell>
      </dl>

      <ConsoleTabPanel
        id="inventory-panel"
        ariaLabel="Bagian manajemen inventaris"
        tabs={tabs}
        defaultTab={borrowQueue > 0 ? "peminjaman" : proposals > 0 ? "usulan" : "barang"}
      />
    </div>
  );
}
