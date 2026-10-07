import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { formSubmissions, formTemplates, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { formPublicPath, formTemplateFields } from "@/lib/form-templates";
import { TemplateEditor } from "@/components/console/forms/template-editor";
import { FormSubmissionsList, type SubmissionListItem } from "@/components/console/forms/form-submissions-list";

export default async function ConsoleFormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("forms");
  const { id } = await params;

  const [template] = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
  if (!template) notFound();

  const submissionRows = await db
    .select({
      id: formSubmissions.id,
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

  const submissions: SubmissionListItem[] = submissionRows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    reviewed: row.reviewed,
    internalNote: row.internalNote,
    submitterName: row.submitterName ?? null,
    submitterEmail: row.submitterEmail ?? null,
    answers: row.answers,
  }));

  const fields = formTemplateFields(template.sections);
  const publicPath = formPublicPath(template.slug);
  const unreviewed = submissions.filter((s) => !s.reviewed).length;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 flex flex-col gap-6">
      <div>
        <Link href="/console/forms" className="text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background">
          &larr; Semua formulir
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <h1 className="text-headline-md sm:text-headline-lg text-on-background">{template.title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            {publicPath && (
              <a
                href={publicPath}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-container-low border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-surface-container-lowest transition-colors"
              >
                Buka formulir
              </a>
            )}
            <a
              href={`/api/console/forms/${template.id}/export?format=csv`}
              className="bg-surface-container-low border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-surface-container-lowest transition-colors"
            >
              Unduh CSV
            </a>
            <a
              href={`/api/console/forms/${template.id}/export?format=xlsx`}
              className="bg-surface-container-low border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-surface-container-lowest transition-colors"
            >
              Unduh Excel
            </a>
          </div>
        </div>
        <p className="text-body-md text-on-surface-variant mt-2">
          {submissions.length} jawaban &middot; {unreviewed} belum direview
          {publicPath ? (
            <>
              {" "}
              &middot; URL publik <code>{publicPath}</code>
            </>
          ) : (
            <> &middot; belum ada halaman publik untuk slug &quot;{template.slug}&quot;</>
          )}
        </p>
      </div>

      <TemplateEditor
        template={{
          id: template.id,
          title: template.title,
          description: template.description,
          successMessage: template.successMessage,
          notifyEmail: template.notifyEmail,
          status: template.status,
          sections: template.sections,
        }}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-headline-sm text-on-background">Jawaban</h2>
        <FormSubmissionsList fields={fields} submissions={submissions} />
      </section>
    </div>
  );
}
