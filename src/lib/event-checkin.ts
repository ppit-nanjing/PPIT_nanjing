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
