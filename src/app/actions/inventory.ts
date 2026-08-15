"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { inventoryItems, borrowRequests } from "@/db/schema";
import { requireCompletedSensus } from "@/lib/sensus-gate";

export async function submitBorrowRequest(itemId: string, formData: FormData) {
  const session = await requireCompletedSensus(`/inventory/${itemId}/borrow`);

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
  if (!item) throw new Error("Barang tidak ditemukan");

  const quantity = Number(formData.get("quantity") ?? 1);
  const purpose = String(formData.get("purpose") ?? "").trim();
  const requestedFrom = String(formData.get("requestedFrom") ?? "");
  const requestedTo = String(formData.get("requestedTo") ?? "");

  if (quantity < 1) throw new Error("Jumlah tidak valid");
  if (quantity > item.availableQuantity) throw new Error("Jumlah melebihi stok yang tersedia");
  if (!purpose || !requestedFrom || !requestedTo) throw new Error("Semua kolom wajib diisi");

  await db.insert(borrowRequests).values({
    itemId,
    userId: session.user.id,
    quantity,
    purpose,
    requestedFrom,
    requestedTo,
  });

  redirect("/inventory/borrow/success");
}
