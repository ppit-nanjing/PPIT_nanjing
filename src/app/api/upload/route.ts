import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { put } from "@vercel/blob";
import { hasModuleAccess, type AdminModule } from "@/lib/admin-scope";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
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
  news: "content",
  gallery: "content",
  album: "content",
  inventory: "inventory",
  events: "events",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "");

  if (!(file instanceof File)) return NextResponse.json({ error: "Tidak ada berkas" }, { status: 400 });
  if (!(folder in FOLDER_MODULE)) return NextResponse.json({ error: "Folder tidak valid" }, { status: 400 });
  const requiredModule = FOLDER_MODULE[folder];
  if (requiredModule && !hasModuleAccess(session.user.adminScope, requiredModule)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Berkas terlalu besar (maks 10MB)" }, { status: 413 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Tipe berkas tidak didukung" }, { status: 415 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // The Vercel Blob store + BLOB_READ_WRITE_TOKEN aren't provisioned yet
    // (owner/dashboard access required). Fail loudly rather than silently
    // storing nothing - see docs/Progress & Handoff.md Known gaps #3.
    return NextResponse.json({ error: "Unggah berkas belum dikonfigurasi" }, { status: 503 });
  }

  const blob = await put(`${folder}/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return NextResponse.json({ url: blob.url });
}
