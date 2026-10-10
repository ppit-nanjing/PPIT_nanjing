import { db } from "@/db";
import { auditLogs } from "@/db/schema";

// Jejak audit untuk modul Kegiatan (Spesifikasi §8): aksi keuangan + aksi
// penting acara dicatat siapa/apa/kapan. Dibungkus try/catch — gagalnya
// pencatatan TIDAK pernah membatalkan aksinya (pola sama dengan notifikasi).
//
// entityType selalu "event", entityId = eventId, jadi satu query per acara
// mengambil seluruh riwayatnya (lihat console/events/[id]/page.tsx).

export type EventAuditAction =
  | "payment.verified"
  | "payment.rejected"
  | "payment.unverified"
  | "payment.other"
  | "certificate.issued"
  | "certificate.link_updated"
  | "certificate.deleted"
  | "event.published"
  | "event.unpublished"
  | "event.status"
  | "event.trashed"
  | "event.restored"
  | "event.deleted"
  | "event.takeover"
  | "registration.cancelled"
  | "registration.restored"
  | "committee.assigned"
  | "committee.removed"
  | "division.grants"
  | "credit.added"
  | "credit.removed"
  | "asset.reserved"
  | "asset.released"
  | "committee_evaluation.deleted";

export async function logEventAudit(
  actorId: string | null | undefined,
  eventId: string,
  action: EventAuditAction,
  detail?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorUserId: actorId ?? null,
      entityType: "event",
      entityId: eventId,
      action,
      beforeJson: detail?.before ?? null,
      afterJson: detail?.after ?? null,
    });
  } catch (err) {
    console.error(`[audit] event ${action} failed:`, err);
  }
}

// Label Indonesia untuk tampilan riwayat.
export const EVENT_AUDIT_ACTION_LABEL: Record<EventAuditAction, string> = {
  "payment.verified": "Pembayaran diverifikasi",
  "payment.rejected": "Pembayaran ditolak",
  "payment.unverified": "Verifikasi pembayaran dibatalkan",
  "payment.other": "Status pembayaran diubah",
  "certificate.issued": "Sertifikat diterbitkan",
  "certificate.link_updated": "Tautan sertifikat diperbarui",
  "certificate.deleted": "Sertifikat dihapus",
  "event.published": "Acara dipublikasikan",
  "event.unpublished": "Acara ditarik dari publik",
  "event.status": "Status acara diubah",
  "event.trashed": "Acara dipindah ke Sampah",
  "event.restored": "Acara dipulihkan dari Sampah",
  "event.deleted": "Acara dihapus permanen",
  "event.takeover": "Acara diambil alih BPH",
  "registration.cancelled": "Pendaftaran peserta dibatalkan",
  "registration.restored": "Pendaftaran peserta dipulihkan",
  "committee.assigned": "Panitia ditugaskan",
  "committee.removed": "Panitia dikeluarkan",
  "division.grants": "Izin fitur divisi diubah",
  "credit.added": "Kredit kepanitiaan ditambah",
  "credit.removed": "Kredit kepanitiaan dihapus",
  "asset.reserved": "Aset direservasi",
  "asset.released": "Reservasi aset dilepas",
  "committee_evaluation.deleted": "Jawaban evaluasi panitia dihapus",
};
