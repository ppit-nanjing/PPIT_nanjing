"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { inventoryItems, borrowRequests, inventoryAuditLogs } from "@/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
  return session.user.id;
}

export async function createInventoryItem(formData: FormData) {
  const actorId = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const totalQuantity = Number(formData.get("totalQuantity") ?? 0);
  if (!name || totalQuantity < 1) throw new Error("Nama dan jumlah wajib diisi dengan benar");

  const [item] = await db
    .insert(inventoryItems)
    .values({
      name,
      category: String(formData.get("category") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      totalQuantity,
      availableQuantity: totalQuantity,
    })
    .returning();

  await db.insert(inventoryAuditLogs).values({
    itemId: item.id,
    performedBy: actorId,
    action: "added",
    quantityDelta: totalQuantity,
    note: "Barang baru ditambahkan",
  });

  revalidatePath("/console/inventory");
}

export async function approveBorrowRequest(requestId: string) {
  const actorId = await requireAdmin();
  const [request] = await db.select().from(borrowRequests).where(eq(borrowRequests.id, requestId));
  if (!request || request.status !== "pending") return;

  await db
    .update(inventoryItems)
    .set({ availableQuantity: sql`${inventoryItems.availableQuantity} - ${request.quantity}` })
    .where(eq(inventoryItems.id, request.itemId));

  await db
    .update(borrowRequests)
    .set({ status: "approved", approvedBy: actorId })
    .where(eq(borrowRequests.id, requestId));

  revalidatePath("/console/inventory");
}

export async function rejectBorrowRequest(requestId: string) {
  const actorId = await requireAdmin();
  await db
    .update(borrowRequests)
    .set({ status: "rejected", approvedBy: actorId })
    .where(eq(borrowRequests.id, requestId));
  revalidatePath("/console/inventory");
}

export async function markReturned(requestId: string) {
  await requireAdmin();
  const [request] = await db.select().from(borrowRequests).where(eq(borrowRequests.id, requestId));
  if (!request || !["approved", "borrowed", "overdue"].includes(request.status)) return;

  await db
    .update(inventoryItems)
    .set({ availableQuantity: sql`${inventoryItems.availableQuantity} + ${request.quantity}` })
    .where(eq(inventoryItems.id, request.itemId));

  await db
    .update(borrowRequests)
    .set({ status: "returned", returnedAt: new Date() })
    .where(eq(borrowRequests.id, requestId));

  revalidatePath("/console/inventory");
}
