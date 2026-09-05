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
  // Berkas yang diunggah peserta di form pendaftaran acara (pertanyaan tipe
  // `file`, mis. LOA / bukti mahasiswa aktif untuk WIF). Sama seperti
  // payment-proof: pengunggahnya user biasa, panitia yang memeriksa.
  "event-doc": null,
  // "Pernyataan Peminjam" bertanda tangan di form peminjaman aset - diunggah
  // peminjam (anggota maupun pihak luar), Divisi Logistik yang memeriksa.
  "borrow-doc": null,
  news: "content",
  gallery: "content",
  album: "content",
  inventory: "inventory",
  events: "events",
  membership: null,
  catalog: "content",
  donation: "organization",
};

// Folder yang boleh diunggah TANPA login. Cuma "borrow-doc": Pernyataan Peminjam
// bertanda tangan di form peminjaman aset harus bisa diunggah peminjam PIHAK
// LUAR yang memang tidak punya akun PPIT (SOP Peminjaman Aset). Semua pengaman
// lain (allowlist tipe, batas 10 MB, cek origin, nama diacak) tetap berlaku.
const ANON_FOLDERS = new Set(["borrow-doc"]);

export async function POST(req: NextRequest) {
  const session = await auth();

  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "");

  if (!session?.user?.id && !ANON_FOLDERS.has(folder)) {
    return NextResponse.json({ errorKey: "upload.errUnauthorized" }, { status: 401 });
  }

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
  // requiredModule hanya truthy untuk folder admin (tak ada di ANON_FOLDERS),
  // jadi di sini sesi selalu ada - tapi tetap pakai optional chaining supaya
  // anon yang menembak folder admin dapat 403, bukan crash.
  if (requiredModule && !hasModuleAccess(session?.user?.adminScope ?? null, requiredModule)) {
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
  const wantsPrivate = folder === "sensus"; // sensus wajib login, jadi sesi pasti ada
  const ownerPath = wantsPrivate && session?.user?.id ? `${session.user.id}/` : "";
  const key = `${folder}/${ownerPath}${Date.now()}-${safeName}`;

  // `put` can throw (bad token, blob quota, a store that doesn't have private
  // access enabled). Without this the route 500s with an empty body and every
  // caller chokes on `res.json()` ("Unexpected end of JSON input").
  let blob: Awaited<ReturnType<typeof put>>;
  let storedPrivate = wantsPrivate;
  try {
    blob = await put(key, file, { access: wantsPrivate ? "private" : "public", addRandomSuffix: true });
  } catch (err) {
    if (wantsPrivate) {
      // Private blobs need a store that supports them. Rather than block a
      // student from submitting their card, fall back to a public blob - the
      // key still carries addRandomSuffix so the URL stays unguessable, same
      // as before private storage existed - and log so it can be fixed in the
      // Blob dashboard.
      console.error("[upload] private blob put failed, falling back to public:", err);
      try {
        blob = await put(key, file, { access: "public", addRandomSuffix: true });
        storedPrivate = false;
      } catch (err2) {
        console.error("[upload] public fallback also failed:", err2);
        return NextResponse.json({ errorKey: "upload.errServer" }, { status: 502 });
      }
    } else {
      console.error("[upload] blob put failed:", err);
      return NextResponse.json({ errorKey: "upload.errServer" }, { status: 502 });
    }
  }

  const url = storedPrivate
    ? `/api/sensus/student-card/${blob.pathname.split("/").map(encodeURIComponent).join("/")}`
    : blob.url;
  return NextResponse.json({ url });
}
