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

  const now = new Date();
  const filters: Record<string, string | null> = {
    Departemen: departmentId,
    "Dari Tanggal": dateFrom,
    "Sampai Tanggal": dateTo,
    Catatan: note,
  };

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
      const rows = await db.select().from(sensusProfiles);
      dataset = {
        title: TITLE.sensus_summary,
        type,
        generatedAt: now,
        filters,
        columns: [
          { header: "Universitas", key: "university" },
          { header: "Program", key: "program" },
          { header: "Jenjang", key: "degreeLevel" },
          { header: "Kota di Tiongkok", key: "cityInChina" },
          { header: "Status", key: "completionStatus" },
        ],
        rows: rows.map((r) => ({
          university: r.university,
          program: r.program,
          degreeLevel: r.degreeLevel,
          cityInChina: r.cityInChina,
          completionStatus: r.completionStatus,
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
          { header: "Program", key: "program" },
          { header: "Jenjang", key: "degreeLevel" },
          { header: "Kota di Tiongkok", key: "cityInChina" },
          { header: "Status Sensus", key: "completionStatus" },
        ],
        rows: dbRows.map((r) => ({
          name: r.user.name,
          email: r.user.email,
          university: r.sensus?.university,
          program: r.sensus?.program,
          degreeLevel: r.sensus?.degreeLevel,
          cityInChina: r.sensus?.cityInChina,
          completionStatus: r.sensus?.completionStatus ?? "belum mengisi",
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
