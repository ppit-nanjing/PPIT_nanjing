import { eq, and, count } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  events,
  eventRegistrations,
  eventQuestions,
  eventFeeOptions,
  regionalBranches,
  sensusProfiles,
  coverageCities,
  users,
} from "@/db/schema";
import { NON_STUDENT_BRANCH } from "@/lib/membership-status";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Select } from "@/components/console/form";
import { FileUpload } from "@/components/upload/file-upload";
import { EventBiodataFields, type BiodataDefaults } from "@/components/events/event-biodata-fields";
import { EventRegisterFlow, type FlowStep } from "@/components/events/event-register-flow";
import { registerForEvent } from "@/app/actions/events";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";

export default async function EventRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t, locale } = await getT();
  const eventHref = `/events/${slug}`;
  const registerHref = `${eventHref}/register`;

  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  if (!event) notFound();
  if (event.status === "scheduled" || event.status === "draft") notFound();

  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent(registerHref)}`);
  const userId = session.user.id;

  const [existing] = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, userId)));
  if (existing) redirect(`${eventHref}/ticket`);

  const sensusComplete = await hasCompletedSensus(userId);
  if (event.requiresSensus && !sensusComplete) {
    redirect(`/sensus?returnTo=${encodeURIComponent(registerHref)}`);
  }

  const [{ value: registeredCount }] = await db
    .select({ value: count() })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, event.id));
  const deadlinePassed = event.registrationDeadline ? new Date(event.registrationDeadline) < new Date() : false;
  const isFull = event.capacity != null && registeredCount >= event.capacity;
  // Pendaftaran tidak dibuka / penuh / lewat tenggat: kembalikan ke halaman
  // acara — di sana pesannya (penuh / tenggat / belum dibuka) sudah tampil.
  if (event.status !== "published" || isFull || deadlinePassed) redirect(eventHref);

  // Cabang hanya ditanyakan ke peserta yang sensusnya belum lengkap dan hanya
  // bila biodata lengkap tidak dikumpulkan (di sana kota/ranting sudah ditanya).
  const askBranch = !event.requiresBiodata && !sensusComplete;
  const branchOptions = askBranch
    ? (await db.select({ cityName: regionalBranches.cityName }).from(regionalBranches))
        .map((b) => b.cityName)
        .sort((a, b) => a.localeCompare(b))
    : [];

  const questions = await db
    .select()
    .from(eventQuestions)
    .where(eq(eventQuestions.eventId, event.id))
    .orderBy(eventQuestions.orderIndex, eventQuestions.id);

  let biodata: { sensusComplete: boolean; defaults: BiodataDefaults; cityOptions: string[] } | null = null;
  if (event.requiresBiodata) {
    const [profile] = await db.select().from(sensusProfiles).where(eq(sensusProfiles.userId, userId));
    const [account] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
    const cities = await db.select({ label: coverageCities.label }).from(coverageCities);
    biodata = {
      sensusComplete: profile?.completionStatus === "complete",
      cityOptions: cities.map((c) => c.label).sort((a, b) => a.localeCompare(b)),
      defaults: {
        fullName: profile?.fullName ?? account?.name ?? "",
        passportNumber: profile?.passportNumber ?? "",
        wechatId: profile?.wechatId ?? "",
        chinaPhone: profile?.phoneActive ?? "",
        branch: profile?.branch ?? "",
        university: profile?.university ?? "",
        major: profile?.major ?? "",
        entryYear: profile?.entryYear != null ? String(profile.entryYear) : "",
        studentProofUrl: profile?.studentCardUrl ?? "",
      },
    };
  }

  const feeOptions = event.isPaid
    ? await db
        .select({ id: eventFeeOptions.id, label: eventFeeOptions.label, amountCny: eventFeeOptions.amountCny })
        .from(eventFeeOptions)
        .where(eq(eventFeeOptions.eventId, event.id))
        .orderBy(eventFeeOptions.orderIndex, eventFeeOptions.id)
    : [];

  const fieldClass =
    "bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

  const steps: FlowStep[] = [];

  if (biodata) {
    steps.push({
      id: "biodata",
      title: t("events.stepBiodata"),
      content: (
        <EventBiodataFields
          sensusComplete={biodata.sensusComplete}
          defaults={biodata.defaults}
          cityOptions={biodata.cityOptions}
        />
      ),
    });
  }

  if (askBranch || questions.length > 0) {
    steps.push({
      id: "questions",
      title: t("events.stepQuestions"),
      content: (
        <>
          {askBranch && (
            <label className="flex flex-col gap-2 text-left">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                {t("events.branchQuestion")}
                <span className="text-error" aria-hidden="true"> *</span>
              </span>
              <Select name="branch" required defaultValue="" placeholder={t("events.branchPlaceholder")} className="w-full">
                {branchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value={NON_STUDENT_BRANCH}>{t("events.branchNonStudent")}</option>
              </Select>
              <span className="text-xs text-on-surface-variant">{t("events.branchHint")}</span>
            </label>
          )}
          {questions.map((q) => {
            const options = (q.options ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
            return (
              <fieldset key={q.id} className="flex flex-col gap-2 text-left border-0 p-0 m-0">
                <legend className="text-label-caps uppercase tracking-wide text-on-surface-variant p-0">
                  {q.label}
                  {q.required && <span className="text-error" aria-hidden="true"> *</span>}
                </legend>
                {q.type === "text" && <input name={q.id} required={q.required} className={fieldClass} />}
                {q.type === "textarea" && (
                  <textarea name={q.id} required={q.required} rows={3} className={`${fieldClass} resize-none`} />
                )}
                {q.type === "select" && (
                  <Select name={q.id} required={q.required} defaultValue="" placeholder="—" className="w-full">
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                )}
                {q.type === "file" && (
                  <FileUpload
                    name={q.id}
                    folder="event-doc"
                    required={q.required}
                    autoUpload
                    accept="application/pdf,.doc,.docx,image/*"
                    hint={t("events.fileHint")}
                  />
                )}
                {(q.type === "radio" || q.type === "multiselect") &&
                  options.map((o) => (
                    <label
                      key={o}
                      className="flex items-center gap-2 bg-soft-gray rounded-md p-2.5 text-body-md cursor-pointer"
                    >
                      <input
                        type={q.type === "radio" ? "radio" : "checkbox"}
                        name={q.id}
                        value={o}
                        required={q.required && q.type === "radio"}
                        className="h-4 w-4 accent-[var(--color-primary-container)]"
                      />
                      {o}
                    </label>
                  ))}
              </fieldset>
            );
          })}
        </>
      ),
    });
  }

  if (feeOptions.length > 0) {
    steps.push({
      id: "fee",
      title: t("events.feeOptionQuestion"),
      hint: t("events.feeOptionHint"),
      content: (
        <fieldset className="flex flex-col gap-2 text-left border-0 p-0 m-0">
          <legend className="text-label-caps uppercase tracking-wide text-on-surface-variant p-0">
            {t("events.feeOptionQuestion")}
            <span className="text-error" aria-hidden="true"> *</span>
          </legend>
          {feeOptions.map((o) => (
            <label
              key={o.id}
              className="flex items-center gap-2 bg-soft-gray rounded-md p-2.5 text-body-md cursor-pointer"
            >
              <input
                type="radio"
                name="feeOptionId"
                value={o.id}
                required
                className="h-4 w-4 accent-[var(--color-primary-container)]"
              />
              {o.label} <span className="text-on-surface-variant">(¥{o.amountCny})</span>
            </label>
          ))}
        </fieldset>
      ),
    });
  }

  // Tidak ada satu pun langkah (acara gratis, tanpa biodata/pertanyaan): form
  // pendaftaran satu tombol saja.
  if (steps.length === 0) {
    steps.push({
      id: "confirm",
      title: event.title,
      content: (
        <p className="text-body-md text-on-surface-variant">
          {t("events.registerConfirmNote")}
        </p>
      ),
    });
  }

  const start = event.startAt ? new Date(event.startAt) : null;
  const dateLabel = start
    ? `${start.toLocaleDateString(INTL_LOCALE[locale], { dateStyle: "full" })}${
        start.getHours() !== 0 || start.getMinutes() !== 0
          ? ` · ${start.toLocaleTimeString(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" })}`
          : ""
      }`
    : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-on-background">
      {event.coverImageUrl && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[75vh] opacity-[0.12]">
          <Image src={event.coverImageUrl} alt="" fill sizes="100vw" className="scale-110 object-cover blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>
      )}
      <div className="relative z-10">
        <SiteNav />
        <main className="mx-auto max-w-[var(--container-max)] px-[var(--spacing-container-padding)] py-10">
          <Link
            href={eventHref}
            className="mb-6 inline-flex items-center gap-2 rounded text-label-caps uppercase tracking-wide text-primary-container transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            ← {t("events.back")}
          </Link>
          <EventRegisterFlow
            action={registerForEvent.bind(null, event.id, slug)}
            submitLabel={t("events.registerSubmit")}
            backHref={eventHref}
            event={{
              title: event.title,
              posterUrl: event.coverImageUrl ?? null,
              dateLabel,
              location: event.location ?? null,
            }}
            steps={steps}
          />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
