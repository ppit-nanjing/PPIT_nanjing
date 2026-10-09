"use client";

import { useState, useTransition } from "react";
import { Link2, Loader2 } from "lucide-react";
import { ensureEventShortLink, type EventShortLinkKind } from "@/app/actions/short-links";
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
 * Slug dibuat server (`ensureEventShortLink`), idempoten: klik ulang memakai
 * tautan yang sudah ada (termasuk yang dibuat manual di /console/links).
 */
export function EventShareLinks({
  eventId,
  daftar,
  evaluasi,
}: {
  eventId: string;
  daftar: EventShareLinkState;
  evaluasi: EventShareLinkState;
}) {
  const [rows, setRows] = useState({ daftar, evaluasi });
  const [pending, setPending] = useState<EventShortLinkKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function create(kind: EventShortLinkKind) {
    setError(null);
    setPending(kind);
    startTransition(async () => {
      try {
        const res = await ensureEventShortLink(eventId, kind);
        setRows((r) => ({ ...r, [kind]: { ...r[kind], slug: res.slug, qrDataUrl: res.qrDataUrl } }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal membuat tautan pendek");
      } finally {
        setPending(null);
      }
    });
  }

  const items: { kind: EventShortLinkKind; label: string; description: string; state: EventShareLinkState }[] = [
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
              onClick={() => create(kind)}
              disabled={pending !== null}
              className="self-start inline-flex items-center gap-2 border border-outline-variant px-4 py-2 rounded-md text-label-caps uppercase tracking-wide hover:bg-surface-container-low transition-colors disabled:opacity-60"
            >
              {pending === kind && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Buat tautan
              pendek + QR
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
