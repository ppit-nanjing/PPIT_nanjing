import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { sensusProfiles, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { MEMBERSHIP_LABEL, membershipStatus, type MembershipStatus } from "@/lib/membership-status";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { SelectField, TextField, primaryBtn } from "@/components/console/form";
import { FileCheck2, FileX2, ChevronRight, Search, Download, History } from "lucide-react";

// Halaman ini menampilkan data sensus yang diisi anggota lewat /sensus,
// LENGKAP per orang termasuk nomor paspor + bukti mahasiswa. Sengaja terkunci
// ke modul "sensus" (untuk sekarang: BPH + Divisi Teknologi) — lihat
// src/lib/admin-scope-constants.ts. Ringkasan agregat tanpa PII tetap di
// /console/reports untuk pemilik modul "reports".

const STATUS_BADGE: Record<MembershipStatus, string> = {
  anggota: "bg-primary-container/40 text-on-primary-container",
  cabang_lain: "bg-tertiary-container/30 text-on-tertiary-container",
  tamu: "bg-outline-variant/40 text-on-surface-variant",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function ConsoleSensusPage({ searchParams }: { searchParams: SearchParams }) {
  await requireModuleAccess("sensus");
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const status = one(sp.status) || "all"; // all | complete | incomplete
  const branch = one(sp.branch) || "all";
  const proof = one(sp.proof) || "all"; // all | has | missing
  const university = one(sp.university) || "all";

  const [rows, guide] = await Promise.all([
    db
      .select({ sensus: sensusProfiles, userName: users.name, userEmail: users.email })
      .from(sensusProfiles)
      .leftJoin(users, eq(sensusProfiles.userId, users.id))
      .orderBy(desc(sensusProfiles.updatedAt)),
    getGuide("sensus"),
  ]);

  const branches = [...new Set(rows.map((r) => r.sensus.branch).filter((b): b is string => Boolean(b)))].sort((a, b) =>
    a.localeCompare(b, "id"),
  );
  const universities = [
    ...new Set(rows.map((r) => r.sensus.university).filter((u): u is string => Boolean(u))),
  ].sort((a, b) => a.localeCompare(b, "id"));

  const needle = q.toLowerCase();
  const filtered = rows.filter(({ sensus: s, userName, userEmail }) => {
    if (status === "complete" && s.completionStatus !== "complete") return false;
    if (status === "incomplete" && s.completionStatus === "complete") return false;
    if (branch !== "all" && s.branch !== branch) return false;
    if (university !== "all" && s.university !== university) return false;
    if (proof === "has" && !s.studentCardUrl) return false;
    if (proof === "missing" && s.studentCardUrl) return false;
    if (needle) {
      const hay = [s.fullName, s.passportNumber, s.university, userName, userEmail]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const counts = rows.reduce(
    (acc, { sensus: s }) => {
      acc.total += 1;
      if (s.completionStatus === "complete") acc.complete += 1;
      else acc.incomplete += 1;
      acc[membershipStatus(s)] += 1;
      return acc;
    },
    { total: 0, complete: 0, incomplete: 0, anggota: 0, cabang_lain: 0, tamu: 0 },
  );

  // Ekspor mengikuti filter yang sedang aktif (rute /api/console/sensus/export
  // menerapkan lagi filter yang sama di sisi server).
  const exportQs = new URLSearchParams(
    Object.entries({ q, status, branch, proof, university }).filter(
      ([, v]) => v && v !== "all",
    ) as [string, string][],
  ).toString();

  const chips = [
    { label: "Mengisi sensus", value: counts.total },
    { label: "Lengkap", value: counts.complete },
    { label: "Belum lengkap", value: counts.incomplete },
    { label: MEMBERSHIP_LABEL.anggota, value: counts.anggota },
    { label: MEMBERSHIP_LABEL.cabang_lain, value: counts.cabang_lain },
    { label: MEMBERSHIP_LABEL.tamu, value: counts.tamu },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Sensus</h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Data mahasiswa yang diisi sendiri anggota lewat halaman Sensus, lengkap dengan bukti kartu
            mahasiswa / LOA. Dipakai untuk memverifikasi status mahasiswa dan rekap ke PPI Tiongkok pusat.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/console/sensus/audit-log"
            className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background transition-colors"
          >
            <History size={14} aria-hidden /> Log Perubahan
          </Link>
          {guide && <GuideButton title={guide.title} content={guide.content} docSlug="sensus" />}
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <TextField name="q" label="Cari pengguna" defaultValue={q} placeholder="Nama, paspor, universitas, email" />
          <SelectField
            name="university"
            label="Universitas / Kampus"
            defaultValue={university}
            options={[{ value: "all", label: "Semua kampus" }, ...universities.map((u) => ({ value: u, label: u }))]}
          />
          <SelectField
            name="branch"
            label="Cabang"
            defaultValue={branch}
            options={[{ value: "all", label: "Semua cabang" }, ...branches.map((b) => ({ value: b, label: b }))]}
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
          <SelectField
            name="proof"
            label="Bukti mahasiswa"
            defaultValue={proof}
            options={[
              { value: "all", label: "Semua" },
              { value: "has", label: "Ada kartu / LOA" },
              { value: "missing", label: "Belum ada" },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button type="submit" className={`${primaryBtn} inline-flex items-center gap-2`}>
            <Search size={16} /> Cari
          </button>
          {(q || status !== "all" || branch !== "all" || proof !== "all" || university !== "all") && (
            <Link href="/console/sensus" className="text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background">
              Reset
            </Link>
          )}
          <span className="ml-auto flex items-center gap-3 text-label-caps uppercase tracking-wide">
            <span className="text-on-surface-variant">Ekspor {filtered.length} baris</span>
            <a
              href={`/api/console/sensus/export?${exportQs}&format=csv`}
              className="inline-flex items-center gap-1.5 text-primary-container hover:text-primary transition-colors"
            >
              <Download size={14} aria-hidden /> CSV
            </a>
            <a
              href={`/api/console/sensus/export?${exportQs}&format=xlsx`}
              className="inline-flex items-center gap-1.5 text-primary-container hover:text-primary transition-colors"
            >
              <Download size={14} aria-hidden /> XLSX
            </a>
          </span>
        </div>
      </form>

      <CollapsibleSection title={`Daftar (${filtered.length})`}>
        {filtered.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Tidak ada sensus yang cocok dengan filter.</p>
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant">
            {filtered.map(({ sensus: s, userName, userEmail }) => {
              const who = s.fullName || userName || userEmail || "Tanpa nama";
              const ms = membershipStatus(s);
              return (
                <Link
                  key={s.id}
                  href={`/console/sensus/${s.id}`}
                  className="flex items-center gap-4 py-3 hover:bg-surface-container-low/60 transition-colors -mx-2 px-2 rounded-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md text-on-background truncate">{who}</p>
                    <p className="text-label-caps text-on-surface-variant truncate">
                      {[s.university, s.branch, s.degreeLevel].filter(Boolean).join(" · ") || "Data belum lengkap"}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-on-surface-variant"
                    title={s.studentCardUrl ? "Ada bukti kartu mahasiswa / LOA" : "Belum ada bukti kartu mahasiswa"}
                  >
                    {s.studentCardUrl ? (
                      <FileCheck2 size={18} className="text-primary-container" />
                    ) : (
                      <FileX2 size={18} className="text-outline" />
                    )}
                  </span>
                  <span className={`shrink-0 text-label-caps px-2.5 py-1 rounded-full ${STATUS_BADGE[ms]}`}>
                    {MEMBERSHIP_LABEL[ms]}
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
                  <ChevronRight size={16} className="shrink-0 text-on-surface-variant" />
                </Link>
              );
            })}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
