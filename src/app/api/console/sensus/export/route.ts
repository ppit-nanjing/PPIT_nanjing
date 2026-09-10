import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { sensusProfiles, users } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { RANTINGS, universityInRanting, isRantingCode } from "@/lib/rantings";
import { datasetToCsv, datasetToXlsx, type ReportDataset } from "@/lib/report-export";
import {
  SENSUS_EXPORT_COLUMNS_FULL,
  SENSUS_EXPORT_COLUMNS_RANTING,
  sensusExportRowFull,
  sensusExportRowRanting,
} from "@/lib/sensus-export";

// Ekspor daftar sensus yang sedang tampil di /console/sensus (pemegang modul
// "sensus" -> semua kolom termasuk paspor) atau /console/ranting/sensus
// (pemegang "sensus-ranting" -> kolom ringkas tanpa PII, dipaksa ke kampus
// ranting sendiri). Generator "Ringkasan Sensus" di /console/reports terpisah
// dan tetap mencatat ke tabel `reports`; rute ini tidak.
export async function GET(request: Request) {
  const session = await auth();
  const scope = session?.user.adminScope ?? null;
  const full = hasModuleAccess(scope, "sensus");
  const rantingCode = session?.user.rantingCode ?? null;
  const rantingOnly = !full && hasModuleAccess(scope, "sensus-ranting") && isRantingCode(rantingCode);

  if (!full && !rantingOnly) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "Format tidak didukung (csv|xlsx)" }, { status: 400 });
  }
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const status = url.searchParams.get("status") || "all";
  const branch = url.searchParams.get("branch") || "all";
  const proof = url.searchParams.get("proof") || "all";
  const university = url.searchParams.get("university") || "all";

  const rows = await db
    .select({ sensus: sensusProfiles, userName: users.name, userEmail: users.email })
    .from(sensusProfiles)
    .leftJoin(users, eq(sensusProfiles.userId, users.id))
    .orderBy(desc(sensusProfiles.updatedAt));

  const filtered = rows.filter(({ sensus: s, userName, userEmail }) => {
    // Pengurus ranting: paksa ke kampus sendiri, abaikan filter kampus dari URL.
    if (rantingOnly && !universityInRanting(s.university, rantingCode as "INA" | "JIA")) return false;
    if (status === "complete" && s.completionStatus !== "complete") return false;
    if (status === "incomplete" && s.completionStatus === "complete") return false;
    if (branch !== "all" && s.branch !== branch) return false;
    if (proof === "has" && !s.studentCardUrl) return false;
    if (proof === "missing" && s.studentCardUrl) return false;
    if (!rantingOnly && university !== "all" && s.university !== university) return false;
    if (q) {
      // Ranting tidak boleh mencari via paspor.
      const parts = rantingOnly
        ? [s.fullName, s.university, s.major, userName, userEmail]
        : [s.fullName, s.passportNumber, s.university, userName, userEmail];
      if (!parts.filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const now = new Date();
  const dataset: ReportDataset = rantingOnly
    ? {
        title: `Sensus Ranting ${RANTINGS[rantingCode as "INA" | "JIA"].label}`,
        type: "sensus_ranting",
        generatedAt: now,
        filters: {},
        columns: SENSUS_EXPORT_COLUMNS_RANTING,
        rows: filtered.map(({ sensus, userName }) => sensusExportRowRanting(sensus, userName)),
      }
    : {
        title: "Data Sensus",
        type: "sensus_export",
        generatedAt: now,
        filters: {
          Cari: q || null,
          Kelengkapan: status === "all" ? null : status,
          Cabang: branch === "all" ? null : branch,
          Universitas: university === "all" ? null : university,
          Bukti: proof === "all" ? null : proof,
        },
        columns: SENSUS_EXPORT_COLUMNS_FULL,
        rows: filtered.map(({ sensus }) => sensusExportRowFull(sensus)),
      };

  const ext = format === "xlsx" ? "xlsx" : "csv";
  const disposition = `attachment; filename="sensus-${now.toISOString().slice(0, 10)}.${ext}"`;

  if (format === "xlsx") {
    const buf = await datasetToXlsx(dataset);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": disposition,
      },
    });
  }
  return new NextResponse(datasetToCsv(dataset), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": disposition },
  });
}
