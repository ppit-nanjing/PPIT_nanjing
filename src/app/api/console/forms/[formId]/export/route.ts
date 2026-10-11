import { asc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { eventDivisions, formApplications, formFields, forms, sensusProfiles, users } from "@/db/schema";
import { canManageForm, getFormsAccess } from "@/lib/form-access";
import { EVENT_COMMITTEE_ROLE_LABEL } from "@/lib/event-capabilities";
import { BPH_FORM_ROLE_LABEL, FORM_KIND_LABEL, FORM_STATUS_LABEL, type FormApplicationStatus } from "@/lib/form-types";
import { GRID_TYPES } from "@/lib/membership-form";
import { datasetToCsv, datasetToXlsx, type ReportColumn, type ReportDataset } from "@/lib/report-export";
import { UUID_RE } from "@/lib/uuid";

const ROLE_LABEL: Record<string, string> = { ...BPH_FORM_ROLE_LABEL, ...EVENT_COMMITTEE_ROLE_LABEL };

// Ekspor jawaban satu form (CSV/XLSX) — kolom sistem + satu kolom per
// pertanyaan; grid dipecah jadi satu kolom per baris. Otorisasi memakai
// canManageForm yang sama dengan halaman kelola (403 JSON, bukan redirect).
export async function GET(req: NextRequest, ctx: { params: Promise<{ formId: string }> }) {
  const { formId } = await ctx.params;
  if (!UUID_RE.test(formId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await getFormsAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [form] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canManageForm(form, access))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = new URL(req.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const [fields, applicationRows, divisionRows] = await Promise.all([
    db.select().from(formFields).where(eq(formFields.formId, form.id)).orderBy(asc(formFields.orderIndex)),
    db
      .select({
        app: formApplications,
        email: users.email,
        wechat: sensusProfiles.wechatId,
      })
      .from(formApplications)
      .leftJoin(users, eq(users.id, formApplications.userId))
      .leftJoin(sensusProfiles, eq(sensusProfiles.userId, formApplications.userId))
      .where(eq(formApplications.formId, form.id))
      .orderBy(asc(formApplications.submittedAt)),
    form.eventId
      ? db
          .select({ id: eventDivisions.id, name: eventDivisions.name })
          .from(eventDivisions)
          .where(eq(eventDivisions.eventId, form.eventId))
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);
  const divisionNameById = new Map(divisionRows.map((d) => [d.id, d.name]));
  const origin = new URL(req.url).origin;

  // Kolom pertanyaan kustom: grid → satu kolom per baris; lain → satu kolom.
  const questionFields = fields.filter((f) => f.type !== "section");
  const columns: ReportColumn[] = [
    { header: "No", key: "no", type: "number" },
    { header: "Nama Lengkap", key: "fullName" },
    { header: "Divisi Asal", key: "cabinetDivision" },
    ...(form.kind === "oprek_bph_acara" ? [{ header: "Posisi Dilamar", key: "positionApplied" }] : []),
    ...(form.kind === "oprek_kepanitiaan"
      ? [
          { header: "Pilihan 1", key: "choice1" },
          { header: "Pilihan 2", key: "choice2" },
          { header: "Divisi Diterima", key: "assignedDivision" },
        ]
      : []),
    ...(form.kind !== "pemilu" ? [{ header: "Role Diterima", key: "assignedRole" }] : []),
    { header: "Status", key: "statusLabel" },
    { header: "Email", key: "email" },
    { header: "WeChat", key: "wechat" },
    { header: "Tanggal Kirim", key: "submittedAt", type: "date" },
    ...questionFields.flatMap((f): ReportColumn[] => {
      if (GRID_TYPES.includes(f.type)) {
        const rows = (f.config as { rows?: string[] } | null)?.rows ?? [];
        return rows.map((row, i) => ({ header: `${f.label} — ${row}`, key: `${f.key}::${i}` }));
      }
      return [{ header: f.label, key: `q_${f.key}` }];
    }),
  ];

  const answerValue = (f: (typeof questionFields)[number], value: unknown): string => {
    if (value === undefined || value === null) return "";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Ya" : "Tidak";
    const text = String(value);
    if ((f.type === "file" || f.type === "image") && text.startsWith("/")) return `${origin}${text}`;
    return text;
  };

  const rows: Record<string, unknown>[] = applicationRows.map(({ app, email, wechat }, index) => {
    const responses = (app.responses ?? {}) as Record<string, unknown>;
    const row: Record<string, unknown> = {
      no: index + 1,
      fullName: app.fullName,
      cabinetDivision: app.cabinetDivision,
      positionApplied: app.positionApplied ? (ROLE_LABEL[app.positionApplied] ?? app.positionApplied) : "",
      choice1: app.choice1DivisionId ? (divisionNameById.get(app.choice1DivisionId) ?? "") : "",
      choice2: app.choice2DivisionId ? (divisionNameById.get(app.choice2DivisionId) ?? "") : "",
      assignedDivision: app.assignedDivisionId ? (divisionNameById.get(app.assignedDivisionId) ?? "") : "",
      assignedRole: app.assignedRole ? (ROLE_LABEL[app.assignedRole] ?? app.assignedRole) : "",
      statusLabel: FORM_STATUS_LABEL[app.status as FormApplicationStatus] ?? app.status,
      email: email ?? "",
      wechat: wechat ?? "",
      submittedAt: app.submittedAt,
    };
    for (const f of questionFields) {
      if (GRID_TYPES.includes(f.type)) {
        const map = (typeof responses[f.key] === "object" && responses[f.key] !== null
          ? responses[f.key]
          : {}) as Record<string, string | string[]>;
        const rowsCount = (f.config as { rows?: string[] } | null)?.rows?.length ?? 0;
        for (let i = 0; i < rowsCount; i++) {
          const v = map[String(i)];
          row[`${f.key}::${i}`] = v == null ? "" : Array.isArray(v) ? v.join(", ") : String(v);
        }
      } else {
        row[`q_${f.key}`] = answerValue(f, responses[f.key]);
      }
    }
    return row;
  });

  const dataset: ReportDataset = {
    title: `${FORM_KIND_LABEL[form.kind]} — ${form.title}`,
    type: "custom",
    generatedAt: new Date(),
    filters: {
      Formulir: form.title,
      Jenis: FORM_KIND_LABEL[form.kind],
    },
    columns,
    rows,
  };

  const date = new Date().toISOString().slice(0, 10);
  const filename = `formulir-${form.kind}-${form.id.slice(0, 8)}-${date}.${format}`;

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
