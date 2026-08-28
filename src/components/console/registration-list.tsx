"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { checkInRegistration } from "@/app/actions/admin-events";

interface Registration {
  id: string;
  userName: string | null;
  userEmail: string | null;
  status: "pending" | "confirmed" | "attended" | "cancelled";
  registeredAt: string;
  // Turunan dari sensus (lihat src/lib/membership-status.ts), bukan kolom di
  // database. `branch` diisi dari sensus kalau lengkap, kalau tidak dari jawaban
  // peserta saat mendaftar; null untuk pendaftaran lama sebelum ditanyakan.
  membership: string;
  branch: string | null;
  // Jawaban pertanyaan kustom acara, { [questionId]: string }.
  answers?: Record<string, string> | null;
  // Kategori tarif yang dipilih peserta, mis. "Freshmen (¥15)". null = acara
  // gratis / tarif tunggal / pendaftaran lama.
  feeLabel?: string | null;
  // Biodata lengkap yang di-snapshot saat mendaftar (acara requiresBiodata).
  biodata?: Record<string, string> | null;
}

const BIODATA_LABEL: Record<string, string> = {
  fullName: "Nama Lengkap",
  passportNumber: "Nomor Paspor",
  wechatId: "WeChat ID",
  chinaPhone: "No. Telpon China",
  branch: "Kota / Ranting",
  university: "Universitas",
  major: "Jurusan",
  entryYear: "Tahun Angkatan",
  studentProofUrl: "Bukti Mahasiswa Aktif",
};

interface QuestionRef {
  id: string;
  label: string;
}

const STATUS_LABEL: Record<Registration["status"], string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  attended: "Hadir",
  cancelled: "Dibatalkan",
};

export function RegistrationList({
  eventId,
  registrations,
  questions = [],
}: {
  eventId: string;
  registrations: Registration[];
  questions?: QuestionRef[];
}) {
  const [isPending, startTransition] = useTransition();
  // Satu banner error + id baris yang sedang diproses, dipakai bersama tabel
  // dan tampilan mobile. Tanpa ini, kegagalan (mis. sesi habis saat admin
  // meninggalkan tab) meledak ke error boundary dan menghapus posisi scroll.
  const [error, setError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  function checkIn(registrationId: string) {
    setError(null);
    setCheckingId(registrationId);
    startTransition(async () => {
      try {
        await checkInRegistration(registrationId, eventId);
      } catch {
        setError("Check-in gagal. Muat ulang halaman lalu coba lagi.");
      } finally {
        setCheckingId(null);
      }
    });
  }

  const CheckInButton = ({ r }: { r: Registration }) =>
    r.status !== "attended" ? (
      <button
        onClick={() => checkIn(r.id)}
        disabled={isPending}
        className="flex items-center gap-1 text-label-caps text-primary-container hover:text-primary disabled:opacity-50"
      >
        <CheckCircle2 size={14} /> {checkingId === r.id ? "Memproses…" : "Check-in"}
      </button>
    ) : null;

  if (registrations.length === 0) {
    return <p className="text-body-md text-on-surface-variant">Belum ada yang mendaftar.</p>;
  }

  // Jawaban dirakit sekali per baris; pertanyaan yang sudah dihapus dari acara
  // menyisakan kunci mati di answersJson - dilewati, bukan ditampilkan kosong.
  const answersOf = (r: Registration) =>
    questions
      .map((q) => ({ label: q.label, value: r.answers?.[q.id] ?? "" }))
      .filter((a) => a.value);

  const biodataOf = (r: Registration) =>
    r.biodata
      ? Object.entries(BIODATA_LABEL)
          .map(([key, label]) => ({ label, key, value: r.biodata?.[key] ?? "" }))
          .filter((b) => b.value)
      : [];

  const AnswerList = ({ r }: { r: Registration }) => {
    const answers = answersOf(r);
    const biodata = biodataOf(r);
    if (answers.length === 0 && biodata.length === 0) return null;
    return (
      <ul className="mt-2 flex flex-col gap-0.5">
        {biodata.map((b) => (
          <li key={b.label} className="text-label-caps text-on-surface-variant">
            {b.label}:{" "}
            {/* Link hanya untuk URL http(s) yang aman; nilai lain dirender
                sebagai teks biasa supaya skema javascript: tidak pernah jadi
                href (server juga sudah memvalidasinya saat pendaftaran). */}
            {b.key === "studentProofUrl" && /^https?:\/\//i.test(b.value) ? (
              <a href={b.value} target="_blank" rel="noopener noreferrer" className="text-primary-container hover:underline normal-case">
                lihat berkas
              </a>
            ) : (
              <span className="text-on-background normal-case">{b.value}</span>
            )}
          </li>
        ))}
        {answers.map((a) => (
          <li key={a.label} className="text-label-caps text-on-surface-variant">
            {a.label}: <span className="text-on-background normal-case">{a.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      {error && (
        <p role="alert" className="flex items-center gap-2 bg-error-container/40 text-on-error-container text-body-md px-4 py-3 rounded-lg mb-3">
          <TriangleAlert size={16} aria-hidden /> {error}
        </p>
      )}
      <div className="hidden sm:block bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
        <table className="w-full text-body-md min-w-[480px]">
          <thead className="bg-surface-container-low text-label-caps uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="text-left px-5 py-3">Peserta</th>
              <th className="text-left px-5 py-3">Asal</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((r) => (
              <tr key={r.id} className="border-t border-outline-variant">
                <td className="px-5 py-3">
                  <p className="font-medium text-on-background">{r.userName ?? "(tanpa nama)"}</p>
                  <p className="text-label-caps text-on-surface-variant">{r.userEmail}</p>
                  {r.feeLabel && (
                    <p className="text-label-caps text-on-surface-variant">Tarif: <span className="text-on-background normal-case">{r.feeLabel}</span></p>
                  )}
                  <AnswerList r={r} />
                </td>
                <td className="px-5 py-3">
                  <p className="text-on-background">{r.branch ?? "—"}</p>
                  <p className="text-label-caps text-on-surface-variant">{r.membership}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-1 rounded">
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <CheckInButton r={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden flex flex-col gap-3">
        {registrations.map((r) => (
          <div key={r.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-2">
            <div>
              <p className="font-medium text-on-background">{r.userName ?? "(tanpa nama)"}</p>
              <p className="text-label-caps text-on-surface-variant">{r.userEmail}</p>
              <p className="text-label-caps text-on-surface-variant">
                {r.branch ?? "—"} &middot; {r.membership}
              </p>
              {r.feeLabel && (
                <p className="text-label-caps text-on-surface-variant">Tarif: <span className="text-on-background normal-case">{r.feeLabel}</span></p>
              )}
              <AnswerList r={r} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-1 rounded">
                {STATUS_LABEL[r.status]}
              </span>
              <CheckInButton r={r} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
