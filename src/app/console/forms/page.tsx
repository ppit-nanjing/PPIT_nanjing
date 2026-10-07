import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { formSubmissions, formTemplates } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { FORM_TEMPLATE_DEFAULTS, formPublicPath } from "@/lib/form-templates";
import {
  createMissingFormTemplates,
  deleteFormTemplate,
  duplicateFormTemplate,
  setFormTemplateStatus,
} from "@/app/actions/forms";
import { ConfirmButton } from "@/components/console/confirm-button";
import { SubmitButton } from "@/components/console/submit-button";
import { DuplicateTemplateForm } from "@/components/console/forms/duplicate-template-form";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Terbit",
  closed: "Ditutup",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-outline-variant/40 text-on-surface-variant",
  published: "bg-primary-container/40 text-on-primary-container",
  closed: "bg-error-container/40 text-on-error-container",
};

// Satu langkah status: draft -> terbit -> tutup -> terbit lagi.
const NEXT_STATUS: Record<string, { status: "published" | "closed"; label: string }> = {
  draft: { status: "published", label: "Terbitkan" },
  published: { status: "closed", label: "Tutup" },
  closed: { status: "published", label: "Terbitkan lagi" },
};

export default async function ConsoleFormsPage() {
  await requireModuleAccess("forms");

  const templates = await db
    .select({
      id: formTemplates.id,
      slug: formTemplates.slug,
      title: formTemplates.title,
      status: formTemplates.status,
      updatedAt: formTemplates.updatedAt,
      submissionCount: sql<number>`count(${formSubmissions.id})::int`,
    })
    .from(formTemplates)
    .leftJoin(formSubmissions, eq(formSubmissions.templateId, formTemplates.id))
    .groupBy(formTemplates.id)
    .orderBy(desc(formTemplates.updatedAt));

  const existingSlugs = new Set(templates.map((t) => t.slug));
  const missingDefaults = FORM_TEMPLATE_DEFAULTS.filter((d) => !existingSlugs.has(d.slug));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Formulir</h1>
      </div>
      <p className="text-body-md text-on-surface-variant mb-4">
        Pengganti Google Forms untuk alur internal BPH: rekrutmen, evaluasi panitia, dan evaluasi peserta.
        Pertanyaan bisa diedit langsung dari sini tanpa mengubah kode.
      </p>

      {missingDefaults.length > 0 && (
        <div className="mb-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-md text-on-background">
            {missingDefaults.length} template bawaan belum dibuat:{" "}
            {missingDefaults.map((d) => d.title).join(", ")}.
          </p>
          <form action={createMissingFormTemplates}>
            <SubmitButton
              successMessage="Template bawaan dibuat sebagai draft."
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg hover:opacity-90 transition-colors"
            >
              Buat template bawaan
            </SubmitButton>
          </form>
        </div>
      )}

      {templates.length > 0 && (
        <details className="mb-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
          <summary className="cursor-pointer text-body-md text-on-background">Duplikat template</summary>
          <p className="text-body-sm text-on-surface-variant mt-2 mb-3">
            Salin pertanyaan template yang ada ke template baru (versi berikutnya). Template baru dibuat sebagai
            draft; ubah pertanyaannya sebelum diterbitkan.
          </p>
          <DuplicateTemplateForm templates={templates.map((t) => ({ id: t.id, title: t.title }))} action={duplicateFormTemplate} />
        </details>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
        <table className="w-full text-body-md min-w-[760px]">
          <thead className="bg-surface-container-low text-label-caps uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="text-left px-5 py-3">Formulir</th>
              <th className="text-left px-5 py-3">URL Publik</th>
              <th className="text-left px-5 py-3">Jawaban</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Diubah</th>
              <th className="text-left px-5 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-on-surface-variant">
                  Belum ada formulir. Buat template bawaan di atas, atau duplikat dari template lain.
                </td>
              </tr>
            )}
            {templates.map((tpl) => {
              const publicPath = formPublicPath(tpl.slug);
              const next = NEXT_STATUS[tpl.status];
              return (
                <tr key={tpl.id} className="border-t border-outline-variant hover:bg-surface-container-low transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/console/forms/${tpl.id}`} className="font-medium text-primary-container hover:text-primary">
                      {tpl.title}
                    </Link>
                    <div className="text-label-caps text-on-surface-variant/80">{tpl.slug}</div>
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">
                    {publicPath ? (
                      <a href={publicPath} target="_blank" rel="noopener noreferrer" className="underline hover:text-on-background">
                        {publicPath}
                      </a>
                    ) : (
                      <span className="text-label-caps">belum ada halaman publik</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">{tpl.submissionCount}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-label-caps ${STATUS_CLASS[tpl.status]}`}>
                      {STATUS_LABEL[tpl.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">
                    {tpl.updatedAt.toLocaleString("id-ID", { dateStyle: "medium" })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href={`/console/forms/${tpl.id}`} className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary">
                        Kelola
                      </Link>
                      {next && (
                        <form action={setFormTemplateStatus}>
                          <input type="hidden" name="id" value={tpl.id} />
                          <input type="hidden" name="status" value={next.status} />
                          <SubmitButton
                            successMessage="Status formulir diperbarui."
                            className="text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background transition-colors"
                          >
                            {next.label}
                          </SubmitButton>
                        </form>
                      )}
                      <ConfirmButton
                        action={deleteFormTemplate}
                        payload={{ id: tpl.id }}
                        message={`Hapus formulir "${tpl.title}" beserta semua jawabannya? Tindakan ini tidak bisa dibatalkan.`}
                      >
                        Hapus
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
