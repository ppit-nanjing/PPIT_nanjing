import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, borrowRequests, users } from "@/db/schema";
import { createInventoryItem } from "@/app/actions/admin-inventory";
import { BorrowRequestQueue } from "@/components/console/borrow-request-queue";
import { requireModuleAccess } from "@/lib/admin-scope";
import { Plus, Package } from "lucide-react";

const CONDITION_LABEL: Record<string, string> = { good: "Baik", damaged: "Rusak", retired: "Pensiun" };

export default async function ConsoleInventoryPage() {
  await requireModuleAccess("inventory");
  const items = await db.select().from(inventoryItems);
  const requests = await db
    .select({ req: borrowRequests, itemName: inventoryItems.name, userName: users.name, userEmail: users.email })
    .from(borrowRequests)
    .leftJoin(inventoryItems, eq(borrowRequests.itemId, inventoryItems.id))
    .leftJoin(users, eq(borrowRequests.userId, users.id))
    .orderBy(desc(borrowRequests.requestedAt));

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-headline-lg text-on-background">Manajemen Inventaris</h1>
        <a href="/console/inventory/audit-log" className="text-label-caps text-primary-container hover:text-primary transition-colors">
          Log Audit &rarr;
        </a>
      </div>

      <h2 className="text-headline-md text-on-background mb-4">Pengajuan Peminjaman</h2>
      <BorrowRequestQueue
        requests={requests.map((r) => ({
          id: r.req.id,
          itemName: r.itemName ?? "(barang dihapus)",
          userName: r.userName,
          userEmail: r.userEmail,
          quantity: r.req.quantity,
          purpose: r.req.purpose,
          status: r.req.status,
          requestedFrom: r.req.requestedFrom,
          requestedTo: r.req.requestedTo,
        }))}
      />

      <h2 className="text-headline-md text-on-background mt-12 mb-4">Daftar Barang</h2>
      <details className="mb-6 bg-surface-container-lowest border border-outline-variant rounded-xl">
        <summary className="flex items-center gap-2 px-6 py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
          <Plus size={16} /> Tambah Barang
        </summary>
        <form action={createInventoryItem} className="px-6 pb-6 flex flex-col gap-4">
          <input name="name" placeholder="Nama Barang *" required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <div className="grid grid-cols-2 gap-4">
            <input name="category" placeholder="Kategori" className="bg-soft-gray rounded-md p-3 text-body-md" />
            <input name="location" placeholder="Lokasi Penyimpanan" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </div>
          <input name="totalQuantity" type="number" min={1} placeholder="Jumlah Total *" required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <textarea name="description" placeholder="Deskripsi" rows={2} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Tambah Barang
          </button>
        </form>
      </details>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {item.availableQuantity} / {item.totalQuantity} tersedia &middot; {CONDITION_LABEL[item.condition]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
