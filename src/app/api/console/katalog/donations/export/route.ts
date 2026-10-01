import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { donations } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";

// Laporan donasi untuk LPJ/keuangan. Digerbang scope "organization" - sama
// dengan verifikasi donasi, karena isinya data finansial (termasuk catatan
// internal). Pola hardening CSV-nya sama dengan ekspor peserta acara.
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

function csvCell(value: unknown): string {
  let s: string;
  if (value == null) s = "";
  else if (Array.isArray(value)) s = value.join(", ");
  else if (typeof value === "object") s = JSON.stringify(value);
  else s = String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await auth();
  if (!hasModuleAccess(session?.user.adminScope ?? null, "organization")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db.select().from(donations).orderBy(desc(donations.createdAt));

  const header = [
    "Donor",
    "Anonim",
    "Jumlah (¥)",
    "Kanal",
    "Pesan",
    "Status",
    "Bukti",
    "Dilaporkan",
    "Diverifikasi",
    "Catatan",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const d of rows) {
    lines.push(
      [
        d.donorName,
        d.anonymous ? "Ya" : "Tidak",
        d.amountCny ?? "",
        d.method ?? "",
        d.message ?? "",
        STATUS_LABEL[d.status] ?? d.status,
        d.proofUrl ?? "",
        d.createdAt.toISOString(),
        d.verifiedAt ? d.verifiedAt.toISOString() : "",
        d.note ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="donasi-${new Date().toISOString().slice(0, 10)}.csv"`,
      // URL identik tiap kali - tanpa no-store, klik ulang bisa menyajikan
      // snapshot cache dan donasi terbaru hilang dari CSV.
      "Cache-Control": "no-store",
    },
  });
}
