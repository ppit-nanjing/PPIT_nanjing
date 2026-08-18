import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { membershipApplications, recruitmentPeriods } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { MembershipTabs } from "@/components/console/membership-tabs";
import { getFormMeta } from "@/app/actions/membership";
import { Download, ExternalLink } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  reviewed: "Sudah Ditinjau",
  accepted: "Diterima",
  rejected: "Ditolak",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-outline-variant/40 text-on-surface-variant",
  reviewed: "bg-tertiary-container/30 text-on-tertiary-container",
  accepted: "bg-primary-container/40 text-on-primary-container",
  rejected: "bg-error-container/40 text-on-error-container",
};

export default async function MembershipResponsesPage() {
  await requireModuleAccess("membership");

  const apps = await db
    .select({
      id: membershipApplications.id,
      fullName: membershipApplications.fullName,
      email: membershipApplications.email,
      divisionInterest: membershipApplications.divisionInterest,
      status: membershipApplications.status,
      submittedAt: membershipApplications.submittedAt,
      batchLabel: recruitmentPeriods.batchLabel,
    })
    .from(membershipApplications)
    .leftJoin(recruitmentPeriods, eq(membershipApplications.recruitmentPeriodId, recruitmentPeriods.id))
    .orderBy(desc(membershipApplications.submittedAt));

  const meta = await getFormMeta();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Jawaban Pendaftar</h1>
        <a
          href="/api/console/membership/export-csv"
          className="inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md hover:bg-primary transition-colors"
        >
          <Download size={16} /> Export ke CSV
        </a>
        {meta.spreadsheetUrl && (
          <a
            href={meta.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-surface-container-low text-on-background border border-outline-variant text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md hover:bg-soft-gray transition-colors"
          >
            <ExternalLink size={16} /> Buka Spreadsheet
          </a>
        )}
      </div>
      <p className="text-body-md text-on-surface-variant mb-4">
        {apps.length} jawaban terkumpul. Export CSV menghasilkan satu baris per pendaftar dengan tiap pertanyaan
        sebagai kolom — bisa dibuka di Excel / Google Sheets.
      </p>
      <MembershipTabs active="responses" />

      <div className="hidden sm:block bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
        <table className="w-full text-body-md min-w-[720px]">
          <thead className="bg-surface-container-low text-label-caps uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="text-left px-5 py-3">Nama</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Minat Divisi</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Terkirim</th>
              <th className="text-left px-5 py-3">Periode</th>
            </tr>
          </thead>
          <tbody>
            {apps.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-on-surface-variant">
                  Belum ada jawaban.
                </td>
              </tr>
            )}
            {apps.map((a) => (
              <tr key={a.id} className="border-t border-outline-variant hover:bg-surface-container-low transition-colors">
                <td className="px-5 py-3">
                  <a href={`/console/membership/${a.id}`} className="font-medium text-primary-container hover:text-primary">
                    {a.fullName}
                  </a>
                </td>
                <td className="px-5 py-3 text-on-surface-variant">{a.email}</td>
                <td className="px-5 py-3 text-on-surface-variant">{a.divisionInterest ?? "-"}</td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-label-caps ${STATUS_CLASS[a.status] ?? STATUS_CLASS.pending}`}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-on-surface-variant">
                  {a.submittedAt ? new Date(a.submittedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-"}
                </td>
                <td className="px-5 py-3 text-on-surface-variant">{a.batchLabel ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden flex flex-col gap-3">
        {apps.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Belum ada jawaban.</p>
        ) : (
          apps.map((a) => (
            <div key={a.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-2">
              <div>
                <a href={`/console/membership/${a.id}`} className="font-medium text-primary-container hover:text-primary">
                  {a.fullName}
                </a>
                <p className="text-label-caps text-on-surface-variant">{a.email}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-md">
                <div>
                  <dt className="text-label-caps text-on-surface-variant">Minat Divisi</dt>
                  <dd className="text-on-background">{a.divisionInterest ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-label-caps text-on-surface-variant">Status</dt>
                  <dd>
                    <span className={`px-2.5 py-1 rounded-full text-label-caps ${STATUS_CLASS[a.status] ?? STATUS_CLASS.pending}`}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-label-caps text-on-surface-variant">Terkirim</dt>
                  <dd className="text-on-background">
                    {a.submittedAt ? new Date(a.submittedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-label-caps text-on-surface-variant">Periode</dt>
                  <dd className="text-on-background">{a.batchLabel ?? "-"}</dd>
                </div>
              </dl>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
