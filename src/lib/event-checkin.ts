// Aturan siapa yang boleh di-check-in ke sebuah acara — dipakai bersama oleh
// tombol check-in manual (checkInRegistration), scan QR (checkInByToken), dan
// halaman konsol yang menampilkan/menonaktifkan tombolnya.
//
// Pendaftaran yang dibatalkan jelas tidak bisa hadir. Untuk acara berbayar,
// pembayaran WAJIB terverifikasi dulu — ini menutup celah tombol manual yang
// tadinya bisa menandai "hadir" tanpa peduli status bayar, padahal jalur QR
// sudah rapat (QR baru terbit saat bendahara memverifikasi, lihat
// updatePaymentStatus).
//
// "not_required" BUKAN "belum lunas": itu status untuk pendaftaran yang memang
// tidak perlu bayar — acara gratis, ATAU kategori tarif ¥0 (mis. early bird
// gratis WIF). Nominal efektif ¥0 → registerForEvent men-set langsung
// `not_required` + menerbitkan QR (tanpa gerbang bendahara), jadi di sini pun
// harus dianggap beres. Hanya "unpaid" / "submitted" / "rejected" yang blokir.

export type CheckInBlock = "cancelled" | "unpaid";

const PAYMENT_OK_TO_CHECK_IN = ["verified", "not_required"];

export function checkInBlockReason(
  reg: { status: string; paymentStatus: string },
  eventIsPaid: boolean,
): CheckInBlock | null {
  if (reg.status === "cancelled") return "cancelled";
  if (eventIsPaid && !PAYMENT_OK_TO_CHECK_IN.includes(reg.paymentStatus)) return "unpaid";
  return null;
}

export const CHECK_IN_BLOCK_LABEL: Record<CheckInBlock, string> = {
  cancelled: "Dibatalkan",
  unpaid: "Belum lunas",
};

export const CHECK_IN_BLOCK_MESSAGE: Record<CheckInBlock, string> = {
  cancelled: "Pendaftaran ini dibatalkan — tidak bisa check-in.",
  unpaid: "Pembayaran belum terverifikasi. Verifikasi dulu di panel Verifikasi Pembayaran, baru peserta bisa check-in.",
};

// Pintu check-in menutup otomatis begitu acara berakhir (Spesifikasi §11 —
// "akses scan berhenti saat acara selesai"). "Berakhir" = status
// completed/cancelled, atau lewat dari waktu tutup. Petugas/panitia acara
// tunduk pada ini — koreksi kehadiran pasca-acara lewat "Jumlah Hadir (Final)".
// BPH Kabinet / Divisi Teknologi (isFullAdmin) DIKECUALIKAN oleh pemanggil,
// sama seperti kunci 2-minggu di event-access.ts.
//
// Waktu tutup: kalau endAt diisi → endAt + jeda pendek (scan telat di pintu
// keluar). Kalau hanya startAt → durasinya tak diketahui, jadi baru menutup
// 24 jam setelah mulai supaya acara sehari penuh tetap bisa di-scan.
export const CHECKIN_GRACE_HOURS = 12;
const CHECKIN_NO_ENDAT_WINDOW_HOURS = 24;

export type CheckInClosed = "ended" | "cancelled";

type EventTiming = { status: string; startAt: Date | string | null; endAt: Date | string | null };

export function checkInClosedReason(ev: EventTiming, now: Date = new Date()): CheckInClosed | null {
  if (ev.status === "cancelled") return "cancelled";
  if (ev.status === "completed") return "ended";
  const end = ev.endAt ?? ev.startAt;
  if (!end) return null; // jadwal belum pasti — jangan tutup
  const closesAt = new Date(end);
  closesAt.setHours(
    closesAt.getHours() + (ev.endAt ? CHECKIN_GRACE_HOURS : CHECKIN_NO_ENDAT_WINDOW_HOURS),
  );
  return now > closesAt ? "ended" : null;
}

export const CHECK_IN_CLOSED_MESSAGE: Record<CheckInClosed, string> = {
  ended:
    "Acara sudah berakhir — pintu check-in ditutup otomatis. Untuk mengoreksi jumlah hadir, pakai “Jumlah Hadir (Final)” di laporan pasca-acara.",
  cancelled: "Acara dibatalkan — check-in tidak tersedia.",
};
