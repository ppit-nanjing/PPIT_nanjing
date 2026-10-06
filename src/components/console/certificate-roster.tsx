import { CheckCircle2, ExternalLink } from "lucide-react";
import { SubmitButton } from "@/components/console/submit-button";
import { issueCertificateWithLink } from "@/app/actions/committee";

export type CertificateRosterRow = {
  userId: string;
  name: string;
  /** Keterangan kecil di bawah nama (mis. peran panitia atau email). */
  detail?: string | null;
  /** Sertifikat yang sudah terbit untuk orang ini (null = belum). */
  cert: { fileUrl: string | null } | null;
};

const FIELD = "bg-soft-gray rounded-md p-2.5 text-body-md min-w-0 flex-1";

/**
 * Daftar orang yang berhak atas sertifikat, masing-masing dengan kolom tautan
 * berkas. Sertifikat baru terbit saat tautannya disimpan (tidak ada sertifikat
 * tanpa berkas), dan menyimpan ulang dengan tautan lain memperbarui tautannya.
 */
export function CertificateRoster({
  eventId,
  kind,
  rows,
  emptyText,
}: {
  eventId: string;
  kind: "peserta" | "panitia";
  rows: CertificateRosterRow[];
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="text-body-md text-on-surface-variant max-w-2xl">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-outline-variant/60 rounded-lg border border-outline-variant">
      {rows.map((row) => {
        const issued = !!row.cert?.fileUrl;
        return (
          <li key={row.userId} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
            <div className="sm:w-56 shrink-0 min-w-0">
              <p className="text-body-md text-on-background break-words">{row.name}</p>
              {row.detail && <p className="text-body-sm text-on-surface-variant break-words">{row.detail}</p>}
              <p className={`mt-0.5 flex items-center gap-1 text-label-caps ${issued ? "text-primary-container" : "text-on-surface-variant"}`}>
                {issued ? (
                  <>
                    <CheckCircle2 size={12} aria-hidden="true" /> Terbit
                  </>
                ) : (
                  "Belum terbit"
                )}
              </p>
            </div>
            <form action={issueCertificateWithLink} className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="userId" value={row.userId} />
              <input type="hidden" name="kind" value={kind} />
              <input
                name="fileUrl"
                type="url"
                required
                // Peramban menerima http://, server hanya https://. Cegat di sini supaya tidak
                // berakhir di halaman error (aksi yang melempar error menggantikan seluruh halaman).
                pattern="https://.+"
                title="Alamat harus diawali https://"
                defaultValue={row.cert?.fileUrl ?? ""}
                placeholder="https://… tautan berkas sertifikat"
                aria-label={`Tautan berkas sertifikat ${row.name}`}
                className={FIELD}
              />
              <SubmitButton
                successMessage={issued ? "Tautan diperbarui." : "Sertifikat diterbitkan."}
                className="text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-2 rounded-md hover:bg-surface-container-low transition-colors"
              >
                {issued ? "Simpan tautan" : "Terbitkan"}
              </SubmitButton>
              {issued && row.cert?.fileUrl && (
                <a
                  href={row.cert.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Buka berkas sertifikat ${row.name}`}
                  className="p-2 text-on-surface-variant hover:text-on-background"
                >
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              )}
            </form>
          </li>
        );
      })}
    </ul>
  );
}
