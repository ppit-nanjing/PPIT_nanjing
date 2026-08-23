"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { managementPeriods, shortLinks } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope-constants";

export type ShortLinkFormState = { error?: string };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9](-?[a-z0-9])*$/.test(value) && value.length <= 60;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function requireLinksAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
  return session.user.id;
}

async function resolvePeriodId(formData: FormData, actorId: string): Promise<string | null> {
  const selected = String(formData.get("managementPeriodId") ?? "").trim();
  if (selected && selected !== "none") return selected;
  const newPeriod = String(formData.get("newPeriod") ?? "").trim();
  if (!newPeriod) return null;
  const [existing] = await db
    .select({ id: managementPeriods.id })
    .from(managementPeriods)
    .where(eq(managementPeriods.label, newPeriod))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(managementPeriods)
    .values({ label: newPeriod, createdBy: actorId })
    .returning();
  return created.id;
}

export async function createShortLink(
  _prev: ShortLinkFormState,
  formData: FormData,
): Promise<ShortLinkFormState> {
  const actorId = await requireLinksAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const targetUrl = String(formData.get("targetUrl") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "other").trim() as
    | "documentation"
    | "file"
    | "form"
    | "other";
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();

  if (!title) return { error: "Judul wajib diisi." };
  if (!targetUrl) return { error: "URL tujuan wajib diisi." };
  if (!isValidHttpUrl(targetUrl)) return { error: "URL tujuan harus diawali http:// atau https://" };

  const slug = rawSlug ? slugify(rawSlug) : slugify(title);
  if (!slug) return { error: "Slug tidak valid (huruf/angka saja)." };
  if (!isValidSlug(slug)) return { error: "Slug hanya boleh huruf, angka, dan tanda hubung." };

  const [collision] = await db
    .select({ id: shortLinks.id })
    .from(shortLinks)
    .where(eq(shortLinks.slug, slug))
    .limit(1);
  if (collision) return { error: `Slug "${slug}" sudah dipakai. Gunakan slug lain.` };

  const managementPeriodId = await resolvePeriodId(formData, actorId);
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  await db.insert(shortLinks).values({
    slug,
    targetUrl,
    title,
    description,
    category,
    managementPeriodId,
    expiresAt,
    createdBy: actorId,
  });

  revalidatePath("/console/links");
  redirect("/console/links");
}

export async function updateShortLink(
  id: string,
  _prev: ShortLinkFormState,
  formData: FormData,
): Promise<ShortLinkFormState> {
  const actorId = await requireLinksAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const targetUrl = String(formData.get("targetUrl") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "other").trim() as
    | "documentation"
    | "file"
    | "form"
    | "other";
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!title) return { error: "Judul wajib diisi." };
  if (!targetUrl) return { error: "URL tujuan wajib diisi." };
  if (!isValidHttpUrl(targetUrl)) return { error: "URL tujuan harus diawali http:// atau https://" };

  const managementPeriodId = await resolvePeriodId(formData, actorId);
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  await db
    .update(shortLinks)
    .set({
      title,
      targetUrl,
      description,
      category,
      managementPeriodId,
      expiresAt,
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(shortLinks.id, id));

  revalidatePath("/console/links");
  revalidatePath(`/console/links/${id}`);
  redirect("/console/links");
}

export async function deleteShortLink(id: string) {
  await requireLinksAdmin();
  await db.delete(shortLinks).where(eq(shortLinks.id, id));
  revalidatePath("/console/links");
  redirect("/console/links");
}

export async function toggleShortLink(id: string) {
  await requireLinksAdmin();
  const [link] = await db.select({ isActive: shortLinks.isActive }).from(shortLinks).where(eq(shortLinks.id, id)).limit(1);
  if (!link) return;
  await db.update(shortLinks).set({ isActive: !link.isActive, updatedAt: new Date() }).where(eq(shortLinks.id, id));
  revalidatePath("/console/links");
}

// Nothing else in the codebase ever sets isCurrent=true except src/db/seed.ts -
// there was no admin-facing way to activate a period at all, despite the
// Dokumen module's own page telling admins to do exactly this from here.
// Only one period is ever "current" at a time, since folderAccess()/
// getCurrentPeriodId() in the Dokumen module assume a single active period.
//
// Unlike the other actions in this file, this one has org-wide blast radius -
// it changes which Drive folders every member sees in the Dokumen module, not
// just a single short link - so it's gated on the "links" module scope
// specifically rather than reusing requireLinksAdmin()'s generic isAdmin
// check (which passes for any admin holding any single module, e.g. one
// scoped only to "events").
export async function setActivePeriod(id: string) {
  const session = await auth();
  if (!session?.user || !hasModuleAccess(session.user.adminScope, "links")) throw new Error("Forbidden");

  const [target] = await db.select({ id: managementPeriods.id }).from(managementPeriods).where(eq(managementPeriods.id, id)).limit(1);
  if (!target) throw new Error("Periode tidak ditemukan.");

  // Single statement, not select-then-two-updates: correct even under
  // concurrent calls, and avoids the failure mode where an update against a
  // stale/nonexistent id would unset isCurrent on every row while setting it
  // on none, leaving no period active with no error surfaced anywhere.
  await db.update(managementPeriods).set({ isCurrent: sql`${managementPeriods.id} = ${id}` });

  revalidatePath("/console/links");
  revalidatePath("/documents");
  revalidatePath("/console/documents");
}

export async function createManagementPeriod(
  _prev: ShortLinkFormState,
  formData: FormData,
): Promise<ShortLinkFormState> {
  await requireLinksAdmin();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Nama periode wajib diisi." };
  const [existing] = await db
    .select({ id: managementPeriods.id })
    .from(managementPeriods)
    .where(eq(managementPeriods.label, label))
    .limit(1);
  if (existing) return { error: "Periode dengan nama tersebut sudah ada." };
  await db.insert(managementPeriods).values({ label });
  revalidatePath("/console/links");
  revalidatePath("/console/links/new");
  return {};
}
