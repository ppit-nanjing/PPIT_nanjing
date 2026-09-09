"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { checkInRegistration } from "@/app/actions/admin-events";
import { ProofView } from "@/components/console/proof-view";
import {
  CHECK_IN_BLOCK_LABEL,
  CHECK_IN_BLOCK_MESSAGE,
  CHECK_IN_CLOSED_MESSAGE,
  type CheckInBlock,
} from "@/lib/event-checkin";
import { CollapsibleRecordList, type BadgeTone } from "@/components/console/collapsible-record-list";

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
  // Kapan & oleh siapa peserta ini di-check-in (event_registrations.checked_in_by).
  // null kalau belum hadir atau data lama sebelum kolomnya ada.
  checkedInAt?: string | null;
  checkedInByName?: string | null;
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

const STATUS_TONE: Record<Registration["status"], BadgeTone> = {
  pending: "neutral",
  confirmed: "info",
  attended: "success",
  cancelled: "danger",
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
              : res.reason === "closed"
                ? CHECK_IN_CLOSED_MESSAGE.ended
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

  const answersOf = (r: Registration) =>
    questions.map((q) => ({ label: q.label, value: r.answers?.[q.id] ?? "" })).filter((a) => a.value);

  const biodataOf = (r: Registration) =>
    r.biodata
      ? Object.entries(BIODATA_LABEL)
          .map(([key, label]) => ({ label, key, value: r.biodata?.[key] ?? "" }))
          .filter((b) => b.value)
      : [];

  return (
    <CollapsibleRecordList
      records={registrations}
      countLabel={(n) => `${n} pendaftar`}
      emptyText="Belum ada yang mendaftar."
      banner={
        error ? (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-error-container/40 px-4 py-3 text-body-md text-on-error-container">
            <TriangleAlert size={16} aria-hidden /> {error}
          </p>
        ) : null
      }
      renderSummary={(r) => ({
        title: r.userName ?? "(tanpa nama)",
        subtitle: [r.branch, r.membership].filter(Boolean).join(" · "),
        badge: { text: STATUS_LABEL[r.status], tone: STATUS_TONE[r.status] },
      })}
      renderDetail={(r) => {
        const rows = [...biodataOf(r), ...answersOf(r).map((a) => ({ ...a, key: `q:${a.label}` }))];
        return (
          <>
            <div className="flex flex-col gap-0.5 text-label-caps text-on-surface-variant">
              {r.userEmail && (
                <span className="break-all normal-case">{r.userEmail}</span>
              )}
              <span>
                Asal:{" "}
                <span className="text-on-background normal-case">
                  {[r.branch, r.membership].filter(Boolean).join(" · ") || "—"}
                </span>
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
              {r.status === "attended" && r.checkedInAt && (
                <span>
                  Check-in:{" "}
                  <span className="text-on-background normal-case">
                    {new Date(r.checkedInAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    {r.checkedInByName && ` · oleh ${r.checkedInByName}`}
                  </span>
                </span>
              )}
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
          </>
        );
      }}
    />
  );
}
