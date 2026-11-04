import { requestEventApproval, reviewEventApproval } from "@/app/actions/admin-events";
import { RejectWithReason } from "@/components/console/reject-with-reason";
import { SubmitButton } from "@/components/console/submit-button";
import type { EventApprovalState } from "@/lib/event-capabilities";

const PRIMARY_BUTTON =
  "self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors";

// Bagian alur persetujuan di Status & Publikasi: draf -> diajukan -> disetujui BPH Kabinet.
// Tombolnya hanya kemudahan; gerbang sebenarnya ada di requestEventApproval/reviewEventApproval.
export function EventApprovalPanel({
  eventId,
  state,
  isDraft,
  canRequest,
  canReview,
  requestedBy,
  requestedAt,
  rejectionReason,
}: {
  eventId: string;
  state: EventApprovalState;
  isDraft: boolean;
  canRequest: boolean;
  canReview: boolean;
  requestedBy: string | null;
  requestedAt: string | null;
  /** Alasan penolakan terakhir, kalau pengajuan sebelumnya ditolak. */
  rejectionReason: string | null;
}) {
  if (state === "diajukan") {
    if (!canReview) return <p className="text-body-md text-on-surface-variant">Menunggu persetujuan BPH Kabinet.</p>;
    return (
      <form action={reviewEventApproval} className="flex flex-col gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        <p className="text-body-md text-on-background">
          Diajukan oleh <span className="font-medium">{requestedBy ?? "seorang pengurus"}</span>
          {requestedAt && `, ${requestedAt}`}. Menyetujui belum menerbitkan acara ini. Kalau butuh panitia, tunjuk Ketua
          Pelaksana di Struktur Kepanitiaan (tab Internal).
        </p>
        <SubmitButton name="decision" value="approve" successMessage="Keputusan tersimpan." className={PRIMARY_BUTTON}>
          Setujui
        </SubmitButton>
        <RejectWithReason placeholder="mis. Tanggalnya bentrok dengan acara lain" />
      </form>
    );
  }

  if (!isDraft) return null;

  if (state === "disetujui") {
    return canRequest ? (
      <p className="text-body-md text-on-surface-variant">
        Sudah disetujui BPH Kabinet. Terbitkan atau jadwalkan saat sudah siap. Ketua Pelaksana ditunjuk BPH Kabinet.
      </p>
    ) : null;
  }

  if (!canRequest) return null;

  return (
    <form action={requestEventApproval} className="flex flex-col gap-3">
      <input type="hidden" name="eventId" value={eventId} />
      {rejectionReason && (
        <p className="text-body-md text-on-background">
          <span className="font-medium">Pengajuan sebelumnya ditolak.</span> Alasan: {rejectionReason}
        </p>
      )}
      <p className="text-body-md text-on-surface-variant">
        Draf belum tampil di situs publik. Kalau sudah siap, ajukan ke BPH Kabinet supaya bisa diterbitkan.
      </p>
      <SubmitButton successMessage="Terkirim ke BPH Kabinet." className={PRIMARY_BUTTON}>
        Ajukan ke BPH
      </SubmitButton>
    </form>
  );
}
