"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, TriangleAlert, Search, Ban, Undo2 } from "lucide-react";
import { checkInRegistration, setRegistrationCancelled } from "@/app/actions/admin-events";
import { ConfirmButton } from "@/components/console/confirm-button";
import { toast } from "sonner";
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
  // WeChat ID — bagian dari versi RINGKAS (Humas menghubungi peserta). Diambil
  // dari biodataJson di server; null kalau acara tanpa biodata.
  wechatId?: string | null;
  // Biodata lengkap yang di-snapshot saat mendaftar (acara requiresBiodata).
  // Hanya dikirim ke versi LENGKAP (BPH Kabinet + Divisi Teknologi).
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
  detail = false,
}: {
  eventId: string;
  registrations: Registration[];
  questions?: QuestionRef[];
  // true = BPH Kabinet + Divisi Teknologi → biodata lengkap, email, jawaban,
  // asal, tanggal. false (default) = panitia lain → nama + WeChat + tarif +
  // status keanggotaan + check-in saja.
  detail?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Registration["status"]>("all");
  const [checkinFilter, setCheckinFilter] = useState<"all" | "in" | "out">("all");
  const [feeFilter, setFeeFilter] = useState("all");

  const feeLabels = useMemo(
    () => [...new Set(registrations.map((r) => r.feeLabel).filter((f): f is string => Boolean(f)))].sort(),
    [registrations],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (checkinFilter === "in" && r.status !== "attended") return false;
      if (checkinFilter === "out" && r.status === "attended") return false;
      if (feeFilter !== "all" && r.feeLabel !== feeFilter) return false;
      if (q) {
        const hay = [r.userName, r.wechatId, r.feeLabel, detail ? r.userEmail : null]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [registrations, query, statusFilter, checkinFilter, feeFilter, detail]);
  const isFiltered = query.trim() !== "" || statusFilter !== "all" || checkinFilter !== "all" || feeFilter !== "all";

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

  // Batalkan / pulihkan pendaftaran — hanya dirender kalau `detail` (BPH Kabinet
  // + Divisi Teknologi). Server action mengecek lagi (isFullAdmin).
  async function toggleCancelled(registrationId: string, cancelled: boolean) {
    const res = await setRegistrationCancelled(registrationId, eventId, cancelled);
    if (!res.ok) {
      toast.error(
        res.reason === "forbidden"
          ? "Hanya BPH Kabinet & Divisi Teknologi yang bisa membatalkan pendaftaran."
          : "Pendaftaran tidak ditemukan. Muat ulang halaman.",
      );
      return;
    }
    toast.success(cancelled ? "Pendaftaran dibatalkan." : "Pendaftaran dipulihkan.");
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

  const selectCls =
    "bg-soft-gray rounded-md p-2 text-body-sm pp-select focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={detail ? "Cari nama / WeChat / email" : "Cari nama / WeChat"}
            aria-label="Cari pendaftar"
            className="w-full bg-soft-gray rounded-md py-2 pl-8 pr-2 text-body-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          />
        </label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label="Filter status" className={selectCls}>
          <option value="all">Semua status</option>
          <option value="pending">Menunggu</option>
          <option value="confirmed">Terkonfirmasi</option>
          <option value="attended">Hadir</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
        <select value={checkinFilter} onChange={(e) => setCheckinFilter(e.target.value as typeof checkinFilter)} aria-label="Filter check-in" className={selectCls}>
          <option value="all">Hadir & belum</option>
          <option value="in">Sudah check-in</option>
          <option value="out">Belum check-in</option>
        </select>
        {feeLabels.length > 0 && (
          <select value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)} aria-label="Filter kategori tarif" className={selectCls}>
            <option value="all">Semua kategori</option>
            {feeLabels.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        )}
      </div>

      <CollapsibleRecordList
        records={filtered}
        countLabel={(n) => (isFiltered ? `${n} dari ${registrations.length} pendaftar` : `${n} pendaftar`)}
        emptyText={isFiltered ? "Tidak ada pendaftar yang cocok dengan filter." : "Belum ada yang mendaftar."}
        banner={
          error ? (
            <p role="alert" className="flex items-center gap-2 rounded-lg bg-error-container/40 px-4 py-3 text-body-md text-on-error-container">
              <TriangleAlert size={16} aria-hidden /> {error}
            </p>
          ) : null
        }
        renderSummary={(r) => ({
          title: r.userName ?? "(tanpa nama)",
          subtitle: [detail ? r.branch : null, r.membership].filter(Boolean).join(" · "),
          badge: { text: STATUS_LABEL[r.status], tone: STATUS_TONE[r.status] },
        })}
        renderDetail={(r) => {
          // Biodata + jawaban kustom = versi LENGKAP saja.
          const rows = detail
            ? [...biodataOf(r), ...answersOf(r).map((a) => ({ ...a, key: `q:${a.label}` }))]
            : [];
          return (
            <>
              <div className="flex flex-col gap-0.5 text-label-caps text-on-surface-variant">
                {detail && r.userEmail && (
                  <span className="break-all normal-case">{r.userEmail}</span>
                )}
                {!detail && r.wechatId && (
                  <span>
                    WeChat ID: <span className="text-on-background normal-case">{r.wechatId}</span>
                  </span>
                )}
                <span>
                  {detail ? "Asal: " : "Status: "}
                  <span className="text-on-background normal-case">
                    {[detail ? r.branch : null, r.membership].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                {r.feeLabel && (
                  <span>
                    Tarif: <span className="text-on-background normal-case">{r.feeLabel}</span>
                  </span>
                )}
                {detail && (
                  <span>
                    Daftar:{" "}
                    <span className="text-on-background normal-case">
                      {new Date(r.registeredAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    </span>
                  </span>
                )}
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <CheckInButton r={r} />
                {detail && r.status !== "cancelled" && (
                  <ConfirmButton
                    onConfirm={() => toggleCancelled(r.id, true)}
                    message={`Batalkan pendaftaran ${r.userName ?? "peserta ini"}? Status jadi "Dibatalkan", slot kuotanya kembali, dan QR check-in-nya berhenti berlaku. Bisa dipulihkan lagi.`}
                    title="Batalkan pendaftaran"
                    confirmLabel="Ya, batalkan"
                    successMessage=""
                    className="inline-flex items-center gap-1 text-label-caps text-error hover:opacity-70"
                  >
                    <Ban size={13} aria-hidden /> Batalkan pendaftaran
                  </ConfirmButton>
                )}
                {detail && r.status === "cancelled" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => toggleCancelled(r.id, false))}
                    className="inline-flex items-center gap-1 text-label-caps text-primary-container hover:text-primary disabled:opacity-50"
                  >
                    <Undo2 size={13} aria-hidden /> Pulihkan pendaftaran
                  </button>
                )}
              </div>
            </>
          );
        }}
      />
    </div>
  );
}
