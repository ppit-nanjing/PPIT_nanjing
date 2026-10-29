import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { formFields, formResponses, forms, type FormRow, type SurveyBiodata } from "@/db/schema";
import type { MembershipFieldDef } from "@/lib/membership-form";
import { buildSurveyDataset, toFieldDef } from "@/lib/survey";
import { datasetToTable, type TableData } from "@/lib/table-view";

// Pemuat data formulir kustom (kind "survei"): satu sumber untuk halaman hasil,
// ekspor CSV/Excel, dan Google Sheet langsung, supaya ketiganya selalu sama.
// user_id sengaja TIDAK dipilih: identitas akun tidak pernah keluar dari sini.

/** Batas jawaban yang dimuat untuk ringkasan, tabel, ekspor, dan sheet (yang terbaru). */
export const SURVEY_RESPONSE_LIMIT = 5000;

export type LoadedSurvey = {
  form: FormRow;
  fields: MembershipFieldDef[];
  responses: {
    id: string;
    answers: unknown;
    biodata: SurveyBiodata | null;
    biodataSource: string | null;
    submittedAt: Date;
  }[];
};

/** null = bukan formulir kustom / tidak ada. Jawaban terbaru dulu. */
export async function loadSurvey(formId: string, limit = SURVEY_RESPONSE_LIMIT): Promise<LoadedSurvey | null> {
  const [form] = await db.select().from(forms).where(and(eq(forms.id, formId), eq(forms.kind, "survei")));
  if (!form) return null;
  const [fieldRows, responses] = await Promise.all([
    db.select().from(formFields).where(eq(formFields.formId, form.id)).orderBy(asc(formFields.orderIndex)),
    db
      .select({
        id: formResponses.id,
        answers: formResponses.answers,
        biodata: formResponses.biodata,
        biodataSource: formResponses.biodataSource,
        submittedAt: formResponses.submittedAt,
      })
      .from(formResponses)
      .where(eq(formResponses.formId, form.id))
      .orderBy(desc(formResponses.submittedAt))
      .limit(limit),
  ]);
  return { form, fields: fieldRows.map(toFieldDef), responses };
}

/** Kolom + baris yang sama dengan berkas ekspor (waktu dalam jam Tiongkok CST). */
export function surveyTable(loaded: LoadedSurvey): TableData {
  return datasetToTable(
    buildSurveyDataset({
      fields: loaded.fields,
      responses: loaded.responses,
      collectBiodata: loaded.form.collectBiodata,
    }),
  );
}
