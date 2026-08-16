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
// Channel is always "in_app": there is no email/push sending provider wired up
// (see docs/Progress & Handoff.md). The notification_channel enum keeps the
// other two values for when one exists, but nothing renders them yet.

export type NotificationTemplateKey =
  | "event_checkin"
  | "borrow_approved"
  | "borrow_rejected"
  | "contribution_approved"
  | "contribution_rejected"
  | "procurement_approved"
  | "procurement_rejected";

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
