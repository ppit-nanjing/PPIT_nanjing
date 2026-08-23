"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { shortLinks } from "@/db/schema";
import { createFolder, uploadFile, renameFile, trashFile, setLinkViewer, getFileMeta } from "@/lib/drive";
import { resolveDriveFolder } from "@/lib/drive-folders";
import { folderAccess } from "@/lib/drive-access";
import { hasModuleAccess } from "@/lib/admin-scope-constants";
import type { Session } from "next-auth";

// Read-only listing (getFolderContents, getMemberDepartments) lives in
// @/lib/drive-queries, not here - see that file's header comment for why
// keeping data loaders out of a "use server" file matters.
export type { DriveItem, FolderContents } from "@/lib/drive-queries";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function createAutoShortLink(targetUrl: string, title: string, periodId: string | null, actorId: string) {
  const base = slugify(title) || "berkas";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const [collision] = await db.select({ id: shortLinks.id }).from(shortLinks).where(eq(shortLinks.slug, slug)).limit(1);
    if (!collision) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  await db.insert(shortLinks).values({
    slug,
    targetUrl,
    title,
    category: "file",
    managementPeriodId: periodId,
    createdBy: actorId,
  });
  return slug;
}

// Discriminated on isDocsAdmin so periodId is `string` (not `string | null`)
// in the non-admin branch by construction - callers below no longer need to
// re-check `!periodId` themselves; the type system does it. Admins don't
// carry a periodId at all here because they aren't scoped to one.
type WriteContext = { session: Session } & (
  | { isDocsAdmin: true }
  | { isDocsAdmin: false; periodId: string }
);

async function assertWrite(periodId: string | null, departmentId: string | null): Promise<WriteContext> {
  const session = await auth();
  if (!session?.user) throw new Error("Forbidden");
  // Only a documents-module admin may bypass division/period scoping. This is
  // derived from the session, never trusted from client input.
  if (hasModuleAccess(session.user.adminScope, "documents")) {
    return { session, isDocsAdmin: true };
  }
  if (!periodId) throw new Error("Periode tidak diketahui");
  const a = await folderAccess({
    userId: session.user.id,
    adminScope: session.user.adminScope,
    periodId,
    departmentId,
  });
  if (a !== "write") throw new Error("Kamu tidak punya akses tulis ke folder ini.");
  return { session, isDocsAdmin: false, periodId };
}

// SECURITY: assertWrite() only proves the caller may write *somewhere* in
// (periodId, departmentId) - it says nothing about the parentDriveFolderId
// the client also sent, which for a non-admin must never be trusted as-is
// (a member could pass their own periodId/departmentId to pass the check
// above while pointing parentDriveFolderId at a different division's
// folder id, discoverable from the read-only sections rendered on
// /documents). Docs admins are exempt because they're allowed to write
// anywhere already, including ad-hoc subfolders not tracked in
// drive_folders (reached via the console's ?folder= navigation), so there's
// no server-derivable "correct" parent to compare against for them.
async function resolveWriteTarget(ctx: WriteContext, departmentId: string | null, clientParentId: string): Promise<string> {
  if (ctx.isDocsAdmin) {
    if (!clientParentId) throw new Error("Folder tujuan tidak diketahui.");
    return clientParentId;
  }
  return resolveDriveFolder({ periodId: ctx.periodId, departmentId });
}

// Same rationale as resolveWriteTarget(), for rename/trash: the FormData
// fileId is never bound to (periodId, departmentId) by assertWrite(), so a
// non-admin could pass their own division to pass the write check while
// naming a file that actually lives in a different division's folder.
// Verify the file's real parent against the resolved folder before mutating.
// getFileMeta (a Drive API call) is only made when actually needed - admins
// skip the parent check entirely, and rename never needs webViewLink, so
// neither should pay for a Drive round-trip whose result goes unused.
async function assertFileInScope(
  ctx: WriteContext,
  departmentId: string | null,
  fileId: string,
  opts: { needsWebViewLink: boolean },
): Promise<{ webViewLink: string | null }> {
  if (ctx.isDocsAdmin) {
    if (!opts.needsWebViewLink) return { webViewLink: null };
    return getFileMeta(fileId);
  }
  const trustedFolderId = await resolveDriveFolder({ periodId: ctx.periodId, departmentId });
  const meta = await getFileMeta(fileId);
  if (!meta.parents.includes(trustedFolderId)) throw new Error("Berkas tidak berada di folder ini.");
  return meta;
}

export async function createDriveFolderAction(formData: FormData): Promise<void> {
  const periodId = (formData.get("periodId") as string) || null;
  const departmentIdRaw = (formData.get("departmentId") as string) || "";
  const departmentId = departmentIdRaw && departmentIdRaw !== "null" ? departmentIdRaw : null;
  const parentDriveFolderId = formData.get("parentDriveFolderId") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Nama folder wajib diisi.");
  const ctx = await assertWrite(periodId, departmentId);
  const trustedParentId = await resolveWriteTarget(ctx, departmentId, parentDriveFolderId);
  await createFolder(name, trustedParentId);
}

export async function uploadDriveFileAction(formData: FormData): Promise<void> {
  const periodId = (formData.get("periodId") as string) || null;
  const departmentIdRaw = (formData.get("departmentId") as string) || "";
  const departmentId = departmentIdRaw && departmentIdRaw !== "null" ? departmentIdRaw : null;
  const parentDriveFolderId = formData.get("parentDriveFolderId") as string;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Pilih berkas terlebih dahulu.");

  const ctx = await assertWrite(periodId, departmentId);
  const trustedParentId = await resolveWriteTarget(ctx, departmentId, parentDriveFolderId);

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadFile(file.name, trustedParentId, buffer, file.type || "application/octet-stream");
  try {
    const webViewLink = await setLinkViewer(uploaded.id);
    await createAutoShortLink(webViewLink, file.name, periodId, ctx.session.user.id);
  } catch (err) {
    // The file itself already landed in Drive above; if making it public or
    // recording the short link fails, don't leave an orphaned, inaccessible
    // file sitting in the folder for the user to (probably) re-upload as a
    // duplicate - undo the upload and surface the original error.
    await trashFile(uploaded.id).catch(() => {});
    throw err;
  }
}

export async function renameDriveFileAction(formData: FormData): Promise<void> {
  const periodId = (formData.get("periodId") as string) || null;
  const departmentIdRaw = (formData.get("departmentId") as string) || "";
  const departmentId = departmentIdRaw && departmentIdRaw !== "null" ? departmentIdRaw : null;
  const fileId = formData.get("fileId") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!fileId) throw new Error("Berkas tidak diketahui.");
  if (!name) throw new Error("Nama wajib diisi.");
  const ctx = await assertWrite(periodId, departmentId);
  await assertFileInScope(ctx, departmentId, fileId, { needsWebViewLink: false });
  await renameFile(fileId, name);
}

export async function trashDriveFileAction(formData: FormData): Promise<void> {
  const periodId = (formData.get("periodId") as string) || null;
  const departmentIdRaw = (formData.get("departmentId") as string) || "";
  const departmentId = departmentIdRaw && departmentIdRaw !== "null" ? departmentIdRaw : null;
  const fileId = formData.get("fileId") as string;
  if (!fileId) throw new Error("Berkas tidak diketahui.");
  const ctx = await assertWrite(periodId, departmentId);
  const { webViewLink } = await assertFileInScope(ctx, departmentId, fileId, { needsWebViewLink: true });
  await trashFile(fileId);
  // Otherwise the /l/xxx short link survives pointing at a file Drive will
  // 404 immediately and permanently delete in ~30 days. Scoped to
  // category "file" (what createAutoShortLink always sets) so this doesn't
  // sweep up an unrelated manually-created short link that happens to point
  // at the same URL - targetUrl itself isn't unique. Best-effort: the file
  // is already trashed regardless of whether this cleanup succeeds, so a
  // transient DB error here must not make the action report failure.
  if (webViewLink) {
    await db
      .update(shortLinks)
      .set({ isActive: false })
      .where(and(eq(shortLinks.targetUrl, webViewLink), eq(shortLinks.category, "file")))
      .catch(() => {});
  }
}
