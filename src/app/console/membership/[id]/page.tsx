import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { membershipApplications, recruitmentPeriods } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import {
  updateMembershipStatus,
  updateMembershipNote,
  getFormFields,
  getFormMeta,
} from "@/app/actions/membership";
import { scoreApplication } from "@/lib/membership-form";
import { MembershipDeleteButton } from "@/components/console/membership-delete-button";
import { MembershipTabs } from "@/components/console/membership-tabs";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { CORE_KEYS, type MembershipFieldDef } from "@/lib/membership-form";
import Image from "next/image";
import Link from "next/link";

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
  const meta = await getFormMeta();
  const labelByKey = new Map(fields.map((f) => [f.key, f.label]));
  const coreKeys = new Set(Object.values(CORE_KEYS));
  const responses = (app.responses as Record<string, unknown> | null) ?? {};
  const rawScore = meta.isQuiz ? scoreApplication(responses, fields) : null;
  // Nothing useful to show until at least one question carries a point value.
  const quizScore = rawScore && rawScore.max > 0 ? rawScore : null;
  const extraAnswers = Object.entries(responses).filter(([k]) => !coreKeys.has(k as never) && k !== "fullName" && k !== "email");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-3xl">
      <Link href="/console/membership" className="text-label-caps text-secondary uppercase hover:text-on-background">
        &larr; Kembali ke Daftar
      </Link>
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mt-2 mb-1">{app.fullName}</h1>
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

      <CollapsibleSection title="Data Pendaftar">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
          {FIELDS.map((f) => (
            <div key={f.key} className="px-6 py-4">
              <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{f.label}</p>
              <p className="text-body-md text-on-background whitespace-pre-wrap mt-1">{row[f.key] ?? "-"}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {quizScore && (
        <div className="mt-6 bg-tertiary-container/20 border border-outline-variant rounded-xl p-4 flex items-center gap-3">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Skor Kuis</span>
          <span className="text-headline-md text-on-background">{quizScore.score}</span>
          <span className="text-body-md text-on-surface-variant">/ {quizScore.max} poin</span>
        </div>
      )}

      {extraAnswers.length > 0 && (
        <CollapsibleSection title="Jawaban Tambahan" className="mt-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
            {extraAnswers.map(([k, v]) => {
              const field = fields.find((f) => f.key === k);
              const type = field?.type;
              const raw = typeof v === "string" ? v : v == null ? "" : JSON.stringify(v);
              let listValues: string[] | null = null;
              if (type === "multiselect" && raw) {
                try {
                  const parsed = JSON.parse(raw);
                  if (Array.isArray(parsed)) listValues = parsed.map(String);
                } catch {
                  listValues = [raw];
                }
              }
              return (
                <div key={k} className="px-6 py-4">
                  <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{labelByKey.get(k) ?? k}</p>
                  {type === "image" && raw ? (
                    <Image
                      src={raw}
                      alt={labelByKey.get(k) ?? k}
                      width={640}
                      height={480}
                      className="max-h-48 w-auto h-auto rounded-md object-contain mt-1"
                    />
                  ) : type === "checkbox" ? (
                    <p className="text-body-md text-on-background mt-1">{raw === "true" ? "Ya" : "Tidak"}</p>
                  ) : type === "file" && raw ? (
                    <a href={raw} target="_blank" rel="noopener noreferrer" className="text-body-md text-primary-container underline mt-1 break-all">
                      {decodeURIComponent(raw.split("/").pop() ?? raw)}
                    </a>
                  ) : type === "url" && raw ? (
                    <a href={raw} target="_blank" rel="noopener noreferrer" className="text-body-md text-primary-container underline mt-1 break-all">
                      {raw}
                    </a>
                  ) : listValues ? (
                    <ul className="list-disc list-inside text-body-md text-on-background mt-1">
                      {listValues.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : type === "grid_radio" || type === "grid_checkbox" ? (
                    <GridAnswer field={field} value={v} />
                  ) : type === "rating" && raw ? (
                    <p className="text-body-md text-on-background mt-1">
                      {raw}
                      {field?.config?.max ? ` / ${field.config.max}` : ""}
                    </p>
                  ) : (
                    <p className="text-body-md text-on-background whitespace-pre-wrap mt-1">{raw || "-"}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Tindakan Panitia" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </CollapsibleSection>

      <div className="mt-8">
        <MembershipDeleteButton id={app.id} />
      </div>
    </div>
  );
}

function GridAnswer({ field, value }: { field: MembershipFieldDef | undefined; value: unknown }) {
  const rows = field?.config?.rows ?? [];
  const map = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  if (rows.length === 0) return <p className="text-body-md text-on-background mt-1">-</p>;
  return (
    <table className="mt-1 text-body-md w-full max-w-md">
      <tbody>
        {rows.map((r, i) => {
          const ans = map[String(i)];
          const text = Array.isArray(ans) ? ans.join(", ") : ans ? String(ans) : "-";
          return (
            <tr key={i} className="border-b border-outline-variant/60">
              <td className="py-1 pr-4 text-on-surface-variant">{r}</td>
              <td className="py-1 text-on-background">{text}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
