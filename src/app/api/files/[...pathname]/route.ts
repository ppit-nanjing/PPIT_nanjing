import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { canReadPrivateFile } from "@/lib/private-file-access";
import { isPrivateFileFolder, isSafePathSegment } from "@/lib/private-files";

// Proxy ter-auth untuk dokumen pribadi di store Blob PRIVATE (bukti transfer,
// CV, berkas peserta acara, Pernyataan Peminjam, lampiran Join Us). Siapa yang
// boleh membaca: lihat private-file-access.ts. Berkas tidak punya URL publik,
// jadi hanya jalan lewat sini - dengan sesi login, bukan URL yang bisa
// diteruskan ke orang lain.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ pathname: string[] }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { pathname: segments } = await params;
  const folder = segments[0] ?? "";
  if (segments.length < 2 || !segments.every(isSafePathSegment) || !isPrivateFileFolder(folder)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const pathname = segments.join("/");
  if (!(await canReadPrivateFile(session, folder, pathname))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const blob = await get(pathname, { access: "private", token: process.env.PRIVATE_READ_WRITE_TOKEN });
  if (!blob?.stream) return Response.json({ error: "Not found" }, { status: 404 });

  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store",
    "Content-Length": String(blob.blob.size),
    "Content-Type": blob.blob.contentType,
    "X-Content-Type-Options": "nosniff",
  };
  // ?download=1 -> simpan sebagai berkas (tombol "Unduh" di konsol); tanpa itu
  // dibuka inline (pratinjau gambar / PDF).
  if (new URL(request.url).searchParams.get("download") === "1") {
    headers["Content-Disposition"] = `attachment; filename="${segments[segments.length - 1]}"`;
  }
  return new Response(blob.stream, { headers });
}
