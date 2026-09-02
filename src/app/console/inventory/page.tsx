import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, borrowRequests, users, itemContributions, procurementRequests, externalLoans, itemReservations, events } from "@/db/schema";
import { createInventoryItem, updateInventoryItem } from "@/app/actions/admin-inventory";
import { FileUpload } from "@/components/upload/file-upload";
import { BorrowRequestQueue } from "@/components/console/borrow-request-queue";
import { ContributionReview } from "@/components/console/contribution-review";
import { ProcurementReview } from "@/components/console/procurement-review";
import { ExternalLoanManager } from "@/components/console/external-loan-manager";
import { ReservationManager } from "@/components/console/reservation-manager";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { markOverdueBorrows } from "@/lib/mark-overdue";
import { requireModuleAccess } from "@/lib/admin-scope";
import { Plus, Package, Pencil } from "lucide-react";
import Link from "next/link";
import { conditionLabel, INVENTORY_CONDITIONS, CONDITION_LABEL } from "@/lib/inventory-labels";
import { fieldInput as input, primaryBtn, Select } from "@/components/console/form";


export default async function ConsoleInventoryPage() {
  await requireModuleAccess("inventory");
  // Defensif: kalau cron tidak jalan, buka halaman ini tetap menandai yang
  // lewat jatuh tempo (pola sama dengan publishDueEvents di halaman acara).
  await markOverdueBorrows();
  // Perf: all five reads are independent - run them concurrently instead of
  // stacking five serial round trips to the Neon proxy.
  const [items, requests, contributions, procurements, loans, reservations, eventList, guide] = await Promise.all([
    db.select().from(inventoryItems),
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
      .where(eq(events.status, "published"))
      .orderBy(desc(events.startAt)),
    getGuide("inventaris"),
  ]);

  const itemOptions = items.map((i) => ({ id: i.id, name: i.name, availableQuantity: i.availableQuantity }));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Manajemen Inventaris</h1>
        <div className="flex items-center gap-3">
          {guide && <GuideButton title={guide.title} content={guide.content} docSlug="inventaris" />}
          <Link href="/console/inventory/audit-log" className="text-label-caps text-primary-container hover:text-primary transition-colors">
            Log Audit &rarr;
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <CollapsibleSection title="Pengajuan Peminjaman">
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
        </CollapsibleSection>

        <CollapsibleSection title="Pengajuan Sumbangan / Pinjaman Barang">
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
        </CollapsibleSection>

        <CollapsibleSection title="Usulan Pengadaan Barang">
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
        </CollapsibleSection>

        <CollapsibleSection title="Reservasi Aset untuk Acara">
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
        </CollapsibleSection>

        <CollapsibleSection title="Pinjam Keluar (Eksternal)">
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
        </CollapsibleSection>

        <CollapsibleSection title="Daftar Barang">
          <details className="mb-6 bg-surface-container-lowest border border-outline-variant rounded-xl">
            <summary className="flex items-center gap-2 px-6 py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
              <Plus size={16} /> Tambah Barang
            </summary>
            <form action={createInventoryItem} className="px-6 pb-6 flex flex-col gap-4">
              <input name="name" placeholder="Nama Barang *" required className="bg-soft-gray rounded-md p-3 text-body-md" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input name="category" placeholder="Kategori" className="bg-soft-gray rounded-md p-3 text-body-md" />
                <input name="location" placeholder="Lokasi Penyimpanan" className="bg-soft-gray rounded-md p-3 text-body-md" />
                <input name="custodian" placeholder="Pemegang (opsional)" className="bg-soft-gray rounded-md p-3 text-body-md" />
              </div>
              <input name="totalQuantity" type="number" min={1} placeholder="Jumlah Total *" required className="bg-soft-gray rounded-md p-3 text-body-md" />
              <textarea name="description" placeholder="Deskripsi" rows={2} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
              <FileUpload name="imageUrl" folder="inventory" label="Foto Barang (opsional)" placeholder="URL atau unggah gambar" />
              <button
                type="submit"
                className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
              >
                Tambah Barang
              </button>
            </form>
          </details>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.length === 0 && (
              <p className="text-body-md text-on-surface-variant col-span-full">Belum ada barang terdaftar.</p>
            )}
            {items.map((item) => (
              <div key={item.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={16} className="text-secondary" />
                  <h3 className="text-body-md font-semibold text-on-background">{item.name}</h3>
                </div>
                <p className="text-label-caps text-on-surface-variant">
                  {item.availableQuantity} / {item.totalQuantity} tersedia &middot; {conditionLabel(item.condition)}
                </p>
                {(item.category || item.location || item.custodian) && (
                  <p className="text-label-caps text-on-surface-variant/70 mt-1">
                    {[item.category, item.location, item.custodian && `Pemegang: ${item.custodian}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {/* Pure-HTML edit form: no client JS needed, matches the
                    create form above so both stay visually identical. */}
                <details className="mt-3">
                  <summary className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container cursor-pointer hover:text-primary transition-colors">
                    <Pencil size={12} /> Edit
                  </summary>
                  <form action={updateInventoryItem} className="mt-3 flex flex-col gap-3">
                    <input type="hidden" name="id" value={item.id} />
                    <input name="name" required defaultValue={item.name} placeholder="Nama Barang *" className={input} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input name="category" defaultValue={item.category ?? ""} placeholder="Kategori" className={input} />
                      <input name="location" defaultValue={item.location ?? ""} placeholder="Lokasi Penyimpanan" className={input} />
                      <input name="custodian" defaultValue={item.custodian ?? ""} placeholder="Pemegang" className={input} />
                      <Select name="condition" defaultValue={item.condition} aria-label="Kondisi" className="w-full">
                        {INVENTORY_CONDITIONS.map((c) => (
                          <option key={c} value={c}>
                            Kondisi: {CONDITION_LABEL[c]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-label-caps text-on-surface-variant">Jumlah total</span>
                        <input name="totalQuantity" type="number" min={0} required defaultValue={item.totalQuantity} className={input} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-label-caps text-on-surface-variant">Tersedia</span>
                        <input name="availableQuantity" type="number" min={0} required defaultValue={item.availableQuantity} className={input} />
                      </label>
                    </div>
                    <textarea name="description" rows={2} defaultValue={item.description ?? ""} placeholder="Deskripsi" className={`${input} resize-none`} />
                    <FileUpload name="imageUrl" folder="inventory" label="Foto Barang (opsional)" placeholder="URL atau unggah gambar" defaultValue={item.imageUrl ?? ""} />
                    <button type="submit" className={primaryBtn}>
                      Simpan Perubahan
                    </button>
                  </form>
                </details>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
