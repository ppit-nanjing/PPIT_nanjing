import { and, eq } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { formApplications, forms } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { FORM_KIND_LABEL, FORM_STATUS_LABEL, isAcceptedFormStatus, type FormApplicationStatus } from "@/lib/form-types";
import { getT } from "@/lib/i18n/server";
import { UUID_RE } from "@/lib/uuid";

export const metadata = {
  title: "Jawaban terkirim",
  robots: { index: false, follow: false },
};

export default async function FormSubmittedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { t } = await getT();

  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) notFound();

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?returnTo=${encodeURIComponent(`/forms/${form.id}`)}`);
  }

  const [application] = await db
    .select()
    .from(formApplications)
    .where(and(eq(formApplications.formId, form.id), eq(formApplications.userId, session.user.id)));
  // Belum mengirim: balik ke form (halaman ini hanya untuk yang sudah kirim).
  if (!application) redirect(`/forms/${form.id}`);

  // QR grup panitia: untuk semua yang sudah mengirim, atau hanya yang diterima.
  const accepted = isAcceptedFormStatus(application.status);
  const qrVisible = Boolean(form.groupQrUrl) && (form.groupQrAudience !== "accepted" || accepted);
  const qrPending = Boolean(form.groupQrUrl) && !qrVisible && application.status === "pending";

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-2xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-6 py-14 text-center">
          <CheckCircle2 className="text-primary-container mx-auto mb-4" size={40} aria-hidden />
          <p className="text-label-caps uppercase tracking-wide text-gold-ink mb-2">{FORM_KIND_LABEL[form.kind]}</p>
          <h1 className="text-headline-lg text-on-background mb-3">{t("forms.form.submittedTitle")}</h1>
          <p className="text-body-lg text-on-surface-variant whitespace-pre-wrap">{form.confirmationMessage}</p>
          <p className="mt-5 inline-block text-label-caps uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-3 py-1.5 rounded-md">
            {t("forms.form.statusLabel", {
              status: FORM_STATUS_LABEL[application.status as FormApplicationStatus],
            })}
          </p>
          {qrVisible && form.groupQrUrl && (
            <div className="deco-frame mt-8 rounded-lg bg-surface-container-low p-6 flex flex-col items-center gap-3">
              <h2 className="text-headline-sm text-on-background">{t("forms.form.groupQrTitle")}</h2>
              {/* <img> biasa (bukan next/image): QR butuh piksel tajam, rasio asli. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.groupQrUrl}
                alt={t("forms.form.groupQrTitle")}
                className="w-full max-w-[260px] h-auto rounded-lg border border-outline-variant bg-white p-2"
              />
              {form.groupQrNote && (
                <p className="text-body-sm text-on-surface-variant whitespace-pre-wrap">{form.groupQrNote}</p>
              )}
            </div>
          )}
          {qrPending && (
            <p className="mt-6 text-body-sm text-on-surface-variant">{t("forms.form.groupQrPending")}</p>
          )}
          <div className="mt-8">
            <Link
              href="/"
              className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary"
            >
              {t("forms.form.backHome")}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
