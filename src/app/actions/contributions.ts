"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { itemContributions, inventoryItems, inventoryAuditLogs } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { createTemplatedNotification } from "@/lib/notifications";

async function requireMember() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Member submits a personal item to donate (permanent) or lend (temporary) to
// PPIT. Stays in item_contributions with status "pending" until an admin
// decides to fold it into the org catalog (§4a).
export async function createContribution(formData: FormData) {
  const userId = await requireMember();
  const name = String(formData.get("name") ?? "").trim();
  const contributionType = String(formData.get("contributionType") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const condition = String(formData.get("condition") ?? "good");
  const expectedReturnDate = String(formData.get("expectedReturnDate") ?? "").trim();

  if (!name) throw new Error("Nama barang wajib diisi");
  if (contributionType !== "donate" && contributionType !== "lend_to_org") {
    throw new Error("Pilih jenis kontribusi");
  }

  await db.insert(itemContributions).values({
    userId,
    name,
    category: category || null,
    description: description || null,
    imageUrl: imageUrl || null,
    condition: (["new", "good", "fair", "damaged", "retired"].includes(condition) ? condition : "good") as
      | "new"
      | "good"
      | "fair"
      | "damaged"
      | "retired",
    contributionType: contributionType as "donate" | "lend_to_org",
    expectedReturnDate: contributionType === "lend_to_org" ? (expectedReturnDate || null) : null,
  });

  revalidatePath("/inventory/contribute");
}

// Admin reviews a pending contribution: approve (merge into an existing item,
// or create a new catalog row) or reject. Manual only - no auto-merge (§4a).
export async function reviewContribution(formData: FormData) {
  const session = await auth();
  if (!hasModuleAccess(session?.user?.adminScope ?? null, "inventory")) throw new Error("Forbidden");
  const actorId = session!.user.id;

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const existingItemId = String(formData.get("existingItemId") ?? "").trim();

  const [contribution] = await db.select().from(itemContributions).where(eq(itemContributions.id, id));
  if (!contribution || contribution.status !== "pending") return;

  if (decision === "reject") {
    await db
      .update(itemContributions)
      .set({ status: "rejected", reviewedBy: actorId, reviewedAt: new Date() })
      .where(eq(itemContributions.id, id));
    await notifyContributor(contribution.userId, contribution.name, false);
    revalidatePath("/console/inventory");
    return;
  }

  if (decision === "approve") {
    if (existingItemId) {
      // Merge into an existing catalog item: bump its quantities by 1.
      await db
        .update(inventoryItems)
        .set({
          totalQuantity: sql`${inventoryItems.totalQuantity} + 1`,
          availableQuantity: sql`${inventoryItems.availableQuantity} + 1`,
        })
        .where(eq(inventoryItems.id, existingItemId));
      await db.insert(inventoryAuditLogs).values({
        itemId: existingItemId,
        performedBy: actorId,
        action: "added",
        quantityDelta: 1,
        note: `Sumbangan "${contribution.name}" digabung ke barang ini`,
      });
    } else {
      const [item] = await db
        .insert(inventoryItems)
        .values({
          name: contribution.name,
          category: contribution.category,
          description: contribution.description,
          imageUrl: contribution.imageUrl,
          condition: contribution.condition,
          totalQuantity: 1,
          availableQuantity: 1,
        })
        .returning();
      await db.insert(inventoryAuditLogs).values({
        itemId: item.id,
        performedBy: actorId,
        action: "added",
        quantityDelta: 1,
        note: `Dari sumbangan ${contribution.contributionType} oleh anggota`,
      });
    }
    await db
      .update(itemContributions)
      .set({ status: "approved", reviewedBy: actorId, reviewedAt: new Date() })
      .where(eq(itemContributions.id, id));
    await notifyContributor(contribution.userId, contribution.name, true);
    revalidatePath("/console/inventory");
  }
}

async function notifyContributor(userId: string, itemName: string, approved: boolean) {
  await createTemplatedNotification({
    userId,
    templateKey: approved ? "contribution_approved" : "contribution_rejected",
    variables: { itemName },
    relatedEntityType: "item_contribution",
    relatedEntityId: userId,
  });
}
