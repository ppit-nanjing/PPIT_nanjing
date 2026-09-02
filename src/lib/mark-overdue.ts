import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { borrowRequests, inventoryItems } from "@/db/schema";
import { createTemplatedNotification } from "@/lib/notifications";

function formatDate(date: string | null): string {
  if (!date) return "(sesuai kesepakatan)";
  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "long" });
}

/**
 * Tandai peminjaman yang masih "borrowed" tapi tanggal pengembaliannya sudah
 * lewat menjadi "overdue", lalu beri tahu peminjamnya satu kali. Dipanggil dari
 * cron dan (defensif) saat halaman konsol inventaris dibuka, sama seperti
 * publishDueEvents().
 */
export async function markOverdueBorrows(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  const nowOverdue = await db
    .update(borrowRequests)
    .set({ status: "overdue" })
    .where(
      and(
        eq(borrowRequests.status, "borrowed"),
        sql`${borrowRequests.requestedTo} is not null`,
        lt(borrowRequests.requestedTo, today),
      ),
    )
    .returning({ id: borrowRequests.id, userId: borrowRequests.userId, itemId: borrowRequests.itemId, requestedTo: borrowRequests.requestedTo });

  for (const r of nowOverdue) {
    try {
      const [item] = await db.select({ name: inventoryItems.name }).from(inventoryItems).where(eq(inventoryItems.id, r.itemId));
      await createTemplatedNotification({
        userId: r.userId,
        templateKey: "borrow_overdue",
        variables: { itemName: item?.name ?? "barang", returnDate: formatDate(r.requestedTo) },
        relatedEntityType: "borrow_request",
        relatedEntityId: r.id,
      });
    } catch (err) {
      console.error("[mark-overdue] notify failed:", err);
    }
  }

  return nowOverdue.length;
}
