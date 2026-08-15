"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { procurementRequests } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { createNotification } from "@/lib/notifications";

async function requireMember() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Member asks PPIT to purchase a new item (§4b) - distinct from donating a
// personal one (§4a). No real money moves here; this is tracking only.
export async function createProcurementRequest(formData: FormData) {
  const userId = await requireMember();
  const itemName = String(formData.get("itemName") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const estimatedCostRaw = String(formData.get("estimatedCost") ?? "").trim();
  const urgency = String(formData.get("urgency") ?? "medium");

  if (!itemName) throw new Error("Nama barang wajib diisi");

  const estimatedCost = estimatedCostRaw ? Number(estimatedCostRaw) : null;
  if (estimatedCost !== null && (!Number.isFinite(estimatedCost) || estimatedCost < 0)) {
    throw new Error("Perkiraan biaya harus berupa angka positif");
  }

  await db.insert(procurementRequests).values({
    userId,
    itemName,
    category: category || null,
    justification: justification || null,
    imageUrl: imageUrl || null,
    estimatedCost: estimatedCost !== null ? Math.round(estimatedCost) : null,
    urgency: (["low", "medium", "high"].includes(urgency) ? urgency : "medium") as "low" | "medium" | "high",
  });

  revalidatePath("/inventory/request-new");
}

// Admin workflow: approve / reject / mark fulfilled (§4b).
export async function reviewProcurement(formData: FormData) {
  const session = await auth();
  if (!hasModuleAccess(session?.user?.adminScope ?? null, "inventory")) throw new Error("Forbidden");
  const actorId = session!.user.id;

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");

  const [req] = await db.select().from(procurementRequests).where(eq(procurementRequests.id, id));
  if (!req) return;

  if (decision === "approve" && req.status === "pending") {
    await db
      .update(procurementRequests)
      .set({ status: "approved", reviewedBy: actorId, reviewedAt: new Date() })
      .where(eq(procurementRequests.id, id));
    await notify(req.userId, req.itemName, "disetujui");
  } else if (decision === "reject" && req.status === "pending") {
    await db
      .update(procurementRequests)
      .set({ status: "rejected", reviewedBy: actorId, reviewedAt: new Date() })
      .where(eq(procurementRequests.id, id));
    await notify(req.userId, req.itemName, "ditolak");
  } else if (decision === "fulfill" && req.status === "approved") {
    await db
      .update(procurementRequests)
      .set({ status: "fulfilled", fulfilledAt: new Date() })
      .where(eq(procurementRequests.id, id));
  }

  revalidatePath("/console/inventory");
}

async function notify(userId: string, itemName: string, verb: string) {
  await createNotification({
    userId,
    title: `Usulan pengadaan ${verb}`,
    body: `Usulan barang "${itemName}" telah ${verb} oleh admin.`,
    relatedEntityType: "procurement_request",
    relatedEntityId: userId,
  });
}
