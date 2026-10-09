"use client";

import { useState, useTransition } from "react";
import { Link2, Loader2 } from "lucide-react";
import { ensureEventShortLinks } from "@/app/actions/short-links";
import { CopyLinkButton } from "@/components/console/copy-link-button";
import { LinkQrDisclosure } from "@/components/console/link-qr-disclosure";

export type EventShareLinkState = {
  /** URL panjang langsung ke halaman (selalu ada, cadangan sebelum dipendekkan). */
  directUrl: string;
  /** Slug tautan pendek yang sudah ada (null = belum dibuat). */
  slug: string | null;
  /** QR data URL untuk slug di atas (null bila belum dibuat). */
  qrDataUrl: string | null;
};

/**
 * Dua tautan yang paling sering dibagikan panitia — pendaftaran & evaluasi —
 * langsung bisa dipendekkan + QR dari sini, tanpa membuka modul Tautan.
 * SATU klik membuat KEDUANYA (`ensureEventShortLinks`), idempoten: tautan yang
 * sudah ada dipakai ulang (termasuk buatan manual di /console/links), dan
 * targetnya disimpan relatif supaya QR tidak mati saat situs pindah domain.
 */
export function EventShareLinks({
  eventId,
  status,
  scheduledPublishLabel,
  daftar,
  evaluasi,
}: {
  eventId: string;
  /** Status acara — draft/scheduled: halaman publik belum aktif, beri catatan. */
  status: string;
  /** Jadwal tayang (label siap-tampil, zona Asia/Shanghai), bila ada. */
  scheduledPublishLabel: string | null;
  daftar: EventShareLinkState;
  evaluasi: EventShareLinkState;
}) {
  const [rows, setRows] = useState({ daftar, evaluasi });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function create() {
    setError(null);
    setPending(true);
    startTransition(async () => {
      try {
        const res = await ensureEventShortLinks(eventId);
        setRows((r) => ({
          daftar: { ...r.daftar, slug: res.daftar.slug, qrDataUrl: res.daftar.qrDataUrl },
          evaluasi: { ...r.evaluasi, slug: res.evaluasi.slug, qrDataUrl: res.evaluasi.qrDataUrl },
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal membuat tautan pendek");
      } finally {
        setPending(false);
      }
    });
  }

  const items: { kind: "daftar" | "evaluasi"; label: string; description: string; state: EventShareLinkState }[] = [
    {
      kind: "daftar",
      label: "Tautan Pendaftaran",
      description: "Untuk dibagikan ke calon peserta (form pendaftaran publik).",
      state: rows.daftar,
    },
    {
      kind: "evaluasi",
      label: "Tautan Evaluasi",
      description: "Kuesioner pasca-acara — bagikan setelah acara selesai.",
      state: rows.evaluasi,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {(status === "draft" || status === "scheduled") && (
        <p
          role="note"
          className="rounded-lg border border-primary-container/40 bg-primary-container/10 px-4 py-3 text-body-md text-on-background"
        >
          Acara masih <b>{status === "draft" ? "draf" : "dijadwalkan tayang"}</b>
          {scheduledPublishLabel ? ` (${scheduledPublishLabel})` : ""} — halaman pendaftaran & evaluasi baru terbuka
          untuk umum setelah acara dipublikasikan; sementara ini halaman pendaftaran hanya bisa dibuka panitia
          (mode uji coba) dan halaman evaluasi belum aktif. Tautan pendeknya boleh dibuat sekarang — otomatis
          berfungsi begitu acara tayang.
        </p>
      )}
      {items.map(({ kind, label, description, state }) => (
        <div
          key={kind}
          className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-background">
              <Link2 size={14} className="text-primary-container" aria-hidden="true" /> {label}
            </h3>
            {state.slug ? (
              <span className="text-label-caps uppercase tracking-wide text-primary-container">/l/{state.slug}</span>
            ) : (
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                belum ada tautan pendek
              </span>
            )}
          </div>
          <p className="text-body-sm text-on-surface-variant">{description}</p>
          <p className="break-all text-body-sm text-on-surface-variant">
            <code className="text-on-background">{state.directUrl}</code>
          </p>
          {state.slug ? (
            <div className="flex flex-wrap items-center gap-4">
              <CopyLinkButton slug={state.slug} label="Salin tautan pendek" />
              {state.qrDataUrl && <LinkQrDisclosure slug={state.slug} qrDataUrl={state.qrDataUrl} />}
            </div>
          ) : (
            <button
              type="button"
              onClick={create}
              disabled={pending}
              title="Sekali klik membuat tautan pendek pendaftaran & evaluasi"
              className="self-start inline-flex items-center gap-2 border border-outline-variant px-4 py-2 rounded-md text-label-caps uppercase tracking-wide hover:bg-surface-container-low transition-colors disabled:opacity-60"
            >
              {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Buat tautan pendek + QR
              (keduanya)
            </button>
          )}
        </div>
      ))}
      {error && (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
