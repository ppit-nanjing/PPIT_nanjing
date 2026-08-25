import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { membershipApplications, recruitmentPeriods } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { MembershipTabs } from "@/components/console/membership-tabs";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ConfirmButton } from "@/components/console/confirm-button";
import { fieldInput as input, primaryBtn } from "@/components/console/form";
import { createRecruitmentPeriod, setRecruitmentPeriodOpen } from "@/app/actions/membership";

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

export default async function ConsoleMembershipPage() {
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
  // Latest period first; NULLS LAST keeps never-scheduled batches at the end.
  const periods = await db
    .select()
    .from(recruitmentPeriods)
    .orderBy(sql`${recruitmentPeriods.opensAt} desc nulls last`);
  const guide = await getGuide("pendaftaran");
  const pendingCount = apps.filter((a) => a.status === "pending").length;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Pendaftaran Anggota</h1>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="pendaftaran" />}
      </div>
      <p className="text-body-md text-on-surface-variant mb-4">
        {apps.length} pendaftar
        {pendingCount > 0 && (
          <>
            {" "}· <span className="text-on-background font-medium">{pendingCount} menunggu keputusan</span>
          </>
        )}
        .
      </p>
      <MembershipTabs active="list" />

      {/* Periode rekrutmen: /join-us membaca isOpen periode terbaru - dulu satu-satunya
          cara membuka/menutup pendaftaran adalah seed script ke database produksi. */}
      <CollapsibleSection
        title="Periode Pendaftaran"
        description={`${periods.filter((p) => p.isOpen).length} periode terbuka`}
        className="mb-6"
        defaultOpen={false}
      >
        <form action={createRecruitmentPeriod} className="flex flex-col gap-4 max-w-2xl mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nama batch *</span>
              <input name="batchLabel" required placeholder="mis. Kepengurusan 2026/2027" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Buka</span>
              <input name="opensAt" type="datetime-local" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Tutup</span>
              <input name="closesAt" type="datetime-local" className={input} />
            </label>
          </div>
          <button type="submit" className={primaryBtn}>
            Tambah Periode (mulai dalam status tutup)
          </button>
        </form>

        <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
          {periods.length === 0 ? (
            <li className="py-4 text-body-md text-on-surface-variant">Belum ada periode.</li>
          ) : (
            periods.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 py-3 last:border-0">
                <div className="min-w-0">
                  <p className="text-body-md text-on-background">
                    {p.batchLabel ?? "(tanpa nama)"}{" "}
                    <span
                      className={`ml-1 px-2 py-0.5 rounded-full text-label-caps ${
                        p.isOpen ? "bg-primary-container/40 text-on-primary-container" : "bg-outline-variant/40 text-on-surface-variant"
                      }`}
                    >
                      {p.isOpen ? "Terbuka" : "Tutup"}
                    </span>
                  </p>
                  <p className="text-label-caps text-on-surface-variant">
                    {p.opensAt ? new Date(p.opensAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                    {" → "}
                    {p.closesAt ? new Date(p.closesAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                  </p>
                </div>
                <ConfirmButton
                  title={p.isOpen ? "Tutup pendaftaran?" : "Buka pendaftaran?"}
                  message={
                    p.isOpen
                      ? `Formulir /join-us untuk "${p.batchLabel ?? "periode ini"}" langsung tidak bisa diisi publik.`
                      : `Formulir /join-us untuk "${p.batchLabel ?? "periode ini"}" langsung bisa diisi publik.`
                  }
                  confirmLabel={p.isOpen ? "Ya, tutup" : "Ya, buka"}
                  danger={p.isOpen}
                  action={setRecruitmentPeriodOpen}
                  payload={{ id: p.id, open: String(!p.isOpen) }}
                  className={`text-label-caps uppercase tracking-wide px-4 py-2 rounded-md border transition-colors ${
                    p.isOpen
                      ? "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                      : "border-primary-container/60 text-primary-container hover:bg-primary-container/10"
                  }`}
                >
                  {p.isOpen ? "Tutup" : "Buka"}
                </ConfirmButton>
              </li>
            ))
          )}
        </ul>
      </CollapsibleSection>

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
                  Belum ada pendaftar.
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
          <p className="text-body-md text-on-surface-variant">Belum ada pendaftar.</p>
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
      <p className="text-label-caps text-on-surface-variant mt-4">
        Klik nama pendaftar untuk melihat detail, mengubah status, menambahkan catatan, atau menghapus.
      </p>
    </div>
  );
}
