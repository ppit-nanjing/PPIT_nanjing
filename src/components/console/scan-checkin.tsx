"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, UserRound, ScanLine, BadgeCheck } from "lucide-react";
import { checkInByToken, checkInCommitteeByToken } from "@/app/actions/admin-events";

type Status = "pending" | "done" | "invalid";

const BLOCK_MESSAGE: Record<string, string> = {
  cancelled: "Pendaftaran ini dibatalkan.",
  unpaid: "Pembayaran belum terverifikasi — verifikasi dulu di halaman acara.",
  closed: "Acara sudah berakhir — pintu check-in ditutup otomatis.",
};

// Swatch visual untuk nama warna kelompok WIF 2026 (teks bebas dari panitia,
// bukan token desain) - supaya panitia lihat kotak warnanya, bukan cuma baca
// namanya.
const KELOMPOK_SWATCH: Record<string, string> = {
  merah: "#dc2626",
  hitam: "#1f2937",
  "biru langit (muda)": "#7dd3fc",
  "dark green": "#166534",
  pink: "#f472b6",
  "royal blue": "#2563eb",
  orange: "#f97316",
  kuning: "#facc15",
  putih: "#f8fafc",
  ungu: "#9333ea",
  "coklat kopi": "#6f4e37",
  "abu-abu": "#9ca3af",
  "dark red": "#7f1d1d",
  "ijo muda": "#86efac",
  "kuning muda": "#fef08a",
};

export function ScanCheckIn({
  token,
  eventId,
  kind,
  name,
  email,
  label,
  scanPath,
  practice = false,
  kelompok = null,
}: {
  token: string;
  eventId: string;
  kind: "participant" | "committee";
  name: string | null;
  email: string | null;
  label: string | null;
  // Rute halaman scanner ini, untuk tombol "Scan Berikutnya".
  scanPath: string;
  // "Mode Latihan" - jalankan validasi asli tapi jangan tulis ke database.
  practice?: boolean;
  // Kelompok/warna WIF 2026 (lihat src/lib/wif-2026-kelompok.ts) - null kalau
  // acara lain atau nama tidak cocok di daftar.
  kelompok?: { kelompok: number; warna: string } | null;
}) {
  const [status, setStatus] = useState<Status>("pending");
  const [already, setAlready] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const action =
      kind === "committee" ? checkInCommitteeByToken(token, eventId, practice) : checkInByToken(token, eventId, practice);
    action
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setBlockReason("reason" in res ? (res.reason as string) : null);
          setStatus("invalid");
        } else {
          setAlready(res.already);
          setStatus("done");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token, eventId, kind, practice]);

  if (status === "invalid") {
    return (
      <div className="mb-8 rounded-xl border border-red-300 bg-surface-container-lowest p-6 flex flex-col items-center text-center">
        <XCircle className="text-red-500 mb-3" size={40} />
        <p className="text-body-lg text-on-background font-semibold">
          {blockReason && BLOCK_MESSAGE[blockReason] ? "Tidak bisa check-in" : "Token tidak valid"}
        </p>
        {blockReason && BLOCK_MESSAGE[blockReason] && (
          <p className="mt-1 text-body-md text-on-surface-variant">{BLOCK_MESSAGE[blockReason]}</p>
        )}
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div
        className={`mb-8 flex flex-col items-center justify-center border rounded-xl p-10 text-center ${
          practice ? "bg-amber-50 border-amber-300" : "bg-surface-container-lowest border-outline-variant"
        }`}
      >
        <ScanLine className={`mb-3 animate-pulse ${practice ? "text-amber-500" : "text-outline-variant"}`} size={40} />
        <p className="text-body-md text-on-surface-variant">
          {practice ? "Memeriksa QR (mode latihan)…" : "Memproses check-in…"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`mb-8 rounded-xl border p-6 flex flex-col items-center text-center ${
        practice ? "bg-amber-50 border-amber-300" : "border-outline-variant bg-surface-container-lowest"
      }`}
    >
      {kind === "committee" ? (
        <BadgeCheck className={`mb-3 ${practice ? "text-amber-600" : "text-primary-container"}`} size={40} />
      ) : (
        <CheckCircle2 className={`mb-3 ${practice ? "text-amber-600" : "text-primary-container"}`} size={40} />
      )}
      <p className="text-body-lg text-on-background font-semibold mb-1">
        {kind === "committee" ? "Kepanitiaan" : ""}{" "}
        {practice
          ? already
            ? "QR valid (sudah check-in sungguhan sebelumnya)"
            : "QR valid — mode latihan, TIDAK dicatat"
          : already
            ? "sudah check-in sebelumnya"
            : "check-in berhasil"}
      </p>
      {label && <p className="text-label-caps uppercase tracking-wide text-primary-container">{label}</p>}
      <div className="flex items-center gap-2 text-on-surface-variant mt-2">
        <UserRound size={16} />
        <span className="text-body-md">{name ?? "(tanpa nama)"}</span>
      </div>
      {email && <p className="text-label-caps text-on-surface-variant">{email}</p>}
      {kelompok && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-background px-4 py-2">
          <span
            className="inline-block w-5 h-5 rounded-full border border-outline-variant shrink-0"
            style={{ backgroundColor: KELOMPOK_SWATCH[kelompok.warna.toLowerCase()] ?? "#cbd5e1" }}
            aria-hidden="true"
          />
          <span className="text-body-md font-semibold text-on-background">
            Kelompok {kelompok.kelompok} · {kelompok.warna}
          </span>
        </div>
      )}
      <a
        href={scanPath}
        className="mt-5 inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
      >
        <ScanLine size={16} /> Scan Berikutnya
      </a>
    </div>
  );
}
