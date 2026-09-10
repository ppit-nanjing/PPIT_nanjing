import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sensusProfiles, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { RANTINGS, universityInRanting } from "@/lib/rantings";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { TextField, primaryBtn } from "@/components/console/form";
import { FileCheck2, FileX2, Search, Download } from "lucide-react";

// Ringkasan sensus untuk pengurus ranting (role "[INA]/[JIA] BPH Ranting").
// SENGAJA minimal: hanya kampus sendiri, hanya "siapa yang sudah/belum isi" +
// apakah kartu mahasiswa diunggah. Tanpa nomor paspor, tanpa halaman detail,
// tanpa CRUD - itu semua ada di /console/sensus yang terkunci ke modul penuh
// "sensus". Lihat src/lib/rantings.ts dan resolveAdminScope() di src/auth.ts.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RantingSensusPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireModuleAccess("sensus-ranting");
  const code = session.user.rantingCode;
  // Full admin tanpa ranting bisa sampai sini lewat item sidebar - tidak ada
  // kampus untuk difilter, jadi arahkan ke /console/sensus yang memang untuk
  // mereka.
  if (!code) redirect("/console/sensus");

  const sp = await searchParams;
  const qRaw = sp.q;
  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw ?? "").trim();
  const needle = q.toLowerCase();

  const ranting = RANTINGS[code];
  const rows = await db
    .select({ sensus: sensusProfiles, userName: users.name, userEmail: users.email })
    .from(sensusProfiles)
    .leftJoin(users, eq(sensusProfiles.userId, users.id))
    .orderBy(desc(sensusProfiles.updatedAt));

  const campusRows = rows.filter((r) => universityInRanting(r.sensus.university, code));
  const mine = needle
    ? campusRows.filter((r) =>
        // Tanpa paspor - ranting tidak melihat itu.
        [r.sensus.fullName, r.sensus.major, r.userName, r.userEmail]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : campusRows;
  const complete = campusRows.filter((r) => r.sensus.completionStatus === "complete").length;
  const withCard = campusRows.filter((r) => r.sensus.studentCardUrl).length;

  const chips = [
    { label: "Mengisi sensus", value: campusRows.length },
    { label: "Lengkap", value: complete },
    { label: "Belum lengkap", value: campusRows.length - complete },
    { label: "Ada kartu / LOA", value: withCard },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Sensus Ranting {ranting.label}</h1>
        <p className="text-body-md text-on-surface-variant max-w-2xl">
          Ringkasan pengisian sensus mahasiswa {code === "INA" ? "NUIST" : "JSAHVC"}. Hanya data kampus ranting kamu —
          untuk melihat siapa yang sudah dan belum mengisi. Nomor paspor dan data pribadi lengkap tidak ditampilkan di
          sini.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {chips.map((c) => (
          <div
            key={c.label}
            className="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 min-w-[7rem]"
          >
            <p className="text-display-hero-mobile text-on-background leading-none">{c.value}</p>
            <p className="text-label-caps text-on-surface-variant uppercase mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <form method="get" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6 mb-6">
        <div className="max-w-sm">
          <TextField name="q" label="Cari pengguna" defaultValue={q} placeholder="Nama atau jurusan" />
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button type="submit" className={`${primaryBtn} inline-flex items-center gap-2`}>
            <Search size={16} /> Cari
          </button>
          {q && (
            <Link href="/console/ranting/sensus" className="text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background">
              Reset
            </Link>
          )}
          <a
            href={`/api/console/sensus/export?format=csv${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className="ml-auto inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors"
          >
            <Download size={14} aria-hidden /> Ekspor CSV
          </a>
        </div>
      </form>

      <CollapsibleSection title={`Daftar (${mine.length})`}>
        {mine.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">
            {ranting.universities.length === 0
              ? "Kampus untuk ranting ini belum dipetakan. Hubungi tim teknologi."
              : "Belum ada mahasiswa kampus ini yang mengisi sensus."}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant">
            {mine.map(({ sensus: s, userName, userEmail }) => {
              const who = s.fullName || userName || userEmail || "Tanpa nama";
              return (
                <div key={s.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md text-on-background truncate">{who}</p>
                    <p className="text-label-caps text-on-surface-variant truncate">
                      {[s.major, s.degreeLevel].filter(Boolean).join(" · ") || "Data belum lengkap"}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-on-surface-variant"
                    title={s.studentCardUrl ? "Kartu mahasiswa / LOA sudah diunggah" : "Belum ada bukti kartu mahasiswa"}
                  >
                    {s.studentCardUrl ? (
                      <FileCheck2 size={18} className="text-primary-container" />
                    ) : (
                      <FileX2 size={18} className="text-outline" />
                    )}
                  </span>
                  <span
                    className={`shrink-0 text-label-caps px-2.5 py-1 rounded-full ${
                      s.completionStatus === "complete"
                        ? "bg-primary-container/20 text-on-primary-container"
                        : "bg-error-container/30 text-on-error-container"
                    }`}
                  >
                    {s.completionStatus === "complete" ? "Lengkap" : "Belum lengkap"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
