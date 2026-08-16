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

function csvEscape(value: unknown): string {
  let s = value == null ? "" : String(value);
  // Guard against CSV/formula injection: a cell that starts with = + - @ can
  // be executed by spreadsheet software on open. Prefix with a single quote
  // (the standard neutralizer) after quoting.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

type ReportType = (typeof reportTypeEnum.enumValues)[number];

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !hasModuleAccess(session.user.adminScope, "reports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "";
  if (!reportTypeEnum.enumValues.includes(type as ReportType)) {
    return NextResponse.json({ error: "Jenis laporan tidak valid" }, { status: 400 });
  }
  const departmentId = url.searchParams.get("departmentId") || null;
  const dateFrom = url.searchParams.get("dateFrom") || null;
  const dateTo = url.searchParams.get("dateTo") || null;
  const note = url.searchParams.get("note") || null;

  let csv = "";

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

      csv = toCsv(
        ["Acara", "Tanggal Mulai", "Nama Peserta", "Email", "Status", "Check-in"],
        rows.map((r) => [
          r.eventTitle,
          r.startAt?.toISOString() ?? "",
          r.userName,
          r.userEmail,
          r.status,
          r.checkedInAt?.toISOString() ?? "",
        ])
      );
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

      csv = toCsv(
        ["Tanggal", "Barang", "Aksi", "Perubahan Jumlah", "Oleh", "Catatan"],
        rows.map((r) => [
          r.createdAt.toISOString(),
          r.itemName ?? "(barang dihapus)",
          r.action,
          r.quantityDelta,
          r.performedByName,
          r.note,
        ])
      );
      break;
    }
    case "sensus_summary": {
      const rows = await db.select().from(sensusProfiles);
      csv = toCsv(
        ["Universitas", "Program", "Jenjang", "Kota di Tiongkok", "Status"],
        rows.map((r) => [r.university, r.program, r.degreeLevel, r.cityInChina, r.completionStatus])
      );
      break;
    }
    case "student_export": {
      const rows = departmentId
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

      csv = toCsv(
        ["Nama", "Email", "Universitas", "Program", "Jenjang", "Kota di Tiongkok", "Status Sensus"],
        rows.map((r) => [
          r.user.name,
          r.user.email,
          r.sensus?.university,
          r.sensus?.program,
          r.sensus?.degreeLevel,
          r.sensus?.cityInChina,
          r.sensus?.completionStatus ?? "belum mengisi",
        ])
      );
      break;
    }
    case "custom": {
      csv = toCsv(["Catatan"], [[note ?? ""]]);
      break;
    }
  }

  await db.insert(reports).values({
    type: type as ReportType,
    generatedBy: session.user.id,
    parametersJson: { departmentId, dateFrom, dateTo, note },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${type}.csv"`,
    },
  });
}
