"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { inventoryItems, borrowRequests, inventoryAuditLogs, externalLoans } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { createTemplatedNotification } from "@/lib/notifications";

async function requireAdmin() {
  const session = await auth();
  if (!hasModuleAccess(session?.user?.adminScope ?? null, "inventory")) throw new Error("Forbidden");
  return session!.user.id;
}

// date columns come back as "YYYY-MM-DD" strings - render them as plain
// Indonesian dates for notification bodies.
function formatDate(date: string | null): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "long" });
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
      custodian: String(formData.get("custodian") ?? "").trim() || null,
      imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
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

  await createTemplatedNotification({
    userId: request.userId,
    templateKey: "borrow_approved",
    relatedEntityType: "borrow_request",
    relatedEntityId: requestId,
  });

  revalidatePath("/console/inventory");
}

// Handover step between "approved" and "returned": the admin physically hands
// the item to the borrower and flips the status to "borrowed", which is how
// everyone (borrower included, via their profile) can see the item is out of
// storage right now. Stock was already deducted at approval time.
export async function markHandedOver(requestId: string) {
  await requireAdmin();
  const [request] = await db.select().from(borrowRequests).where(eq(borrowRequests.id, requestId));
  if (!request || request.status !== "approved") return;

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, request.itemId));

  await db
    .update(borrowRequests)
    .set({ status: "borrowed" })
    .where(eq(borrowRequests.id, requestId));

  await createTemplatedNotification({
    userId: request.userId,
    templateKey: "borrow_handed_over",
    variables: {
      itemName: item?.name ?? "barang",
      returnDate: formatDate(request.requestedTo) ?? "(sesuai kesepakatan)",
    },
    relatedEntityType: "borrow_request",
    relatedEntityId: requestId,
  });

  revalidatePath("/console/inventory");
}

export async function rejectBorrowRequest(requestId: string) {
  const actorId = await requireAdmin();
  const [request] = await db.select().from(borrowRequests).where(eq(borrowRequests.id, requestId));
  if (!request) return;
  await db
    .update(borrowRequests)
    .set({ status: "rejected", approvedBy: actorId })
    .where(eq(borrowRequests.id, requestId));

  await createTemplatedNotification({
    userId: request.userId,
    templateKey: "borrow_rejected",
    relatedEntityType: "borrow_request",
    relatedEntityId: requestId,
  });

  revalidatePath("/console/inventory");
}

export async function markReturned(requestId: string) {
  await requireAdmin();
  const [request] = await db.select().from(borrowRequests).where(eq(borrowRequests.id, requestId));
  if (!request || !["approved", "borrowed", "overdue"].includes(request.status)) return;

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, request.itemId));

  await db
    .update(inventoryItems)
    .set({ availableQuantity: sql`${inventoryItems.availableQuantity} + ${request.quantity}` })
    .where(eq(inventoryItems.id, request.itemId));

  await db
    .update(borrowRequests)
    .set({ status: "returned", returnedAt: new Date(), returnRequestedAt: null })
    .where(eq(borrowRequests.id, requestId));

  // Close the loop with the borrower - they may have filed the return request
  // from their profile, or the admin handled it in person; either way they
  // should see the loan is settled.
  await createTemplatedNotification({
    userId: request.userId,
    templateKey: "borrow_return_requested_confirmed",
    variables: { itemName: item?.name ?? "barang" },
    relatedEntityType: "borrow_request",
    relatedEntityId: requestId,
  });

  revalidatePath("/console/inventory");
}

// §4c - PPIT lends its OWN asset to an external (non-registered) party. Admin
// only. Decrements availableQuantity and mirrors the event into
// inventory_audit_logs (action "lent_external") so the item's full history
// stays in one place.
export async function recordExternalLoan(formData: FormData) {
  const actorId = await requireAdmin();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const borrowerName = String(formData.get("borrowerName") ?? "").trim();
  const borrowerContact = String(formData.get("borrowerContact") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);
  const conditionOut = String(formData.get("conditionOut") ?? "").trim();
  const expectedReturnAt = String(formData.get("expectedReturnAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!itemId || !borrowerName) throw new Error("Barang dan nama peminjam wajib diisi");
  if (!Number.isFinite(quantity) || quantity < 1) throw new Error("Jumlah tidak valid");

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
  if (!item) throw new Error("Barang tidak ditemukan");
  if (item.availableQuantity < quantity) throw new Error("Stok tidak cukup untuk dipinjam keluar");

  await db
    .update(inventoryItems)
    .set({ availableQuantity: sql`${inventoryItems.availableQuantity} - ${quantity}` })
    .where(eq(inventoryItems.id, itemId));

  await db.insert(externalLoans).values({
    itemId,
    borrowerName,
    borrowerContact: borrowerContact || null,
    purpose: purpose || null,
    quantity,
    conditionOut: (["new", "good", "fair", "damaged", "retired"].includes(conditionOut) ? conditionOut : null) as
      | "new"
      | "good"
      | "fair"
      | "damaged"
      | "retired"
      | undefined,
    expectedReturnAt: expectedReturnAt || null,
    recordedBy: actorId,
    status: "active",
    notes: notes || null,
  });

  await db.insert(inventoryAuditLogs).values({
    itemId,
    performedBy: actorId,
    action: "lent_external",
    quantityDelta: -quantity,
    note: `Dipinjam keluar ke ${borrowerName}`,
  });

  revalidatePath("/console/inventory");
}

// §4c - external loan returned: restores stock and records condition_in.
export async function returnExternalLoan(formData: FormData) {
  const actorId = await requireAdmin();
  const loanId = String(formData.get("loanId") ?? "").trim();
  const conditionIn = String(formData.get("conditionIn") ?? "").trim();

  const [loan] = await db.select().from(externalLoans).where(eq(externalLoans.id, loanId));
  if (!loan || loan.status !== "active") return;

  await db
    .update(inventoryItems)
    .set({ availableQuantity: sql`${inventoryItems.availableQuantity} + ${loan.quantity}` })
    .where(eq(inventoryItems.id, loan.itemId));

  await db
    .update(externalLoans)
    .set({
      status: "returned",
      returnedAt: new Date(),
      conditionIn: (["new", "good", "fair", "damaged", "retired"].includes(conditionIn) ? conditionIn : null) as
        | "new"
        | "good"
        | "fair"
        | "damaged"
        | "retired"
        | undefined,
    })
    .where(eq(externalLoans.id, loanId));

  await db.insert(inventoryAuditLogs).values({
    itemId: loan.itemId,
    performedBy: actorId,
    action: "returned_external",
    quantityDelta: loan.quantity,
    note: `Dikembalikan oleh ${loan.borrowerName}`,
  });

  revalidatePath("/console/inventory");
}
