"use client";

import { useState, useTransition } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { issueAllCertificatesWithFolder, setCertificateFolder } from "@/app/actions/committee";
import { SubmitButton } from "@/components/console/submit-button";

const FIELD = "bg-soft-gray rounded-md p-2.5 text-body-md min-w-0 flex-1";

/**
 * Folder sertifikat acara (peserta/panitia): satu tautan folder berisi semua
 * PDF. Simpan folder sekali, lalu "Terbitkan semua yang berhak" memasang
 * tautan itu ke seluruh daftar berhak — jadi panitia tidak menempel tautan
 * satu-satu. Roster per-orang tetap ada untuk yang tautannya beda-beda.
 */
export function CertificateFolder({
  eventId,
  kind,
  folderUrl,
  eligibleCount,
}: {
  eventId: string;
  kind: "peserta" | "panitia";
  folderUrl: string;
  eligibleCount: number;
}) {
  const [result, setResult] = useState<{ issued: number; updated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function issueAll() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await issueAllCertificatesWithFolder(eventId, kind));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menerbitkan sertifikat massal");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
      <h3 className="flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-background">
        <FolderOpen size={14} className="text-primary-container" aria-hidden="true" /> Folder sertifikat{" "}
        {kind === "peserta" ? "peserta" : "panitia"}
      </h3>
      <p className="text-body-sm text-on-surface-variant max-w-2xl">
        Satu tautan folder berisi semua PDF (mis. folder Google Drive) — praktis kalau sertifikatnya dibuat sekaligus.
        <b className="text-on-background"> Terbitkan semua yang berhak</b> memasang tautan folder ini ke seluruh daftar
        di bawah; yang sudah punya tautannya sendiri akan diganti ke folder ini (tanpa notifikasi ulang). Pakai
        penyimpanan yang bisa dibuka dari Tiongkok — Google Drive sering terblokir tanpa VPN.
      </p>
      <form action={setCertificateFolder} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="kind" value={kind} />
        <input
          name="folderUrl"
          type="url"
          pattern="https://.+"
          defaultValue={folderUrl}
          placeholder="https://drive.google.com/drive/folders/…"
          aria-label="Tautan folder sertifikat"
          className={FIELD}
        />
        <SubmitButton
          successMessage="Folder sertifikat tersimpan."
          className="text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-2 rounded-md hover:bg-surface-container-low transition-colors"
        >
          Simpan folder
        </SubmitButton>
      </form>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={issueAll}
          disabled={pending || !folderUrl || eligibleCount === 0}
          className="inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
        >
          {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Terbitkan semua yang berhak (
          {eligibleCount})
        </button>
        {!folderUrl && (
          <span className="text-body-sm text-on-surface-variant">Simpan folder dulu untuk mengaktifkan tombol ini.</span>
        )}
        {result && (
          <span role="status" className="text-body-sm text-on-surface-variant">
            {result.issued} diterbitkan, {result.updated} tautan diperbarui.
          </span>
        )}
        {error && (
          <span role="alert" className="text-body-sm text-error">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
