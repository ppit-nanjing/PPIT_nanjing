// Registry of the notifications this app actually sends today - nothing
// aspirational. Each key here corresponds to a real createTemplatedNotification()
// call site; the admin editor at /console/notifications lists exactly these and
// nothing else, so an admin can never write a template that never fires.
//
// The defaults below are verbatim copies of the wording that used to be
// hardcoded at each call site, so an untouched install sends byte-identical
// messages to what it sent before templates existed. A DB row in
// notification_templates overrides the default; deleting that row restores it.
//
// Most of these are in-app only. The two membership decision templates are also
// sent as email via Resend (src/lib/email.ts) using the same subject/body, so
// editing the wording here changes both the notification and the email.

export type NotificationTemplateKey =
  | "event_checkin"
  | "event_registration"
  | "borrow_approved"
  | "borrow_handed_over"
  | "borrow_return_requested_confirmed"
  | "borrow_rejected"
  | "contribution_approved"
  | "contribution_rejected"
  | "procurement_approved"
  | "procurement_rejected"
  | "job_application"
  | "membership_accepted"
  | "membership_rejected";

export type NotificationTemplateDef = {
  key: NotificationTemplateKey;
  /** Group heading in the admin editor. */
  group: string;
  label: string;
  /** When this notification fires, in plain Indonesian for the admin. */
  trigger: string;
  /** Placeholder names usable as {{name}} in subject/body. */
  variables: string[];
  defaultSubject: string;
  defaultBody: string;
};

export const NOTIFICATION_TEMPLATES: NotificationTemplateDef[] = [
  {
    key: "event_checkin",
    group: "Kegiatan",
    label: "Kehadiran terkonfirmasi",
    trigger: "Dikirim saat admin men-scan QR tiket peserta atau mencatat kehadiran manual.",
    variables: ["eventTitle"],
    defaultSubject: "Kehadiran terkonfirmasi",
    defaultBody: 'Kehadiran kamu di "{{eventTitle}}" telah dicatat. Terima kasih sudah hadir!',
  },
  {
    key: "event_registration",
    group: "Kegiatan",
    label: "Pendaftaran kegiatan",
    trigger: "Dikirim saat anggota mendaftar ke sebuah kegiatan.",
    variables: ["eventTitle"],
    defaultSubject: "Pendaftaran kegiatan berhasil",
    defaultBody: 'Kamu berhasil mendaftar ke kegiatan "{{eventTitle}}". Tiket masuk bisa dilihat di halaman kegiatan.',
  },
  {
    key: "borrow_approved",
    group: "Peminjaman",
    label: "Peminjaman disetujui",
    trigger: "Dikirim saat admin menyetujui permintaan peminjaman barang.",
    variables: [],
    defaultSubject: "Permintaan peminjaman disetujui",
    defaultBody:
      "Permintaan peminjaman barang kamu telah disetujui oleh admin. Cek detail di riwayat pengajuan.",
  },
  {
    key: "borrow_handed_over",
    group: "Peminjaman",
    label: "Barang diserahkan ke peminjam",
    trigger: 'Dikirim saat admin menandai barang sebagai "Dipinjam" (diserahkan) di antrean console.',
    variables: ["itemName", "returnDate"],
    defaultSubject: "Barang pinjaman sudah kamu terima",
    defaultBody:
      'Barang "{{itemName}}" telah diserahkan kepadamu dan statusnya kini Dipinjam. Jadwal pengembalian: {{returnDate}}. Ajukan pengembalian dari halaman Profilmu setelah barang dikembalikan ke Divisi Logistik.',
  },
  {
    key: "borrow_return_requested_confirmed",
    group: "Peminjaman",
    label: "Pengembalian dikonfirmasi",
    trigger: "Dikirim saat admin mengonfirmasi barang pinjaman telah dikembalikan.",
    variables: ["itemName"],
    defaultSubject: "Pengembalian barang dikonfirmasi",
    defaultBody:
      'Pengembalian "{{itemName}}" telah dikonfirmasi oleh admin. Terima kasih sudah menjaga barang organisasi!',
  },
  {
    key: "borrow_rejected",
    group: "Peminjaman",
    label: "Peminjaman ditolak",
    trigger: "Dikirim saat admin menolak permintaan peminjaman barang.",
    variables: [],
    defaultSubject: "Permintaan peminjaman ditolak",
    defaultBody:
      "Maaf, permintaan peminjaman barang kamu ditolak. Cek detail di riwayat pengajuan.",
  },
  {
    key: "contribution_approved",
    group: "Sumbangan Barang",
    label: "Sumbangan disetujui",
    trigger: "Dikirim saat admin menerima barang sumbangan/pinjaman dari anggota.",
    variables: ["itemName"],
    defaultSubject: "Sumbangan disetujui",
    defaultBody: 'Sumbangan "{{itemName}}" telah masuk ke inventaris PPIT. Terima kasih!',
  },
  {
    key: "contribution_rejected",
    group: "Sumbangan Barang",
    label: "Sumbangan ditolak",
    trigger: "Dikirim saat admin menolak barang sumbangan dari anggota.",
    variables: ["itemName"],
    defaultSubject: "Sumbangan ditolak",
    defaultBody: 'Maaf, sumbangan "{{itemName}}" tidak dapat kami terima saat ini.',
  },
  {
    key: "procurement_approved",
    group: "Usulan Pengadaan",
    label: "Usulan pengadaan disetujui",
    trigger: "Dikirim saat admin menyetujui usulan pembelian barang baru.",
    variables: ["itemName"],
    defaultSubject: "Usulan pengadaan disetujui",
    defaultBody: 'Usulan barang "{{itemName}}" telah disetujui oleh admin.',
  },
  {
    key: "procurement_rejected",
    group: "Usulan Pengadaan",
    label: "Usulan pengadaan ditolak",
    trigger: "Dikirim saat admin menolak usulan pembelian barang baru.",
    variables: ["itemName"],
    defaultSubject: "Usulan pengadaan ditolak",
    defaultBody: 'Usulan barang "{{itemName}}" telah ditolak oleh admin.',
  },
  {
    key: "job_application",
    group: "Karier",
    label: "Lamaran terkirim",
    trigger: "Dikirim saat anggota melamar sebuah lowongan.",
    variables: ["jobTitle"],
    defaultSubject: "Lamaran pekerjaan terkirim",
    defaultBody: 'Lamaran kamu untuk "{{jobTitle}}" telah terkirim. Tim rekrutmen akan meninjau dan menghubungi kamu bila cocok.',
  },
  {
    key: "membership_accepted",
    group: "Pendaftaran Anggota",
    label: "Pendaftar diterima",
    trigger: 'Dikirim saat admin mengubah status pendaftar menjadi "Diterima" di halaman detail pendaftaran.',
    variables: ["fullName", "batchLabel"],
    defaultSubject: "Selamat, kamu diterima sebagai pengurus PPIT Nanjing",
    defaultBody:
      "Halo {{fullName}},\n\nSelamat! Setelah melalui seleksi berkas dan wawancara, kamu dinyatakan DITERIMA sebagai pengurus PPIT Nanjing {{batchLabel}}.\n\nLangkah berikutnya akan kami sampaikan lewat email ini dan grup resmi. Mohon tunggu informasi lanjutan dari kami.\n\nTerima kasih sudah mendaftar dan sampai jumpa di kepengurusan!",
  },
  {
    key: "membership_rejected",
    group: "Pendaftaran Anggota",
    label: "Pendaftar tidak lolos",
    trigger: 'Dikirim saat admin mengubah status pendaftar menjadi "Ditolak" di halaman detail pendaftaran.',
    variables: ["fullName", "batchLabel"],
    defaultSubject: "Hasil seleksi pengurus PPIT Nanjing",
    defaultBody:
      "Halo {{fullName}},\n\nTerima kasih sudah meluangkan waktu mengikuti seleksi pengurus PPIT Nanjing {{batchLabel}}.\n\nSetelah mempertimbangkan seluruh proses seleksi, untuk kali ini kami belum bisa mengajak kamu bergabung di kepengurusan. Keputusan ini tidak mengurangi apresiasi kami atas minat dan usaha kamu.\n\nKami harap kamu tetap aktif di kegiatan PPIT Nanjing, dan semoga bisa bertemu lagi di kesempatan berikutnya.",
  },
];

export function getTemplateDef(key: string): NotificationTemplateDef | undefined {
  return NOTIFICATION_TEMPLATES.find((t) => t.key === key);
}

// Replaces {{name}} with the supplied value. An unknown or unsupplied
// placeholder collapses to an empty string rather than leaking raw "{{foo}}"
// into a member-facing message - the admin editor lists the allowed variables
// per template so a typo is visible there, not in someone's notification feed.
export function renderTemplate(text: string, variables: Record<string, string> = {}): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => variables[name] ?? "");
}
