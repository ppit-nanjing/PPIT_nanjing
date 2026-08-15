import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { departments, reports, sensusProfiles, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { Download, Users as UsersIcon, GraduationCap, MapPin, FileText } from "lucide-react";

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
  const allUsers = await db.select().from(users);
  const allSensus = await db.select().from(sensusProfiles);
  const allDepartments = await db.select().from(departments);
  const recentReports = await db
    .select({ report: reports, generatedByName: users.name })
    .from(reports)
    .leftJoin(users, eq(reports.generatedBy, users.id))
    .orderBy(desc(reports.generatedAt))
    .limit(20);

  const completedCount = allSensus.filter((s) => s.completionStatus === "complete").length;
  const byUniversity = tally(allSensus.map((s) => s.university));
  const byDegree = tally(allSensus.map((s) => s.degreeLevel));
  const byCity = tally(allSensus.map((s) => s.cityInChina));

  return (
    <div className="px-8 py-10">
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-background mb-2">Laporan</h1>
        <p className="text-body-md text-on-surface-variant">Ringkasan sensus dan generator laporan.</p>
      </div>

      <h2 className="text-headline-md text-on-background mb-4">Generator Laporan</h2>
      <form
        action="/api/console/generate-report"
        method="get"
        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-4 mb-4 max-w-3xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jenis Laporan *</span>
            <select name="type" required defaultValue="student_export" className="bg-soft-gray rounded-md p-3 text-body-md">
              {Object.entries(REPORT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Departemen</span>
            <select name="departmentId" defaultValue="" className="bg-soft-gray rounded-md p-3 text-body-md">
              <option value="">Semua Departemen</option>
              {allDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Dari Tanggal</span>
            <input type="date" name="dateFrom" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Sampai Tanggal</span>
            <input type="date" name="dateTo" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </label>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Catatan (untuk laporan Kustom)</span>
          <input name="note" placeholder="mis. Ringkasan kegiatan Q3" className="bg-soft-gray rounded-md p-3 text-body-md" />
        </label>
        <p className="text-label-caps text-on-surface-variant">
          Departemen dan tanggal hanya berlaku untuk jenis laporan yang relevan — abaikan yang tidak dipakai.
        </p>
        <button
          type="submit"
          className="self-start flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
        >
          <Download size={16} /> Buat & Unduh Laporan (CSV)
        </button>
      </form>

      {recentReports.length > 0 && (
        <details className="mb-12 max-w-3xl">
          <summary className="flex items-center gap-2 text-label-caps text-on-surface-variant uppercase tracking-wide cursor-pointer py-2">
            <FileText size={14} /> Riwayat Laporan ({recentReports.length})
          </summary>
          <div className="flex flex-col gap-2 mt-2">
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
        </details>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-2xl">
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
          <p className="text-display-hero-mobile text-on-background">{byCity.length}</p>
          <p className="text-label-caps text-on-surface-variant uppercase">Kota Tercatat</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <SummaryList title="Universitas" items={byUniversity} />
        <SummaryList title="Jenjang" items={byDegree} />
        <SummaryList title="Kota di Tiongkok" items={byCity} />
      </div>
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  return (
    <div>
      <h2 className="text-headline-md text-on-background mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">Belum ada data.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-body-md">
              <span className="text-on-background">{item.label}</span>
              <span className="text-on-surface-variant">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
