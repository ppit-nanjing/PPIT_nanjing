import { NextResponse } from "next/server";
import { canReadCommitteeEvaluation, getEventAccess, hasEvaluationExportAccess } from "@/lib/event-access";
import { loadEvaluationExport } from "@/lib/event-evaluation-export";
import { isEvalAudience } from "@/lib/event-evaluation-questions";
import { datasetToCsv, datasetToXlsx, type ReportDataset } from "@/lib/report-export";

// Ekspor evaluasi acara (CSV/Excel) — satu baris per respons. ?audience=panitia
// mengekspor evaluasi panitia (kolektif) dan GERBANGNYA LEBIH KETAT (B2): hanya
// BPH Kabinet/Teknologi atau BPH Panitia acara ini, karena barisnya membawa nama
// pengisi. Audiens peserta memakai gerbang konsol acara seperti sebelumnya.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getEventAccess(id);
  if (!hasEvaluationExportAccess(access)) {
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

  const loaded = await loadEvaluationExport(id, audience);
  if (!loaded) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const event = { title: loaded.title };

  const dataset: ReportDataset = {
    title: audience === "panitia" ? `Evaluasi Panitia ${event.title}` : `Evaluasi ${event.title}`,
    type: audience === "panitia" ? "event_committee_evaluation" : "event_evaluation",
    generatedAt: new Date(),
    filters: {},
    columns: loaded.dataset.columns,
    rows: loaded.dataset.rows,
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
