import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventCommitteeEvaluations, eventDivisions, events, users } from "@/db/schema";
import { getEventAccess } from "@/lib/event-access";
import { COMMITTEE_EVAL_ASPECTS } from "@/lib/committee-evaluation";
import { datasetToCsv, datasetToXlsx, type ReportColumn, type ReportDataset } from "@/lib/report-export";

// Ekspor evaluasi panitia kolektif (CSV/Excel) — satu baris per pengisi.
// Gerbangnya sama dengan ekspor evaluasi peserta: BPH Kabinet/Teknologi,
// jembatan modul events, atau panitia acara ybs.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getEventAccess(id);
  if (!access.session || (!access.isFullAdmin && !access.moduleBridge && access.role == null)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "Format tidak didukung (csv|xlsx)" }, { status: 400 });
  }

  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, id));
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      row: eventCommitteeEvaluations,
      userName: users.name,
      divisionName: eventDivisions.name,
    })
    .from(eventCommitteeEvaluations)
    .leftJoin(users, eq(eventCommitteeEvaluations.userId, users.id))
    .leftJoin(eventDivisions, eq(eventCommitteeEvaluations.divisionId, eventDivisions.id))
    .where(eq(eventCommitteeEvaluations.eventId, id))
    .orderBy(desc(eventCommitteeEvaluations.createdAt));

  const columns: ReportColumn[] = [
    { header: "Waktu", key: "createdAt", type: "date" },
    { header: "Nama", key: "userName" },
    { header: "Divisi", key: "divisionName" },
    ...COMMITTEE_EVAL_ASPECTS.map((a) => ({ header: `${a.label} (1-5)`, key: a.field, type: "number" as const })),
    { header: "Apa yang berjalan baik?", key: "wentWell" },
    { header: "Apa yang perlu diperbaiki?", key: "toImprove" },
    { header: "Masukan tambahan", key: "feedback" },
  ];

  const dataset: ReportDataset = {
    title: `Evaluasi Panitia ${event.title}`,
    type: "event_committee_evaluation",
    generatedAt: new Date(),
    filters: {},
    columns,
    rows: rows.map((r) => ({
      createdAt: r.row.createdAt,
      userName: r.userName ?? "(tanpa nama)",
      divisionName: r.divisionName ?? "(tanpa divisi)",
      ...Object.fromEntries(COMMITTEE_EVAL_ASPECTS.map((a) => [a.field, r.row[a.field]])),
      wentWell: r.row.wentWell,
      toImprove: r.row.toImprove,
      feedback: r.row.feedback,
    })),
  };

  const filename = `evaluasi-panitia-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40)}`;

  if (format === "xlsx") {
    const buffer = await datasetToXlsx(dataset);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(datasetToCsv(dataset), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}