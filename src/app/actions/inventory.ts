"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { inventoryItems, borrowRequests } from "@/db/schema";
import { requireCompletedSensus } from "@/lib/sensus-gate";
import { overlappingReservations } from "@/lib/inventory-reservations";

export async function submitBorrowRequest(itemId: string, formData: FormData) {
  const session = await requireCompletedSensus(`/inventory/${itemId}/borrow`);

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
  if (!item) throw new Error("Barang tidak ditemukan");

  const quantity = Number(formData.get("quantity") ?? 1);
  const purpose = String(formData.get("purpose") ?? "").trim();
  const usageLocation = String(formData.get("usageLocation") ?? "").trim();
  const requestedFrom = String(formData.get("requestedFrom") ?? "");
  const requestedTo = String(formData.get("requestedTo") ?? "");
  const statementUrl = String(formData.get("statementUrl") ?? "").trim();

  if (quantity < 1) throw new Error("Jumlah tidak valid");
  if (quantity > item.availableQuantity) throw new Error("Jumlah melebihi stok yang tersedia");
  if (!purpose || !usageLocation || !requestedFrom || !requestedTo) throw new Error("Semua kolom wajib diisi");
  if (requestedTo < requestedFrom) throw new Error("Tanggal pengembalian tidak boleh sebelum tanggal peminjaman");

  // Aset yang sudah dipesan untuk acara PPIT tidak bisa dipinjam pada rentang
  // tanggal itu (SOP: cek jadwal biar tidak tabrakan).
  const clash = await overlappingReservations(itemId, requestedFrom, requestedTo);
  if (clash.length > 0) {
    const r = clash[0];
    throw new Error(
      `Barang ini sudah dipesan untuk "${r.reason}" pada ${r.reservedFrom}–${r.reservedTo}. Pilih tanggal lain.`,
    );
  }
  // Pernyataan Peminjam WAJIB dan harus berkas hasil unggah (blob / route
  // internal), bukan path lokal atau teks acak.
  if (!/^(https:\/\/[a-z0-9.-]*blob\.vercel-storage\.com\/|\/api\/)/i.test(statementUrl)) {
    throw new Error("Berkas Pernyataan Peminjam wajib diunggah");
  }

  await db.insert(borrowRequests).values({
    itemId,
    userId: session.user.id,
    quantity,
    purpose,
    usageLocation,
    requestedFrom,
    requestedTo,
    statementUrl,
  });

  redirect("/inventory/borrow/success");
}

// Borrower-initiated return ("Kembalikan" on /profile): flags the request so
// the Logistics Division sees "Konfirmasi Pengembalian" in the console queue.
// Actual stock restoration stays with markReturned() - only an admin who has
// physically received the item may confirm it.
export async function requestReturn(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [request] = await db
    .select()
    .from(borrowRequests)
    .where(and(eq(borrowRequests.id, requestId), eq(borrowRequests.userId, session.user.id)));
  if (!request) throw new Error("Pengajuan tidak ditemukan");
  if (!["borrowed", "overdue"].includes(request.status)) {
    throw new Error("Barang ini belum dalam status dipinjam");
  }
  if (request.returnRequestedAt) return;

  await db
    .update(borrowRequests)
    .set({ returnRequestedAt: new Date() })
    .where(eq(borrowRequests.id, requestId));

  revalidatePath("/profile");
}
