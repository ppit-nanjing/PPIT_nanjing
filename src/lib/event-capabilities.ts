// Client-safe half of the per-event access model - the capability list, the
// three tiers (dasar / BPH panitia / grant per divisi), and the pure checks.
// Zero imports of @/auth or @/db so a "use client" console component can import
// it to gate UI (same split reason as admin-scope-constants.ts).
//
// Model (disepakati dengan user, revisi 2026-09-09):
//   1. BPH Kabinet + Divisi Teknologi Kabinet  -> adminScope "full", tembus semua.
//   2. Pengurus Kabinet                        -> modul divisi kabinetnya (sistem lama).
//   3. BPH Panitia (jabatan pelaksana inti)    -> SEMUA fitur acaranya. Otomatis
//      dari `role` (BPH_PANITIA_ROLES) - tidak dicentang manual.
//   4. Panitia                                 -> fitur DASAR + kapabilitas yang
//      dicentang untuk DIVISI-nya (eventDivisions.grantedCapabilities).
//
// Penegakan di server: src/lib/event-access.ts.

export type EventCapability =
  // --- E: editorial ---
  | "event.editInfo" // judul, tanggal, lokasi, kapasitas, kategori, tema
  | "event.editContent" // deskripsi, agenda, poster, info setelah daftar
  | "event.registrationForm" // pertanyaan tambahan form pendaftaran
  | "event.feeTiers" // kategori tarif / HTM
  | "event.registrationToggle" // buka & tutup pendaftaran
  | "event.publish" // publikasikan / jadwalkan / tarik ke draf
  | "event.postEventReport" // laporan pasca-acara (jumlah hadir, recap)
  // --- P: peserta ---
  | "event.viewRegistrants" // lihat daftar pendaftar
  | "event.exportRegistrants" // ekspor daftar pendaftar
  | "event.scanAttendance" // check-in / scan kehadiran
  | "event.manageVolunteers" // approve/reject pendaftar volunteer
  // --- K: kepanitiaan ---
  | "event.manageCommittee" // susunan panitia, struktur divisi, keluarkan panitia, atur grant divisi
  | "event.issueCertificates" // terbitkan sertifikat panitia & peserta
  | "event.editCredits" // isi kredit / arsip kepanitiaan (LPJ) — tampilan, tidak memberi akses
  | "event.viewAuditLog" // baca riwayat audit acara (BPH Panitia + BPH Kabinet)
  // --- U + X: keuangan & lintas-modul (grant per divisi) ---
  | "event.manageFinance" // verifikasi bayar, refund, tandai gratis, rekap & ekspor keuangan
  | "event.manageGallery" // album & foto galeri acara
  | "event.borrowAssets" // pinjam aset dari Inventaris untuk acara
  | "event.postArticle" // post artikel/berita acara
  // --- A: hanya BPH Kabinet ("full") ---
  | "event.delete" // hapus acara
  | "event.takeOver"; // ambil alih acara yang panitianya vakum

// Cermin event_committee_role di schema.ts. "pendataan" ditambahkan bersama
// fitur ini; nilainya kini label jabatan saja (scan = fitur DASAR, bukan peran
// khusus). Nilai lama humas/acara/logistik/dokumentasi = nama posisi/divisi
// untuk tampilan + sertifikat, TIDAK memberi akses sendiri (akses dari
// grant divisinya).
export type EventCommitteeRole =
  | "ketua"
  | "wakil"
  | "sekretaris"
  | "bendahara"
  | "supervisor"
  | "humas"
  | "acara"
  | "logistik"
  | "dokumentasi"
  | "pendataan"
  | "anggota";

// TINGKAT 3 — BPH Panitia. Jabatan pelaksana inti yang otomatis pegang SEMUA
// fitur acaranya (kecuali event.delete / event.takeOver — itu BPH Kabinet).
export const BPH_PANITIA_ROLES: EventCommitteeRole[] = [
  "ketua",
  "wakil",
  "sekretaris",
  "supervisor",
];

export function isBphPanitiaRole(role: EventCommitteeRole | null | undefined): boolean {
  return role != null && BPH_PANITIA_ROLES.includes(role);
}

// TINGKAT 4 — fitur DASAR. Setiap panitia (punya baris event_committee untuk
// acara ini) otomatis dapat ini, apa pun divisinya.
export const BASIC_CAPABILITIES: EventCapability[] = [
  "event.editContent",
  "event.registrationForm",
  "event.registrationToggle",
  "event.postEventReport",
  "event.viewRegistrants",
];

// Kapabilitas yang BPH Panitia bisa CENTANG untuk sebuah divisi acara
// (eventDivisions.grantedCapabilities menyimpan subset kunci-kunci ini).
// Semua anggota divisi itu lalu ikut mendapatkannya.
export const GRANTABLE_CAPABILITIES: { key: EventCapability; label: string; hint: string }[] = [
  { key: "event.scanAttendance", label: "Pendataan / scan", hint: "Buka scanner & catat kehadiran di stand" },
  { key: "event.issueCertificates", label: "Sertifikat", hint: "Terbitkan sertifikat panitia & peserta" },
  { key: "event.manageGallery", label: "Galeri foto", hint: "Album & foto dokumentasi acara" },
  { key: "event.borrowAssets", label: "Pinjam aset", hint: "Ajukan peminjaman aset Inventaris untuk acara" },
  { key: "event.postArticle", label: "Post artikel", hint: "Tulis berita/artikel acara" },
  { key: "event.manageFinance", label: "Keuangan", hint: "Verifikasi bukti bayar, refund, tandai gratis, rekap" },
];

const GRANTABLE_KEYS = new Set<EventCapability>(GRANTABLE_CAPABILITIES.map((g) => g.key));

// Hanya BPH Kabinet ("full"). Bukan dasar, bukan grantable, bahkan BPH Panitia
// tidak dapat.
export const FULL_ADMIN_ONLY_CAPABILITIES: EventCapability[] = ["event.delete", "event.takeOver"];

// Kapabilitas yang TETAP boleh walau acara sudah terkunci (>2 minggu setelah
// selesai): baca daftar pendaftar + audit log, DAN mengisi kredit kepanitiaan
// (LPJ sering baru berbulan setelah acara). Semua kapabilitas TULIS lainnya
// ditolak untuk panitia begitu kunci aktif; hanya BPH Kabinet ("full") tetap
// bisa mengubah apa pun.
export const LOCK_EXEMPT_CAPABILITIES: EventCapability[] = [
  "event.viewRegistrants",
  "event.viewAuditLog",
  "event.editCredits",
];

// Spesifikasi §9: setelah acara selesai, panitia boleh mengubah data selama 2
// minggu, lalu terkunci otomatis — perubahan hanya lewat BPH Kabinet.
export const COMMITTEE_LOCK_GRACE_DAYS = 14;

type EventTiming = { status: string; startAt: Date | string | null; endAt: Date | string | null };

/** Kapan kunci panitia aktif untuk acara ini (atau null bila belum relevan). */
export function committeeLockAt(ev: EventTiming): Date | null {
  const end = ev.endAt ?? ev.startAt;
  if (!end) return ev.status === "cancelled" ? new Date(0) : null;
  const lock = new Date(end);
  lock.setDate(lock.getDate() + COMMITTEE_LOCK_GRACE_DAYS);
  return lock;
}

/** Apakah acara ini sudah melewati masa 2 minggu pasca-selesai? */
export function isCommitteeLocked(ev: EventTiming, now: Date = new Date()): boolean {
  const end = ev.endAt ?? ev.startAt;
  const ended =
    ev.status === "completed" ||
    ev.status === "cancelled" ||
    (end != null && new Date(end) < now);
  if (!ended) return false;
  const lock = committeeLockAt(ev);
  return lock != null && now > lock;
}

// Kapabilitas yang TIDAK diberikan lewat jembatan transisi scope modul "events"
// (event-access.ts moduleBridge). Jembatan itu hanya untuk MEMPERTAHANKAN apa
// yang sudah bisa dilakukan pemegang modul "events" sebelum fitur ini —
// keuangan (dulu scope "organization"), galeri & post artikel (dulu scope
// "content"), pinjam aset (dulu scope "inventory") BUKAN termasuk, jadi
// jembatan tidak boleh membukanya diam-diam. BPH Panitia & divisi ber-grant
// tetap dapat lewat jalur peran.
export const BRIDGE_EXCLUDED_CAPABILITIES: EventCapability[] = [
  ...FULL_ADMIN_ONLY_CAPABILITIES,
  "event.manageFinance",
  "event.manageGallery",
  "event.borrowAssets",
  "event.postArticle",
];

/**
 * Pemeriksaan murni tingkat 3 + 4: apa peran ini + grant divisinya cukup untuk
 * `capability`? TIDAK memperhitungkan BPH Kabinet / jembatan modul — itu di
 * event-access.ts (server).
 *
 * @param role  event_committee.role, atau null kalau bukan panitia acara ini
 * @param divisionGrants  eventDivisions.grantedCapabilities milik divisi orang
 *   ini (array kosong / null kalau divisinya tanpa centang atau tanpa divisi)
 */
export function hasEventCapability(
  role: EventCommitteeRole | null | undefined,
  capability: EventCapability,
  divisionGrants?: readonly string[] | null,
): boolean {
  if (!role) return false; // bukan panitia acara ini
  if (isBphPanitiaRole(role)) {
    // BPH Panitia: semua kecuali yang khusus BPH Kabinet.
    return !FULL_ADMIN_ONLY_CAPABILITIES.includes(capability);
  }
  if (BASIC_CAPABILITIES.includes(capability)) return true;
  if (GRANTABLE_KEYS.has(capability)) {
    return (divisionGrants ?? []).includes(capability);
  }
  return false;
}

// Label Indonesia untuk tiap peran - dipakai di UI penugasan panitia, tiket,
// dan judul sertifikat.
export const EVENT_COMMITTEE_ROLE_LABEL: Record<EventCommitteeRole, string> = {
  ketua: "Ketua Pelaksana",
  wakil: "Wakil Ketua Pelaksana",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  supervisor: "Supervisory Committee",
  humas: "Humas",
  acara: "Divisi Acara",
  logistik: "Logistik",
  dokumentasi: "Dokumentasi",
  pendataan: "Petugas Pendataan",
  anggota: "Anggota",
};
