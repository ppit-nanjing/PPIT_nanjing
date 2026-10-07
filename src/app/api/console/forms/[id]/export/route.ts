import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { formSubmissions, formTemplates, users } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { formTemplateFields } from "@/lib/form-templates";
import { datasetToCsv, datasetToXlsx, type ReportColumn, type ReportDataset } from "@/lib/report-export";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !hasModuleAccess(session.user.adminScope, "forms")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "Format tidak didukung (csv|xlsx)" }, { status: 400 });
  }

  const [template] = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      createdAt: formSubmissions.createdAt,
      reviewed: formSubmissions.reviewed,
      internalNote: formSubmissions.internalNote,
      answers: formSubmissions.answers,
      submitterName: users.name,
      submitterEmail: users.email,
    })
    .from(formSubmissions)
    .leftJoin(users, eq(formSubmissions.submitterUserId, users.id))
    .where(eq(formSubmissions.templateId, template.id))
    .orderBy(desc(formSubmissions.createdAt));

  const columns: ReportColumn[] = [
    { header: "Waktu", key: "createdAt", type: "date" },
    { header: "Sudah direview", key: "reviewedLabel" },
    { header: "Catatan internal", key: "internalNote" },
    { header: "Akun pengisi", key: "submitterLabel" },
    ...formTemplateFields(template.sections).map((field) => ({
      header: field.label,
      key: field.id,
      type: field.type === "scale" || field.type === "number" ? ("number" as const) : ("string" as const),
    })),
  ];

  const dataset: ReportDataset = {
    title: template.title,
    type: "form_submission",
    generatedAt: new Date(),
    filters: {},
    columns,
    rows: rows.map((row) => {
      const record: Record<string, string | number | Date | null> = {
        createdAt: row.createdAt,
        reviewedLabel: row.reviewed ? "Ya" : "Tidak",
        internalNote: row.internalNote,
        submitterLabel: row.submitterName
          ? row.submitterEmail
            ? `${row.submitterName} (${row.submitterEmail})`
            : row.submitterName
          : "",
      };
      for (const field of formTemplateFields(template.sections)) {
        const value = row.answers[field.id];
        if (value == null) {
          record[field.id] = "";
          continue;
        }
        if (Array.isArray(value)) {
          record[field.id] = value.join("; ");
          continue;
        }
        record[field.id] = value;
      }
      return record;
    }),
  };

  const filename = `formulir-${template.slug}-${new Date().toISOString().slice(0, 10)}`;

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
