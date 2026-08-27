import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { put } from "@vercel/blob";
import { hasModuleAccess, type AdminModule } from "@/lib/admin-scope";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
];
// Restrict the blob "folder" to known prefixes so a client can't write anywhere.
// "resume" stays open to any signed-in user (applicants upload their own CV).
// Every other folder is admin content - map it to the module that already
// gates writing the DB row it accompanies, so the upload can't be used to
// stash arbitrary public files under admin-content folders without the
// matching admin scope.
const FOLDER_MODULE: Record<string, AdminModule | null> = {
  resume: null,
  sensus: null,
  avatar: null,
  // Bukti transfer peserta - pengirimnya user biasa yang sedang login,
  // bukan admin; verifikasinya tetap di tangan bendahara.
  "payment-proof": null,
  news: "content",
  gallery: "content",
  album: "content",
  inventory: "inventory",
  events: "events",
  membership: null,
  catalog: "content",
  donation: "organization",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ errorKey: "upload.errUnauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "");

  // CSRF defense-in-depth: the session cookie is SameSite=Lax (so cross-site
  // POSTs don't carry it), but we also reject any request whose Origin doesn't
  // match our host - cheap and stops same-site-but-cross-origin trickery.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.nextUrl.host) {
    return NextResponse.json({ errorKey: "upload.errForbidden" }, { status: 403 });
  }

  if (!(file instanceof File)) return NextResponse.json({ errorKey: "upload.errNoFile" }, { status: 400 });
  if (!(folder in FOLDER_MODULE)) return NextResponse.json({ errorKey: "upload.errFolder" }, { status: 400 });
  const requiredModule = FOLDER_MODULE[folder];
  if (requiredModule && !hasModuleAccess(session.user.adminScope, requiredModule)) {
    return NextResponse.json({ errorKey: "upload.errForbidden" }, { status: 403 });
  }
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { errorKey: "upload.errTooLarge", vars: { mb: MAX_BYTES / 1024 / 1024 } },
      { status: 413 },
    );
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ errorKey: "upload.errType" }, { status: 415 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // The Vercel Blob store + BLOB_READ_WRITE_TOKEN aren't provisioned yet
    // (owner/dashboard access required). Fail loudly rather than silently
    // storing nothing - see docs/Progress & Handoff.md Known gaps #3.
    return NextResponse.json({ errorKey: "upload.errNotConfigured" }, { status: 503 });
  }

  // Strip path separators / control chars so a malicious filename can't
  // traverse out of its folder in the blob key (addRandomSuffix also helps).
  const safeName = (file.name || "file").replace(/[^\w.\-]+/g, "_").slice(0, 100);
  const isPrivate = folder === "sensus";
  const ownerPath = isPrivate ? `${session.user.id}/` : "";
  const blob = await put(`${folder}/${ownerPath}${Date.now()}-${safeName}`, file, {
    access: isPrivate ? "private" : "public",
    addRandomSuffix: true,
  });
  const url = isPrivate
    ? `/api/sensus/student-card/${blob.pathname.split("/").map(encodeURIComponent).join("/")}`
    : blob.url;
  return NextResponse.json({ url });
}
