import Link from "next/link";
import { Search } from "lucide-react";
import type { sensusProfiles } from "@/db/schema";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ProofView } from "@/components/console/proof-view";
import { SelectField, TextField, primaryBtn } from "@/components/console/form";

// Tampilan sensus TERBATAS untuk pemegang modul "sensus-verify" (mis. Divisi
// Humas kabinet) yang TIDAK punya modul "sensus" penuh. Hanya untuk mencocokkan
// "ini benar mahasiswa X di kampus Y?" — jadi cuma nama, kampus, status
// kelengkapan, dan foto bukti kartu mahasiswa / LOA. TIDAK ADA nomor paspor,
// kontak, kota, jurusan, ekspor, atau ubah/hapus — semuanya di /console/sensus
// penuh (modul "sensus", src/lib/admin-scope-constants.ts).

type Row = {
  sensus: typeof sensusProfiles.$inferSelect;
  userName: string | null;
  userEmail: string | null;
};

export function SensusVerifyList({
  rows,
  q,
  status,
  university,
}: {
  rows: Row[];
  q: string;
  status: string; // all | complete | incomplete
  university: string; // "all" | exact name
}) {
  const universities = [
    ...new Set(rows.map((r) => r.sensus.university).filter((u): u is string => Boolean(u))),
  ].sort((a, b) => a.localeCompare(b, "id"));

  const needle = q.toLowerCase();
  const filtered = rows.filter(({ sensus: s, userName }) => {
    if (status === "complete" && s.completionStatus !== "complete") return false;
    if (status === "incomplete" && s.completionStatus === "complete") return false;
    if (university !== "all" && s.university !== university) return false;
    if (needle) {
      // Sengaja TANPA paspor/email di keranjang pencarian — pemegang view ini
      // memang tidak boleh melihatnya.
      const hay = [s.fullName, s.university, userName].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Verifikasi Mahasiswa</h1>
        <p className="text-body-md text-on-surface-variant max-w-2xl">
          Nama, kampus, dan bukti kartu mahasiswa / LOA yang diisi anggota lewat halaman Sensus — untuk
          memverifikasi status mahasiswa. Data lengkap (paspor, kontak, dsb.) hanya untuk BPH &amp; Divisi
          Teknologi.
        </p>
      </div>

      <form method="get" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <TextField name="q" label="Cari" defaultValue={q} placeholder="Nama atau kampus" />
          <SelectField
            name="university"
            label="Kampus"
            defaultValue={university}
            options={[{ value: "all", label: "Semua kampus" }, ...universities.map((u) => ({ value: u, label: u }))]}
          />
          <SelectField
            name="status"
            label="Kelengkapan"
            defaultValue={status}
            options={[
              { value: "all", label: "Semua" },
              { value: "complete", label: "Lengkap" },
              { value: "incomplete", label: "Belum lengkap" },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button type="submit" className={`${primaryBtn} inline-flex items-center gap-2`}>
            <Search size={16} /> Cari
          </button>
          {(q || status !== "all" || university !== "all") && (
            <Link href="/console/sensus" className="text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background">
              Reset
            </Link>
          )}
        </div>
      </form>

      <CollapsibleSection title={`Daftar (${filtered.length})`}>
        {filtered.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Tidak ada yang cocok.</p>
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant">
            {filtered.map(({ sensus: s, userName, userEmail }) => {
              const who = s.fullName || userName || userEmail || "Tanpa nama";
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md text-on-background truncate">{who}</p>
                    <p className="text-label-caps text-on-surface-variant truncate">
                      {s.university || "Kampus belum diisi"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-label-caps px-2.5 py-1 rounded-full ${
                      s.completionStatus === "complete"
                        ? "bg-primary-container/20 text-on-primary-container"
                        : "bg-error-container/30 text-on-error-container"
                    }`}
                  >
                    {s.completionStatus === "complete" ? "Lengkap" : "Belum lengkap"}
                  </span>
                  <div className="shrink-0">
                    <ProofView url={s.studentCardUrl} label={`Bukti mahasiswa — ${who}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
