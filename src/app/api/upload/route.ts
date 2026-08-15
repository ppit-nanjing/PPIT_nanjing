import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { put } from "@vercel/blob";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
// Restrict the blob "folder" to known prefixes so a client can't write anywhere.
const ALLOWED_FOLDERS = ["resume", "news", "gallery", "album", "inventory"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "");

  if (!(file instanceof File)) return NextResponse.json({ error: "Tidak ada berkas" }, { status: 400 });
  if (!ALLOWED_FOLDERS.includes(folder)) return NextResponse.json({ error: "Folder tidak valid" }, { status: 400 });
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
