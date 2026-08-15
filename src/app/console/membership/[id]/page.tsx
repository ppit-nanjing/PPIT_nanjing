import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { membershipApplications, recruitmentPeriods } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import {
  updateMembershipStatus,
  updateMembershipNote,
  getFormFields,
} from "@/app/actions/membership";
import { MembershipDeleteButton } from "@/components/console/membership-delete-button";
import { MembershipTabs } from "@/components/console/membership-tabs";
import { CORE_KEYS } from "@/lib/membership-form";

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  reviewed: "Sudah Ditinjau",
  accepted: "Diterima",
  rejected: "Ditolak",
};

const FIELDS: { key: string; label: string }[] = [
  { key: "fullName", label: "Nama Lengkap" },
  { key: "email", label: "Email" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "university", label: "Universitas" },
  { key: "major", label: "Jurusan / Program Studi" },
  { key: "expectedGraduation", label: "Perkiraan Lulus" },
  { key: "divisionInterest", label: "Minat Divisi" },
  { key: "motivation", label: "Motivasi" },
  { key: "commitment", label: "Komitmen" },
];

export default async function MembershipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("membership");
  const { id } = await params;

  const [app] = await db
    .select({
      id: membershipApplications.id,
      fullName: membershipApplications.fullName,
      email: membershipApplications.email,
      whatsapp: membershipApplications.whatsapp,
      university: membershipApplications.university,
      major: membershipApplications.major,
      expectedGraduation: membershipApplications.expectedGraduation,
      divisionInterest: membershipApplications.divisionInterest,
      motivation: membershipApplications.motivation,
      commitment: membershipApplications.commitment,
      status: membershipApplications.status,
      note: membershipApplications.note,
      responses: membershipApplications.responses,
      submittedAt: membershipApplications.submittedAt,
      reviewedAt: membershipApplications.reviewedAt,
      batchLabel: recruitmentPeriods.batchLabel,
    })
    .from(membershipApplications)
    .leftJoin(recruitmentPeriods, eq(membershipApplications.recruitmentPeriodId, recruitmentPeriods.id))
    .where(eq(membershipApplications.id, id))
    .limit(1);

  if (!app) notFound();
  const row = app as unknown as Record<string, string | null>;

  const fields = await getFormFields();
  const labelByKey = new Map(fields.map((f) => [f.key, f.label]));
  const coreKeys = new Set(Object.values(CORE_KEYS));
  const responses = (app.responses as Record<string, string> | null) ?? {};
  const extraAnswers = Object.entries(responses).filter(([k]) => !coreKeys.has(k as never) && k !== "fullName" && k !== "email");

  return (
    <div className="px-8 py-10 max-w-3xl">
      <a href="/console/membership" className="text-label-caps text-secondary uppercase hover:text-on-background">
        &larr; Kembali ke Daftar
      </a>
      <h1 className="text-headline-lg text-on-background mt-2 mb-1">{app.fullName}</h1>
      <MembershipTabs active="list" />
      <p className="text-body-md text-on-surface-variant mb-8">
        Periode {app.batchLabel ?? "-"} &middot; Terkirim{" "}
        {app.submittedAt
          ? new Date(app.submittedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
          : "-"}

        {app.reviewedAt
          ? ` &middot; Diperbarui ${new Date(app.reviewedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`
          : ""}
      </p>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
        {FIELDS.map((f) => (
          <div key={f.key} className="px-6 py-4">
            <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{f.label}</p>
            <p className="text-body-md text-on-background whitespace-pre-wrap mt-1">{row[f.key] ?? "-"}</p>
          </div>
        ))}
      </div>

      {extraAnswers.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant mt-6">
          <p className="px-6 py-3 text-headline-sm text-on-background">Jawaban Tambahan</p>
          {extraAnswers.map(([k, v]) => (
            <div key={k} className="px-6 py-4">
              <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{labelByKey.get(k) ?? k}</p>
              <p className="text-body-md text-on-background whitespace-pre-wrap mt-1">{v || "-"}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <form
          action={updateMembershipStatus}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6"
        >
          <h2 className="text-headline-md text-on-background mb-4">Status</h2>
          <input type="hidden" name="id" value={app.id} />
          <select name="status" defaultValue={app.status} className="bg-soft-gray rounded-md p-3 text-body-md w-full">
            <option value="pending">{STATUS_LABEL.pending}</option>
            <option value="reviewed">{STATUS_LABEL.reviewed}</option>
            <option value="accepted">{STATUS_LABEL.accepted}</option>
            <option value="rejected">{STATUS_LABEL.rejected}</option>
          </select>
          <button
            type="submit"
            className="mt-4 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Status
          </button>
        </form>

        <form
          action={updateMembershipNote}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6"
        >
          <h2 className="text-headline-md text-on-background mb-4">Catatan Panitia</h2>
          <input type="hidden" name="id" value={app.id} />
          <textarea
            name="note"
            rows={4}
            defaultValue={app.note ?? ""}
            placeholder="Catatan internal (tidak terlihat oleh pelamar)"
            className="bg-soft-gray rounded-md p-3 text-body-md w-full resize-none"
          />
          <button
            type="submit"
            className="mt-4 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Catatan
          </button>
        </form>
      </div>

      <div className="mt-8">
        <MembershipDeleteButton id={app.id} />
      </div>
    </div>
  );
}
