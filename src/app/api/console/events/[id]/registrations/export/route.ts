import { formatChinaDateIso } from "@/lib/datetime";
import { getEventAccess } from "@/lib/event-access";
import { exportCellText } from "@/lib/registration-export";
import { loadRegistrationExport } from "@/lib/registration-export-load";

// Same hardening as the membership export: quote/escape CSV specials and
// neutralize Excel formula injection ("=HYPERLINK(...)" typed into a form
// answer must not execute when a treasurer opens the export).
function csvCell(value: unknown): string {
  let s = exportCellText(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Berkas unggahan peserta kini di store private dan dibuka lewat path relatif
  // (/api/files/…, /api/sensus/student-card/…). Di CSV path relatif tak bisa
  // diklik, jadi dijadikan URL penuh (tetap butuh login pengurus untuk dibuka).
  const origin = new URL(req.url).origin;
  // Ekspor ini memuat nomor paspor + bukti KTM + kontak → BPH Kabinet +
  // Divisi Teknologi (adminScope "full") DAN BPH Panitia acara ini
  // (ketua/wakil/sekretaris/bendahara/SC) yang butuh rekap untuk operasional & LPJ.
  const access = await getEventAccess(id);
  if (!access.isFullAdmin && !access.isBphPanitia) {
    return new Response("Forbidden", { status: 403 });
  }

  const loaded = await loadRegistrationExport(id, origin);
  if (!loaded) return new Response("Not found", { status: 404 });
  const { header, lines: rows } = loaded.data;

  const lines = [header.map((h) => csvCell(h.label)).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));

  const csv = "﻿" + lines.join("\r\n");
  const safeTitle = loaded.eventTitle.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().slice(0, 40);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pendaftar-${safeTitle}-${formatChinaDateIso(new Date())}.csv"`,
      // Tanpa ini, klik berulang di link download yang sama (URL identik,
      // tanpa query string) bisa kena cache HTTP browser dan menyajikan
      // snapshot lama - pendaftar yang baru masuk hilang dari CSV padahal
      // sudah tercatat di database (dan sudah kelihatan di angka "N terdaftar"
      // di halaman, yang tidak lewat link yang sama).
      "Cache-Control": "no-store",
    },
  });
}
