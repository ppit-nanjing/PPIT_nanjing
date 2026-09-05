"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, TriangleAlert, ChevronRight } from "lucide-react";
import { checkInRegistration } from "@/app/actions/admin-events";
import { ProofView } from "@/components/console/proof-view";
import { CHECK_IN_BLOCK_LABEL, CHECK_IN_BLOCK_MESSAGE, type CheckInBlock } from "@/lib/event-checkin";

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
  // Alasan peserta ini belum boleh di-check-in (dihitung di server dari status
  // pendaftaran + status bayar). null = boleh.
  checkInBlocked?: CheckInBlock | null;
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

const STATUS_STYLE: Record<Registration["status"], string> = {
  pending: "bg-surface-container-low text-on-surface-variant",
  confirmed: "bg-primary-container/10 text-primary-container",
  attended: "bg-primary-container/10 text-primary-container",
  cancelled: "bg-error-container/50 text-on-error-container",
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
  const [error, setError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  // Baris dibuka satu per satu — daftar pendaftar bisa panjang, jadi defaultnya
  // semua tertutup dan admin cukup lihat nama dulu.
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOpen = registrations.length > 0 && registrations.every((r) => open.has(r.id));

  function checkIn(registrationId: string) {
    setError(null);
    setCheckingId(registrationId);
    startTransition(async () => {
      try {
        const res = await checkInRegistration(registrationId, eventId);
        if (!res.ok) {
          setError(
            res.reason === "notfound"
              ? "Pendaftaran tidak ditemukan. Muat ulang halaman."
              : CHECK_IN_BLOCK_MESSAGE[res.reason],
          );
        }
      } catch {
        setError("Check-in gagal. Muat ulang halaman lalu coba lagi.");
      } finally {
        setCheckingId(null);
      }
    });
  }

  const CheckInButton = ({ r }: { r: Registration }) => {
    if (r.status === "attended") return null;
    if (r.checkInBlocked) {
      return (
        <span
          className="inline-flex items-center gap-1 text-label-caps text-on-surface-variant"
          title={CHECK_IN_BLOCK_MESSAGE[r.checkInBlocked]}
        >
          <TriangleAlert size={13} aria-hidden /> {CHECK_IN_BLOCK_LABEL[r.checkInBlocked]}
        </span>
      );
    }
    return (
      <button
        onClick={() => checkIn(r.id)}
        disabled={isPending}
        className="inline-flex items-center gap-1 text-label-caps text-primary-container hover:text-primary disabled:opacity-50"
      >
        <CheckCircle2 size={14} /> {checkingId === r.id ? "Memproses…" : "Check-in"}
      </button>
    );
  };

  if (registrations.length === 0) {
    return <p className="text-body-md text-on-surface-variant">Belum ada yang mendaftar.</p>;
  }

  const answersOf = (r: Registration) =>
    questions.map((q) => ({ label: q.label, value: r.answers?.[q.id] ?? "" })).filter((a) => a.value);

  const biodataOf = (r: Registration) =>
    r.biodata
      ? Object.entries(BIODATA_LABEL)
          .map(([key, label]) => ({ label, key, value: r.biodata?.[key] ?? "" }))
          .filter((b) => b.value)
      : [];

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-error-container/40 px-4 py-3 text-body-md text-on-error-container">
          <TriangleAlert size={16} aria-hidden /> {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          {registrations.length} pendaftar
        </p>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(registrations.map((r) => r.id)))}
          className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors"
        >
          {allOpen ? "Tutup semua" : "Buka semua"}
        </button>
      </div>

      <ul className="flex flex-col gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
        {registrations.map((r) => {
          const isOpen = open.has(r.id);
          const rows = [...biodataOf(r), ...answersOf(r).map((a) => ({ ...a, key: `q:${a.label}` }))];
          return (
            <li key={r.id} className="border-b border-outline-variant/60 last:border-0">
              <button
                type="button"
                onClick={() => toggle(r.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-low/60 transition-colors"
              >
                <ChevronRight
                  size={16}
                  aria-hidden
                  className={`shrink-0 text-on-surface-variant transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-on-background">{r.userName ?? "(tanpa nama)"}</span>
                  {!isOpen && (
                    <span className="block truncate text-label-caps text-on-surface-variant">
                      {[r.branch, r.membership].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                <span className={`shrink-0 rounded px-2 py-1 text-label-caps uppercase tracking-wide ${STATUS_STYLE[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-2 px-4 pb-4 pl-11">
                  <div className="flex flex-col gap-0.5 text-label-caps text-on-surface-variant">
                    {r.userEmail && (
                      <span>
                        Email: <span className="text-on-background normal-case">{r.userEmail}</span>
                      </span>
                    )}
                    <span>
                      Asal: <span className="text-on-background normal-case">{[r.branch, r.membership].filter(Boolean).join(" · ") || "—"}</span>
                    </span>
                    {r.feeLabel && (
                      <span>
                        Tarif: <span className="text-on-background normal-case">{r.feeLabel}</span>
                      </span>
                    )}
                    <span>
                      Daftar:{" "}
                      <span className="text-on-background normal-case">
                        {new Date(r.registeredAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </span>
                    </span>
                    {rows.map((b) => (
                      <span
                        key={b.key}
                        className={b.key === "studentProofUrl" ? "flex flex-wrap items-center gap-1.5" : undefined}
                      >
                        {b.label}:{" "}
                        {b.key === "studentProofUrl" ? (
                          <ProofView url={b.value} label={b.label} />
                        ) : (
                          <span className="text-on-background normal-case">{b.value}</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <div>
                    <CheckInButton r={r} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
