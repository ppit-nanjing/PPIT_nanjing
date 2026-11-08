import { and, asc, eq } from "drizzle-orm";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventDivisions, events, formApplications, formFields, forms } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { DecoRule } from "@/components/deco/deco-rule";
import { FormRenderer, type FormDivisionOption } from "@/components/forms/form-renderer";
import { LinkifiedText } from "@/components/linkified-text";
import { submitFormApplication } from "@/app/actions/forms";
import { canFillForm, getCabinetMembership } from "@/lib/form-access";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { FORM_KIND_LABEL, FORM_STATUS_LABEL, isDivisionOprekKind, isOprekKind, type FormApplicationStatus } from "@/lib/form-types";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import type { MembershipFieldDef } from "@/lib/membership-form";
import { UUID_RE } from "@/lib/uuid";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Formulir" };
  const session = await auth();
  const membership = session?.user?.id ? await getCabinetMembership(session.user.id) : null;
  const [form] = await db
    .select({ title: forms.title, kind: forms.kind, openToAllAccounts: forms.openToAllAccounts })
    .from(forms)
    .where(eq(forms.id, id));
  // Judul form hanya untuk yang boleh mengisinya — pengunjung lain melihat
  // layar "khusus pengurus" dan tidak perlu tahu judul formulirnya.
  if (!form || !canFillForm(form, membership)) return { title: "Formulir", robots: { index: false, follow: false } };
  // Formulir internal kabinet — jangan pernah diindeks mesin pencari.
  return { title: form?.title ?? "Formulir", robots: { index: false, follow: false } };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-2xl mx-auto px-[var(--spacing-container-padding)] py-12">{children}</main>
      <SiteFooter />
    </div>
  );
}

export default async function FormFillPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { error } = await searchParams;
  const { t, locale } = await getT();

  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) notFound();
  // Formulir punya halaman isi sendiri (/f/[id]).
  if (form.kind === "survei") redirect(`/f/${form.id}`);

  // Formulir yang terikat acara yang sudah di Sampah tidak bisa dibuka lagi
  // (acara di Sampah hanya dikelola dari bagian Sampah di menu Kegiatan).
  if (form.eventId) {
    const [ev] = await db.select({ deletedAt: events.deletedAt }).from(events).where(eq(events.id, form.eventId));
    if (!ev || ev.deletedAt) notFound();
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?returnTo=${encodeURIComponent(`/forms/${form.id}`)}`);
  }
  const userId = session.user.id;

  const membership = await getCabinetMembership(userId);
  const [myApplication] = await db
    .select()
    .from(formApplications)
    .where(and(eq(formApplications.formId, form.id), eq(formApplications.userId, userId)));

  if (!membership || !canFillForm(form, membership)) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center bg-surface-container-lowest border border-outline-variant rounded-xl px-6 py-14">
          <ShieldCheck className="text-primary-container mb-4" size={36} aria-hidden />
          <h1 className="text-headline-lg text-on-background mb-2">{t("forms.form.memberOnlyTitle")}</h1>
          <p className="text-body-md text-on-surface-variant max-w-md">{t("forms.form.memberOnlyBody")}</p>
          <Link
            href="/"
            className="mt-6 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary"
          >
            {t("forms.form.backHome")}
          </Link>
        </div>
      </Shell>
    );
  }

  // Oprek wajib sensus lengkap. Yang sudah pernah mengirim tetap boleh melihat
  // statusnya (tidak dipaksa isi sensus lagi).
  if (isOprekKind(form.kind) && !myApplication && !(await hasCompletedSensus(userId))) {
    redirect(`/sensus?returnTo=${encodeURIComponent(`/forms/${form.id}`)}`);
  }

  const [fields, eventRows] = await Promise.all([
    db.select().from(formFields).where(eq(formFields.formId, form.id)).orderBy(asc(formFields.orderIndex)),
    form.eventId
      ? db.select({ title: events.title }).from(events).where(eq(events.id, form.eventId))
      : Promise.resolve([] as { title: string }[]),
  ]);
  const eventTitle = eventRows[0]?.title ?? null;

  const fieldDefs: MembershipFieldDef[] = fields.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    type: r.type as MembershipFieldDef["type"],
    placeholder: r.placeholder ?? undefined,
    helpText: r.helpText ?? undefined,
    required: r.required,
    options: r.options ? r.options.split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
    config: (r.config as MembershipFieldDef["config"]) ?? undefined,
    isCore: false,
  }));

  let divisions: FormDivisionOption[] = [];
  if (isDivisionOprekKind(form.kind) && form.eventId) {
    const rows = await db
      .select({
        id: eventDivisions.id,
        name: eventDivisions.name,
        parentId: eventDivisions.parentDivisionId,
      })
      .from(eventDivisions)
      .where(eq(eventDivisions.eventId, form.eventId))
      .orderBy(asc(eventDivisions.orderIndex));
    const nameById = new Map(rows.map((r) => [r.id, r.name]));
    divisions = rows.map((r) => ({
      id: r.id,
      name: r.parentId && nameById.has(r.parentId) ? `${nameById.get(r.parentId)} · ${r.name}` : r.name,
    }));
  }

  const header = (
    <header className="mb-8">
      <span className="inline-block bg-gold-ink/10 text-gold-ink text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md mb-4">
        {FORM_KIND_LABEL[form.kind]}
      </span>
      <h1 className="text-display-hero-mobile md:text-display-hero text-heading mb-3">{form.title}</h1>
      {eventTitle && <h2 className="text-headline-md text-secondary mb-4">{eventTitle}</h2>}
      {form.description && (
        <p className="text-body-lg text-on-surface-variant whitespace-pre-wrap">
          <LinkifiedText text={form.description} />
        </p>
      )}
      <DecoRule align="start" className="mt-6" />
    </header>
  );

  // Sudah pernah mengirim — tampilkan status, bukan form lagi (satu orang satu
  // kiriman; halaman ini juga jadi jalan lihat status setelah form ditutup).
  if (myApplication) {
    return (
      <Shell>
        {header}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
          <CheckCircle2 className="text-primary-container mx-auto mb-3" size={32} aria-hidden />
          <h2 className="text-headline-md text-on-background mb-2">{t("forms.form.alreadyTitle")}</h2>
          <p className="text-body-md text-on-surface-variant">
            {t("forms.form.alreadyBody", {
              date: new Date(myApplication.submittedAt).toLocaleDateString(INTL_LOCALE[locale]),
            })}
          </p>
          <p className="mt-4 inline-block text-label-caps uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-3 py-1.5 rounded-md">
            {t("forms.form.statusLabel", {
              status: FORM_STATUS_LABEL[myApplication.status as FormApplicationStatus],
            })}
          </p>
        </div>
      </Shell>
    );
  }

  if (!form.isOpen) {
    return (
      <Shell>
        {header}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
          <Lock className="text-on-surface-variant mx-auto mb-3" size={30} aria-hidden />
          <h2 className="text-headline-md text-on-background mb-2">{t("forms.form.closedTitle")}</h2>
          <p className="text-body-md text-on-surface-variant">{t("forms.form.closedBody")}</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {header}
      {error && (
        <p role="alert" className="text-body-md text-error bg-error-container/30 rounded-md px-4 py-3 mb-6">
          {t("forms.form.errSubmit")}
        </p>
      )}
      <FormRenderer
        formId={form.id}
        kind={form.kind}
        fields={fieldDefs}
        bphRoles={form.bphRoles}
        divisions={divisions}
        prefill={{ fullName: membership.displayName, divisionName: membership.divisionName }}
        action={submitFormApplication}
      />
    </Shell>
  );
}
