// Aturan siapa yang boleh di-check-in ke sebuah acara — dipakai bersama oleh
// tombol check-in manual (checkInRegistration), scan QR (checkInByToken), dan
// halaman konsol yang menampilkan/menonaktifkan tombolnya.
//
// Pendaftaran yang dibatalkan jelas tidak bisa hadir. Untuk acara berbayar,
// pembayaran WAJIB terverifikasi dulu — ini menutup celah tombol manual yang
// tadinya bisa menandai "hadir" tanpa peduli status bayar, padahal jalur QR
// sudah rapat (QR baru terbit saat bendahara memverifikasi, lihat
// updatePaymentStatus).

export type CheckInBlock = "cancelled" | "unpaid";

export function checkInBlockReason(
  reg: { status: string; paymentStatus: string },
  eventIsPaid: boolean,
): CheckInBlock | null {
  if (reg.status === "cancelled") return "cancelled";
  if (eventIsPaid && reg.paymentStatus !== "verified") return "unpaid";
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
// completed/cancelled, atau lewat dari (endAt ?? startAt) + jeda. Jeda memberi
// ruang scan telat di pintu keluar & peserta yang baru datang; untuk acara
// tanpa endAt, startAt + jeda dianggap akhir acara. Berlaku untuk semua orang
// termasuk BPH — koreksi kehadiran pasca-acara lewat "Jumlah Hadir (Final)" di
// laporan, bukan lewat scan.
export const CHECKIN_GRACE_HOURS = 12;

export type CheckInClosed = "ended" | "cancelled";

type EventTiming = { status: string; startAt: Date | string | null; endAt: Date | string | null };

export function checkInClosedReason(ev: EventTiming, now: Date = new Date()): CheckInClosed | null {
  if (ev.status === "cancelled") return "cancelled";
  if (ev.status === "completed") return "ended";
  const end = ev.endAt ?? ev.startAt;
  if (!end) return null; // jadwal belum pasti — jangan tutup
  const closesAt = new Date(end);
  closesAt.setHours(closesAt.getHours() + CHECKIN_GRACE_HOURS);
  return now > closesAt ? "ended" : null;
}

export const CHECK_IN_CLOSED_MESSAGE: Record<CheckInClosed, string> = {
  ended:
    "Acara sudah berakhir — pintu check-in ditutup otomatis. Untuk mengoreksi jumlah hadir, pakai “Jumlah Hadir (Final)” di laporan pasca-acara.",
  cancelled: "Acara dibatalkan — check-in tidak tersedia.",
};
