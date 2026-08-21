import { and, desc, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  departmentMembers,
  eventRegistrations,
  events,
  inventoryAuditLogs,
  inventoryItems,
  reportTypeEnum,
  reports,
  sensusProfiles,
  users,
} from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { HOME_BRANCH, MEMBERSHIP_LABEL, membershipStatus } from "@/lib/membership-status";
import { datasetToCsv, datasetToXlsx, type ReportDataset } from "@/lib/report-export";

type ReportType = (typeof reportTypeEnum.enumValues)[number];

const TITLE: Record<ReportType, string> = {
  event_attendance: "Laporan Kehadiran Acara",
  inventory_audit: "Laporan Audit Inventaris",
  sensus_summary: "Ringkasan Sensus",
  student_export: "Data Mahasiswa",
  custom: "Catatan Kustom",
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !hasModuleAccess(session.user.adminScope, "reports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "";
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  if (!reportTypeEnum.enumValues.includes(type as ReportType)) {
    return NextResponse.json({ error: "Jenis laporan tidak valid" }, { status: 400 });
  }
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "Format tidak didukung (csv|xlsx)" }, { status: 400 });
  }

  const departmentId = url.searchParams.get("departmentId") || null;
  const dateFrom = url.searchParams.get("dateFrom") || null;
  const dateTo = url.searchParams.get("dateTo") || null;
  const note = url.searchParams.get("note") || null;
  // Filter khusus sensus_summary. Default sengaja SEMPIT — cabang Nanjing +
  // hanya yang lengkap — karena itulah baris yang siap disetor ke PPI Tiongkok
  // pusat: baris `incomplete` field wajibnya bolong dan ditolak di sana, dan
  // baris cabang lain jatah rekap cabang mereka (kalau ikut terkirim, jumlah
  // anggota Nanjing di pusat jadi kembung). "" = semua, untuk yang mau melihat
  // gambaran penuh.
  const sensusBranch = url.searchParams.has("sensusBranch")
    ? url.searchParams.get("sensusBranch") || null
    : HOME_BRANCH;
  const sensusCompletion = url.searchParams.has("sensusCompletion")
    ? url.searchParams.get("sensusCompletion") || null
    : "complete";

  const now = new Date();
  const filters: Record<string, string | null> = {
    Departemen: departmentId,
    "Dari Tanggal": dateFrom,
    "Sampai Tanggal": dateTo,
    Catatan: note,
  };
  if (type === "sensus_summary") {
    filters["Cabang"] = sensusBranch ?? "Semua cabang";
    filters["Kelengkapan"] = sensusCompletion === "complete" ? "Hanya yang lengkap" : "Semua";
  }

  let dataset: ReportDataset;

  switch (type as ReportType) {
    case "event_attendance": {
      const conditions = [];
      if (departmentId) conditions.push(eq(events.departmentId, departmentId));
      if (dateFrom) conditions.push(gte(events.startAt, new Date(dateFrom)));
      if (dateTo) conditions.push(lte(events.startAt, new Date(dateTo)));

      const rows = await db
        .select({
          eventTitle: events.title,
          startAt: events.startAt,
          userName: users.name,
          userEmail: users.email,
          status: eventRegistrations.status,
          checkedInAt: eventRegistrations.checkedInAt,
        })
        .from(eventRegistrations)
        .innerJoin(events, eq(eventRegistrations.eventId, events.id))
        .leftJoin(users, eq(eventRegistrations.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(events.startAt));

      dataset = {
        title: TITLE.event_attendance,
        type,
        generatedAt: now,
        filters,
        columns: [
          { header: "Acara", key: "eventTitle" },
          { header: "Tanggal Mulai", key: "startAt", type: "date" },
          { header: "Nama Peserta", key: "userName" },
          { header: "Email", key: "userEmail" },
          { header: "Status", key: "status" },
          { header: "Check-in", key: "checkedInAt", type: "date" },
        ],
        rows: rows.map((r) => ({
          eventTitle: r.eventTitle,
          startAt: r.startAt,
          userName: r.userName,
          userEmail: r.userEmail,
          status: r.status,
          checkedInAt: r.checkedInAt,
        })),
      };
      break;
    }
    case "inventory_audit": {
      const conditions = [];
      if (dateFrom) conditions.push(gte(inventoryAuditLogs.createdAt, new Date(dateFrom)));
      if (dateTo) conditions.push(lte(inventoryAuditLogs.createdAt, new Date(dateTo)));

      const rows = await db
        .select({
          createdAt: inventoryAuditLogs.createdAt,
          itemName: inventoryItems.name,
          action: inventoryAuditLogs.action,
          quantityDelta: inventoryAuditLogs.quantityDelta,
          performedByName: users.name,
          note: inventoryAuditLogs.note,
        })
        .from(inventoryAuditLogs)
        .leftJoin(inventoryItems, eq(inventoryAuditLogs.itemId, inventoryItems.id))
        .leftJoin(users, eq(inventoryAuditLogs.performedBy, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(inventoryAuditLogs.createdAt));

      dataset = {
        title: TITLE.inventory_audit,
        type,
        generatedAt: now,
        filters,
        columns: [
          { header: "Tanggal", key: "createdAt", type: "date" },
          { header: "Barang", key: "itemName" },
          { header: "Aksi", key: "action" },
          { header: "Perubahan Jumlah", key: "quantityDelta", type: "number" },
          { header: "Oleh", key: "performedByName" },
          { header: "Catatan", key: "note" },
        ],
        rows: rows.map((r) => ({
          createdAt: r.createdAt,
          itemName: r.itemName ?? "(barang dihapus)",
          action: r.action,
          quantityDelta: r.quantityDelta,
          performedByName: r.performedByName,
          note: r.note,
        })),
      };
      break;
    }
    case "sensus_summary": {
      const conditions = [
        sensusBranch ? eq(sensusProfiles.branch, sensusBranch) : null,
        sensusCompletion === "complete" ? eq(sensusProfiles.completionStatus, "complete") : null,
      ].filter((c) => c !== null);
      const rows = conditions.length
        ? await db.select().from(sensusProfiles).where(and(...conditions))
        : await db.select().from(sensusProfiles);
      dataset = {
        title: TITLE.sensus_summary,
        type,
        generatedAt: now,
        filters,
        // Kolomnya sengaja field-per-field, urut persis seperti form Sensus PPI
        // Tiongkok pusat (Biodata → Data Mahasiswa → Kontak). Rekap inilah yang
        // dipakai pengurus untuk memasukkan data anggota ke sistem pusat, jadi
        // ringkasan 5 kolom seperti sebelumnya tidak cukup — yang hilang harus
        // dikejar satu-satu ke tiap anggota.
        columns: [
          { header: "Nama Lengkap", key: "fullName" },
          { header: "Nomor Paspor", key: "passportNumber" },
          { header: "Jenis Kelamin", key: "gender" },
          { header: "Tanggal Maksimal Berlaku Paspor", key: "passportExpiry" },
          { header: "Asal Provinsi", key: "province" },
          { header: "Tanggal Lahir", key: "birthDate" },
          { header: "Asal Cabang", key: "branch" },
          { header: "Status Mahasiswa", key: "studentStatus" },
          { header: "Nama Universitas", key: "university" },
          { header: "Jenjang Pendidikan", key: "degreeLevel" },
          { header: "Jurusan", key: "major" },
          { header: "Sumber Pembiayaan", key: "fundingSource" },
          { header: "Tahun Masuk", key: "entryYear" },
          { header: "Perkiraan Tahun Kelulusan", key: "graduationYear" },
          { header: "WeChat ID", key: "wechatId" },
          { header: "Nomor Telepon Aktif", key: "phoneActive" },
          { header: "Nomor WhatsApp", key: "whatsappNumber" },
          { header: "Kartu Tanda Mahasiswa", key: "studentCardUrl" },
          { header: "Setuju S&K", key: "agreeTerms" },
          { header: "Newsletter", key: "subscribeNewsletter" },
          { header: "Status", key: "completionStatus" },
          { header: "Status Keanggotaan", key: "membershipStatus" },
        ],
        rows: rows.map((r) => ({
          fullName: r.fullName,
          passportNumber: r.passportNumber,
          gender: r.gender,
          passportExpiry: r.passportExpiry,
          province: r.province,
          birthDate: r.birthDate,
          branch: r.branch,
          studentStatus: r.studentStatus,
          university: r.university,
          degreeLevel: r.degreeLevel,
          major: r.major,
          fundingSource: r.fundingSource,
          entryYear: r.entryYear,
          graduationYear: r.graduationYear,
          wechatId: r.wechatId,
          phoneActive: r.phoneActive,
          whatsappNumber: r.whatsappNumber,
          studentCardUrl: r.studentCardUrl,
          agreeTerms: r.agreeTerms ? "Ya" : "Tidak",
          subscribeNewsletter: r.subscribeNewsletter ? "Ya" : "Tidak",
          completionStatus: r.completionStatus,
          membershipStatus: MEMBERSHIP_LABEL[membershipStatus(r)],
        })),
      };
      break;
    }
    case "student_export": {
      const dbRows = departmentId
        ? await db
            .select({ user: users, sensus: sensusProfiles })
            .from(users)
            .leftJoin(sensusProfiles, eq(sensusProfiles.userId, users.id))
            .innerJoin(
              departmentMembers,
              and(eq(departmentMembers.userId, users.id), eq(departmentMembers.departmentId, departmentId))
            )
        : await db
            .select({ user: users, sensus: sensusProfiles })
            .from(users)
            .leftJoin(sensusProfiles, eq(sensusProfiles.userId, users.id));

      dataset = {
        title: TITLE.student_export,
        type,
        generatedAt: now,
        filters,
        columns: [
          { header: "Nama", key: "name" },
          { header: "Email", key: "email" },
          { header: "Universitas", key: "university" },
          { header: "Jurusan", key: "major" },
          { header: "Jenjang", key: "degreeLevel" },
          { header: "Cabang", key: "branch" },
          { header: "Status Sensus", key: "completionStatus" },
          // Turunan dari sensus + cabang, bukan kolom di database - lihat
          // src/lib/membership-status.ts untuk kenapa tidak ada `account_type`.
          { header: "Status Keanggotaan", key: "membershipStatus" },
        ],
        rows: dbRows.map((r) => ({
          name: r.user.name,
          email: r.user.email,
          university: r.sensus?.university,
          major: r.sensus?.major,
          degreeLevel: r.sensus?.degreeLevel,
          branch: r.sensus?.branch,
          completionStatus: r.sensus?.completionStatus ?? "belum mengisi",
          membershipStatus: MEMBERSHIP_LABEL[membershipStatus(r.sensus)],
        })),
      };
      break;
    }
    case "custom": {
      dataset = {
        title: TITLE.custom,
        type,
        generatedAt: now,
        filters,
        columns: [{ header: "Catatan", key: "note" }],
        rows: [{ note: note ?? "" }],
      };
      break;
    }
  }

  await db.insert(reports).values({
    type: type as ReportType,
    generatedBy: session.user.id,
    parametersJson: { departmentId, dateFrom, dateTo, note },
  });

  const ext = format === "xlsx" ? "xlsx" : "csv";
  const disposition = `attachment; filename="laporan-${type}-${now.toISOString().slice(0, 10)}.${ext}"`;

  if (format === "xlsx") {
    const buf = await datasetToXlsx(dataset);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": disposition,
      },
    });
  }

  const csv = datasetToCsv(dataset);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": disposition,
    },
  });
}
