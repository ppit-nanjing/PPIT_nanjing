import { and, asc, eq } from "drizzle-orm";
import { CheckCircle2, Lock, LogIn } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, formFields, formResponses, forms, sensusProfiles, users } from "@/db/schema";
import { submitSurvey } from "@/app/actions/survey";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { DecoRule } from "@/components/deco/deco-rule";
import { FormRenderer } from "@/components/forms/form-renderer";
import { LinkifiedText } from "@/components/linkified-text";
import { SurveyBiodataBlock } from "@/components/survey/biodata-block";
import { SURVEY_HONEYPOT_FIELD, biodataFromSensus, isSurveyFieldType, surveyOpenState, toFieldDef } from "@/lib/survey";
import { UUID_RE } from "@/lib/uuid";

// Halaman isi formulir. Sengaja diberi jalur pendek (/f/<id>) supaya enak dibagikan
// lewat grup WeChat. Bukan /forms/[id]: itu halaman lamaran Oprek/Pemilu.

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = { robots: { index: false, follow: false } };
  if (!UUID_RE.test(id)) return { title: "Formulir", ...base };
  const [form] = await db
    .select({ title: forms.title, allowPublic: forms.allowPublic })
    .from(forms)
    .where(and(eq(forms.id, id), eq(forms.kind, "survei")));
  // Judul formulir khusus akun tidak dibocorkan ke pratinjau tautan.
  return { title: form && form.allowPublic ? form.title : "Formulir", ...base };
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

const ERROR_TEXT: Record<string, string> = {
  invalid: "Ada jawaban yang belum sesuai atau pertanyaan wajib yang belum diisi. Periksa lagi, lalu kirim ulang.",
  empty: "Jawabanmu masih kosong. Isi minimal satu pertanyaan.",
  biodata: "Nama lengkap wajib diisi.",
  closed: "Formulir ini sudah ditutup, jadi jawabanmu tidak terkirim.",
  toomany: "Terlalu banyak kiriman dalam waktu singkat. Tunggu beberapa menit lalu coba lagi.",
  spam: "Kiriman tidak bisa diproses. Muat ulang halaman ini, lalu coba kirim lagi.",
  forbidden: "Akunmu tidak bisa mengisi formulir ini.",
};

const CLOSED_TEXT = {
  closed: ["Formulir ditutup", "Formulir ini sedang tidak menerima jawaban."],
  not_yet: ["Formulir belum dibuka", "Formulir ini belum menerima jawaban. Coba lagi nanti."],
  ended: ["Formulir sudah berakhir", "Batas waktu pengisian formulir ini sudah lewat."],
} as const;

export default async function SurveyFillPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { error } = await searchParams;

  const [form] = await db.select().from(forms).where(and(eq(forms.id, id), eq(forms.kind, "survei")));
  if (!form) notFound();

  // Formulir acara yang sudah di Sampah tidak bisa dibuka lagi.
  let eventTitle: string | null = null;
  if (form.eventId) {
    const [ev] = await db.select({ title: events.title, deletedAt: events.deletedAt }).from(events).where(eq(events.id, form.eventId));
    if (!ev || ev.deletedAt) notFound();
    eventTitle = ev.title;
  }

  const session = await auth();
  const userId = session?.user?.id || null;
  const back = `/f/${form.id}`;
  if (!userId && !form.allowPublic) redirect(`/login?returnTo=${encodeURIComponent(back)}`);

  const header = (
    <header className="mb-8">
      <span className="inline-block bg-gold-ink/10 text-gold-ink text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md mb-4">
        Formulir
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

  if (userId) {
    const [account] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId));
    if (!account || account.status === "suspended") {
      return (
        <Shell>
          {header}
          <Notice icon="lock" title="Akunmu tidak bisa mengisi formulir ini" body="Hubungi pengurus kalau ini keliru." />
        </Shell>
      );
    }
    const [mine] = await db
      .select({ at: formResponses.submittedAt })
      .from(formResponses)
      .where(and(eq(formResponses.formId, form.id), eq(formResponses.userId, userId)));
    if (mine) {
      return (
        <Shell>
          {header}
          <Notice
            icon="done"
            title="Kamu sudah mengisi formulir ini"
            body="Satu akun hanya bisa mengisi sekali. Terima kasih atas jawabanmu."
          />
        </Shell>
      );
    }
  }

  const state = surveyOpenState(form);
  if (state !== "open") {
    const [title, body] = CLOSED_TEXT[state];
    return (
      <Shell>
        {header}
        <Notice icon="lock" title={title} body={body} />
      </Shell>
    );
  }

  const fieldRows = await db.select().from(formFields).where(eq(formFields.formId, form.id)).orderBy(asc(formFields.orderIndex));
  const fieldDefs = fieldRows.map(toFieldDef);
  // Formulir yang dibuka sebelum ada pertanyaan tidak bisa dikirim (jawaban selalu kosong):
  // jelaskan, jangan tampilkan form kosong dengan tombol kirim.
  if (!fieldDefs.some((f) => f.type !== "section" && isSurveyFieldType(f.type))) {
    return (
      <Shell>
        {header}
        <Notice icon="lock" title="Formulir belum siap" body="Formulir ini belum punya pertanyaan. Coba lagi nanti." />
      </Shell>
    );
  }

  // Biodata: akun dengan sensus lengkap memakai sensusnya, selain itu isi manual.
  let sensusBiodata = null;
  let defaultName: string | undefined;
  if (form.collectBiodata && userId) {
    const [sp] = await db
      .select({ fullName: sensusProfiles.fullName, university: sensusProfiles.university, branch: sensusProfiles.branch })
      .from(sensusProfiles)
      .where(and(eq(sensusProfiles.userId, userId), eq(sensusProfiles.completionStatus, "complete")));
    sensusBiodata = sp ? biodataFromSensus(sp) : null;
    defaultName = session?.user?.name ?? undefined;
  }

  const lead = (
    <>
      {form.collectBiodata && (
        <SurveyBiodataBlock
          mode={sensusBiodata ? "sensus" : "manual"}
          sensus={sensusBiodata}
          defaultName={defaultName}
          loggedIn={Boolean(userId)}
        />
      )}
      {/* Kolom jebakan bot (pengisi publik): manusia tidak melihatnya. */}
      {!userId && (
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Jangan diisi
            <input type="text" name={SURVEY_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore />
          </label>
        </div>
      )}
    </>
  );

  return (
    <Shell>
      {header}
      {!userId && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-on-surface-variant bg-surface-container-low rounded-md px-4 py-3 mb-6">
          <LogIn size={15} className="shrink-0" aria-hidden />
          Formulir ini bisa diisi tanpa akun.
          <Link href={`/login?returnTo=${encodeURIComponent(back)}`} className="text-primary-container underline underline-offset-2">
            Masuk dulu
          </Link>
          {form.collectBiodata ? "kalau mau biodatamu terisi otomatis dari sensus." : "kalau mau jawabanmu tercatat atas akunmu."}
        </p>
      )}
      {userId && !form.collectBiodata && (
        <p className="text-body-sm text-on-surface-variant mb-6">
          Namamu tidak ditampilkan di hasil formulir ini. Satu akun hanya bisa mengisi sekali.
        </p>
      )}
      {error && (
        <p role="alert" className="text-body-md text-error bg-error-container/30 rounded-md px-4 py-3 mb-6">
          {ERROR_TEXT[error] ?? ERROR_TEXT.invalid}
        </p>
      )}
      <FormRenderer
        formId={form.id}
        kind="survei"
        fields={fieldDefs}
        action={submitSurvey}
        lead={lead}
        leadRequired={form.collectBiodata && !sensusBiodata ? ["bio_fullName"] : []}
      />
    </Shell>
  );
}

function Notice({ icon, title, body }: { icon: "lock" | "done"; title: string; body: string }) {
  const Icon = icon === "lock" ? Lock : CheckCircle2;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
      <Icon className={`${icon === "lock" ? "text-on-surface-variant" : "text-primary-container"} mx-auto mb-3`} size={32} aria-hidden />
      <h2 className="text-headline-md text-on-background mb-2">{title}</h2>
      <p className="text-body-md text-on-surface-variant">{body}</p>
    </div>
  );
}
