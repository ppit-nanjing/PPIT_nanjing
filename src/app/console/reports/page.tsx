import { db } from "@/db";
import { sensusProfiles, users } from "@/db/schema";
import { Download, Users as UsersIcon, GraduationCap, MapPin } from "lucide-react";

function tally(values: (string | null)[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v?.trim() || "Tidak diisi";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export default async function ConsoleReportsPage() {
  const allUsers = await db.select().from(users);
  const allSensus = await db.select().from(sensusProfiles);

  const completedCount = allSensus.filter((s) => s.completionStatus === "complete").length;
  const byUniversity = tally(allSensus.map((s) => s.university));
  const byDegree = tally(allSensus.map((s) => s.degreeLevel));
  const byCity = tally(allSensus.map((s) => s.cityInChina));

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-headline-lg text-on-background mb-2">Laporan</h1>
          <p className="text-body-md text-on-surface-variant">Ringkasan sensus dan ekspor data mahasiswa.</p>
        </div>
        <a
          href="/api/console/export-students"
          className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors shrink-0"
        >
          <Download size={16} /> Ekspor Data Mahasiswa (CSV)
        </a>
      </div>

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
