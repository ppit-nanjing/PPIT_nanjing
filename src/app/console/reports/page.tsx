import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { departments, regionalBranches, reports, sensusProfiles, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { HOME_BRANCH, MEMBERSHIP_LABEL, membershipStatus } from "@/lib/membership-status";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { Download, Users as UsersIcon, GraduationCap, MapPin } from "lucide-react";
import { TextField, SelectField, FormActions, primaryBtn } from "@/components/console/form";

const REPORT_TYPE_LABEL: Record<string, string> = {
  event_attendance: "Kehadiran Acara",
  inventory_audit: "Audit Inventaris",
  sensus_summary: "Ringkasan Sensus",
  student_export: "Ekspor Data Mahasiswa",
  custom: "Kustom",
};

function tally(values: (string | null)[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v?.trim() || "Tidak diisi";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export default async function ConsoleReportsPage() {
  await requireModuleAccess("reports");
  // Perf: all five reads are independent - run them concurrently instead of
  // adding up five serial round trips to the Neon proxy.
  const [allUsers, allSensus, allDepartments, branchRows, recentReports, guide] = await Promise.all([
    db.select().from(users),
    db.select().from(sensusProfiles),
    db.select().from(departments),
    db.select({ cityName: regionalBranches.cityName }).from(regionalBranches),
    db
      .select({ report: reports, generatedByName: users.name })
      .from(reports)
      .leftJoin(users, eq(reports.generatedBy, users.id))
      .orderBy(desc(reports.generatedAt))
      .limit(20),
    getGuide("laporan"),
  ]);
  const allBranches = branchRows.map((b) => b.cityName).sort((a, b) => a.localeCompare(b));

  const completedCount = allSensus.filter((s) => s.completionStatus === "complete").length;
  const byUniversity = tally(allSensus.map((s) => s.university));
  const byDegree = tally(allSensus.map((s) => s.degreeLevel));
  const byBranch = tally(allSensus.map((s) => s.branch));
  // Dihitung dari SEMUA akun, bukan dari allSensus: orang yang belum pernah
  // menyentuh sensus tidak punya baris di sana sama sekali, dan justru merekalah
  // "Tamu" — kalau dihitung dari allSensus, ember itu selalu terlihat kosong.
  const sensusByUser = new Map(allSensus.map((s) => [s.userId, s]));
  const byMembership = tally(allUsers.map((u) => MEMBERSHIP_LABEL[membershipStatus(sensusByUser.get(u.id))]));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Laporan</h1>
          <p className="text-body-md text-on-surface-variant">Ringkasan sensus dan generator laporan.</p>
        </div>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="laporan" />}
      </div>

      <div className="flex flex-col gap-6">
        <CollapsibleSection title="Generator Laporan">
          <form
            action="/api/console/generate-report"
            method="get"
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-4 max-w-3xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SelectField
                name="type"
                label="Jenis Laporan"
                required
                defaultValue="student_export"
                options={Object.entries(REPORT_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
              />
              <SelectField
                name="departmentId"
                label="Departemen"
                defaultValue=""
                placeholder="Semua Departemen"
                options={allDepartments.map((d) => ({ value: d.id, label: d.name }))}
              />
              <TextField name="dateFrom" label="Dari Tanggal" type="date" />
              <TextField name="dateTo" label="Sampai Tanggal" type="date" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SelectField
                name="sensusBranch"
                label="Cabang (Ringkasan Sensus)"
                defaultValue={HOME_BRANCH}
                hint={`Default ${HOME_BRANCH} + hanya lengkap = baris siap setor ke pusat.`}
                options={[
                  { value: HOME_BRANCH, label: `${HOME_BRANCH} (cabang kita)` },
                  { value: "", label: "Semua cabang" },
                  ...allBranches.filter((b) => b !== HOME_BRANCH).map((b) => ({ value: b, label: b })),
                ]}
              />
              <SelectField
                name="sensusCompletion"
                label="Kelengkapan (Ringkasan Sensus)"
                defaultValue="complete"
                options={[
                  { value: "complete", label: "Hanya yang lengkap (siap setor ke pusat)" },
                  { value: "", label: "Semua, termasuk yang belum lengkap" },
                ]}
              />
            </div>
            <TextField name="note" label="Catatan (untuk laporan Kustom)" placeholder="mis. Ringkasan kegiatan Q3" />
            <p className="text-xs text-on-surface-variant">
              Departemen dan tanggal hanya berlaku untuk jenis laporan yang relevan — abaikan yang tidak dipakai.
            </p>
            <FormActions>
              <button type="submit" className={`${primaryBtn} flex items-center gap-2`}>
                <Download size={16} /> Buat & Unduh Laporan (CSV)
              </button>
            </FormActions>
          </form>
        </CollapsibleSection>

        {recentReports.length > 0 && (
          <CollapsibleSection title={`Riwayat Laporan (${recentReports.length})`}>
            <div className="flex flex-col gap-2">
              {recentReports.map(({ report, generatedByName }) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-body-md"
                >
                  <span className="text-on-background">{REPORT_TYPE_LABEL[report.type] ?? report.type}</span>
                  <span className="text-on-surface-variant text-label-caps">
                    {generatedByName ?? "—"} &middot; {report.generatedAt.toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Statistik Sensus">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
            <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6">
              <UsersIcon className="text-primary-container mb-2" size={20} />
              <p className="text-display-hero-mobile text-on-background">{allUsers.length}</p>
              <p className="text-label-caps text-on-surface-variant uppercase">Total Pengguna</p>
            </div>
            <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6">
              <GraduationCap className="text-primary-container mb-2" size={20} />
              <p className="text-display-hero-mobile text-on-background">{completedCount}</p>
              <p className="text-label-caps text-on-surface-variant uppercase">Sensus Lengkap</p>
            </div>
            <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6">
              <MapPin className="text-primary-container mb-2" size={20} />
              <p className="text-display-hero-mobile text-on-background">{byBranch.length}</p>
              <p className="text-label-caps text-on-surface-variant uppercase">Cabang Tercatat</p>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Status Keanggotaan">
          <SummaryList items={byMembership} />
          <p className="text-label-caps text-on-surface-variant mt-3">
            Diturunkan dari sensus + cabang, bukan kolom tersendiri. &ldquo;Tamu&rdquo; = sensusnya belum lengkap, jadi
            belum bisa dibedakan antara warga Nanjing yang belum sempat mengisi dan tamu dari luar — jawaban cabang di
            form pendaftaran acara yang memisahkan keduanya.
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="Universitas">
          <SummaryList items={byUniversity} />
        </CollapsibleSection>
        <CollapsibleSection title="Jenjang">
          <SummaryList items={byDegree} />
        </CollapsibleSection>
        <CollapsibleSection title="Cabang">
          <SummaryList items={byBranch} />
        </CollapsibleSection>
      </div>
    </div>
  );
}

function SummaryList({ items }: { items: { label: string; count: number }[] }) {
  if (items.length === 0) return <p className="text-body-md text-on-surface-variant">Belum ada data.</p>;
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between text-body-md">
          <span className="text-on-background">{item.label}</span>
          <span className="text-on-surface-variant">{item.count}</span>
        </div>
      ))}
    </div>
  );
}
