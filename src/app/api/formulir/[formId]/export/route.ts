import { NextResponse, type NextRequest } from "next/server";
import { formatChinaDateIso } from "@/lib/datetime";
import { canManageForm, getFormsAccess } from "@/lib/form-access";
import { datasetToCsv, datasetToXlsx, type ReportDataset } from "@/lib/report-export";
import { buildSurveyDataset } from "@/lib/survey";
import { loadSurvey } from "@/lib/survey-load";
import { UUID_RE } from "@/lib/uuid";

// Ekspor jawaban satu formulir (CSV/XLSX): kolom dan baris yang sama dengan tabel di
// halaman hasil (buildSurveyDataset). Gerbangnya canManageForm, sama dengan halaman
// kelola (JSON 401/403/404, bukan redirect). user_id tidak pernah ikut.
const EXPORT_LIMIT = 20000;

export async function GET(req: NextRequest, ctx: { params: Promise<{ formId: string }> }) {
  const { formId } = await ctx.params;
  if (!UUID_RE.test(formId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await getFormsAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loaded = await loadSurvey(formId, EXPORT_LIMIT);
  // Bukan formulir kustom, atau tidak berhak: sama-sama 404 supaya keberadaan form lain tidak bocor.
  if (!loaded || !(await canManageForm(loaded.form, access))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { form } = loaded;

  const format = new URL(req.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const { columns, rows } = buildSurveyDataset({
    fields: loaded.fields,
    responses: loaded.responses,
    collectBiodata: form.collectBiodata,
  });

  const dataset: ReportDataset = {
    title: `Formulir Kustom — ${form.title}`,
    type: "custom",
    generatedAt: new Date(),
    filters: { "Formulir Kustom": form.title },
    columns,
    rows,
  };

  const filename = `formulir-kustom-${form.id.slice(0, 8)}-${formatChinaDateIso(new Date())}.${format}`;

  if (format === "xlsx") {
    const buffer = await datasetToXlsx(dataset);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(datasetToCsv(dataset), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
