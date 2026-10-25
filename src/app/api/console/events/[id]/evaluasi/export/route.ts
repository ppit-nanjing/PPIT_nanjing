import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventDivisions, eventEvaluations, events, users } from "@/db/schema";
import { canReadCommitteeEvaluation, getEventAccess } from "@/lib/event-access";
import { evaluationTemplateForSlug } from "@/lib/event-evaluation-template";
import { loadEvaluationAnswers, loadEvaluationQuestions } from "@/lib/event-evaluation-queries";
import { buildEvaluationDataset } from "@/lib/event-evaluation-dataset";
import { isEvalAudience } from "@/lib/event-evaluation-questions";
import { datasetToCsv, datasetToXlsx, type ReportDataset } from "@/lib/report-export";

// Ekspor evaluasi acara (CSV/Excel) — satu baris per respons. ?audience=panitia
// mengekspor evaluasi panitia (kolektif) dan GERBANGNYA LEBIH KETAT (B2): hanya
// BPH Kabinet/Teknologi atau BPH Panitia acara ini, karena barisnya membawa nama
// pengisi. Audiens peserta memakai gerbang konsol acara seperti sebelumnya.
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
  const audienceParam = url.searchParams.get("audience") ?? "peserta";
  const audience = isEvalAudience(audienceParam) ? audienceParam : null;
  if (!audience) {
    return NextResponse.json({ error: "Audiens tidak didukung (peserta|panitia)" }, { status: 400 });
  }
  if (audience === "panitia" && !canReadCommitteeEvaluation(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [event] = await db.select({ title: events.title, slug: events.slug }).from(events).where(eq(events.id, id));
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [rows, questions, answers] = await Promise.all([
    db
      .select({
        row: eventEvaluations,
        userName: users.name,
        divisionName: eventDivisions.name,
      })
      .from(eventEvaluations)
      .leftJoin(users, eq(eventEvaluations.userId, users.id))
      .leftJoin(eventDivisions, eq(eventEvaluations.divisionId, eventDivisions.id))
      .where(and(eq(eventEvaluations.eventId, id), eq(eventEvaluations.audience, audience)))
      .orderBy(desc(eventEvaluations.createdAt)),
    loadEvaluationQuestions(id, audience),
    loadEvaluationAnswers(id, audience),
  ]);

  // Nama & divisi evaluator hanya relevan untuk audiens panitia — dan jalur itu
  // sudah dipastikan hanya dijangkau pengelola.
  const mapped = rows.map((r) =>
    audience === "panitia"
      ? { ...r.row, respondentName: r.userName, respondentCity: r.divisionName }
      : r.row,
  );

  const template = evaluationTemplateForSlug(event.slug);
  const { columns, rows: datasetRows } = buildEvaluationDataset({
    audience,
    sections: template.sections,
    rows: mapped,
    questions,
    answers,
  });

  const dataset: ReportDataset = {
    title: audience === "panitia" ? `Evaluasi Panitia ${event.title}` : `Evaluasi ${event.title}`,
    type: audience === "panitia" ? "event_committee_evaluation" : "event_evaluation",
    generatedAt: new Date(),
    filters: {},
    columns,
    rows: datasetRows,
  };

  const prefix = audience === "panitia" ? "evaluasi-panitia" : "evaluasi";
  const filename = `${prefix}-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40)}`;

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
