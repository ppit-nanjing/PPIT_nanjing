import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventEvaluations, events } from "@/db/schema";
import { getEventAccess } from "@/lib/event-access";
import { evaluationTemplateForSlug, ratingQuestions, textQuestions } from "@/lib/event-evaluation-template";
import { loadEvaluationAnswers, loadEvaluationQuestions } from "@/lib/event-evaluation-queries";
import { isScaleType } from "@/lib/event-evaluation-questions";
import { answersByEvaluation, evalColumns, formatAnswer } from "@/lib/event-evaluation-results";
import { datasetToCsv, datasetToXlsx, type ReportColumn, type ReportDataset } from "@/lib/report-export";

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

  const [event] = await db.select({ title: events.title, slug: events.slug }).from(events).where(eq(events.id, id));
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [rows, questions, answers] = await Promise.all([
    db.select().from(eventEvaluations).where(eq(eventEvaluations.eventId, id)).orderBy(desc(eventEvaluations.createdAt)),
    loadEvaluationQuestions(id),
    loadEvaluationAnswers(id),
  ]);

  // Respons bentuk template tetap punya keempat penilaian bawaan; respons dari
  // pertanyaan buatan panitia membiarkannya kosong (jawabannya di tabel jawaban).
  const isTemplateRow = (r: (typeof rows)[number]) => r.ratingRegistration != null;
  const hasTemplateRows = rows.some(isTemplateRow);
  const customMode = questions.length > 0 || rows.some((r) => !isTemplateRow(r));

  const template = evaluationTemplateForSlug(event.slug);
  const templateColumns: ReportColumn[] = [
    ...ratingQuestions(template.sections).map((q) => ({ header: `${q.label} (1-10)`, key: q.name, type: "number" as const })),
    ...textQuestions(template.sections).map((q) => ({ header: q.label, key: q.name })),
  ];

  const customColumns = customMode ? evalColumns(questions, answers) : [];
  const byEvaluation = answersByEvaluation(answers);

  const columns: ReportColumn[] = [
    { header: "Waktu", key: "createdAt", type: "date" },
    { header: "Nama", key: "respondentName" },
    { header: "Kota", key: "respondentCity" },
    { header: "Anonim", key: "anonymousLabel" },
    // Mode pertanyaan sendiri: satu kolom per pertanyaan (yang sudah dihapus tapi
    // masih punya jawaban ikut, diberi tanda). Respons template lama, kalau ada,
    // tetap diekspor dengan kolom template-nya di belakang.
    ...customColumns.map((c, i) => ({
      header: c.removed ? `${c.label} (dihapus)` : c.label,
      key: `c${i}`,
      ...(isScaleType(c.type) ? { type: "number" as const } : {}),
    })),
    ...(!customMode || hasTemplateRows ? templateColumns : []),
  ];

  const dataset: ReportDataset = {
    title: `Evaluasi ${event.title}`,
    type: "event_evaluation",
    generatedAt: new Date(),
    filters: {},
    columns,
    rows: rows.map((r) => {
      const own = byEvaluation.get(r.id);
      const customValues = Object.fromEntries(
        customColumns.map((c, i) => {
          const answer = own?.get(c.key);
          return [`c${i}`, isScaleType(c.type) ? (answer?.valueNumber ?? null) : formatAnswer(answer)];
        }),
      );
      return {
        createdAt: r.createdAt,
        respondentName: r.anonymous || !r.respondentName ? "" : r.respondentName,
        respondentCity: r.anonymous ? "" : r.respondentCity,
        anonymousLabel: r.anonymous ? "Ya" : "Tidak",
        ...customValues,
        ratingRegistration: r.ratingRegistration,
        ratingFacilities: r.ratingFacilities,
        ratingCgt: r.ratingCgt,
        ratingOverall: r.ratingOverall,
        improveRegistration: r.improveRegistration,
        improveFacilities: r.improveFacilities,
        cgtMessage: r.cgtMessage,
        improveService: r.improveService,
        overallMessage: r.overallMessage,
        heartwarming: r.heartwarming,
      };
    }),
  };

  const filename = `evaluasi-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40)}`;

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
