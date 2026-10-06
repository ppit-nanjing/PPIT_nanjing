"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { saveCertificateLinksBulk, type CertificateBulkState } from "@/app/actions/committee";

const INITIAL: CertificateBulkState = { done: false, issued: 0, updated: 0, problems: [] };

/**
 * Tempel massal: satu orang per baris, email atau nama lengkap lalu tautan.
 *
 * Dikirim lewat onSubmit + useTransition, BUKAN <form action>: aksi form membuat
 * React mengosongkan isian setelah selesai, padahal baris yang bermasalah harus
 * tetap ada di kotak supaya bisa diperbaiki dan dikirim ulang. Baris yang sudah
 * berhasil aman dikirim ulang (hanya memperbarui tautan, tanpa notifikasi ganda).
 */
export function CertificateBulkForm({ eventId, kind }: { eventId: string; kind: "peserta" | "panitia" }) {
  const [state, setState] = useState<CertificateBulkState | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      setState(await saveCertificateLinksBulk(INITIAL, data));
    });
  }

  return (
    <details className="rounded-lg border border-outline-variant">
      <summary className="cursor-pointer px-4 py-3 text-label-caps uppercase tracking-wide text-on-background">
        Tempel banyak sekaligus (satu orang per baris)
      </summary>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-outline-variant p-4">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="kind" value={kind} />
        <p className="text-body-sm text-on-surface-variant max-w-2xl">
          Tulis <b className="text-on-background">email atau nama lengkap</b>, lalu tautan{" "}
          <code>https://…</code>, dipisah tab, koma, atau spasi. Hanya{" "}
          {kind === "peserta" ? "peserta yang tercatat hadir" : "anggota kepanitiaan acara ini"} yang diproses; baris lain
          dilaporkan di bawah.
        </p>
        <textarea
          name="lines"
          rows={6}
          required
          spellCheck={false}
          placeholder={"budi@contoh.com\thttps://contoh.com/sertifikat/budi.pdf\nSiti Aminah, https://contoh.com/sertifikat/siti.pdf"}
          className="bg-soft-gray rounded-md p-2.5 text-body-md font-mono"
        />
        <button
          type="submit"
          disabled={pending}
          className="self-start inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
        >
          {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Terbitkan semua yang cocok
        </button>

        {state?.done && (
          <div role="status" className="flex flex-col gap-2 rounded-md bg-surface-container-low p-3 text-body-md text-on-background">
            <p>
              <b>{state.issued}</b> sertifikat diterbitkan, <b>{state.updated}</b> tautan diperbarui
              {state.problems.length > 0 ? `, ${state.problems.length} baris bermasalah:` : "."}
            </p>
            {state.problems.length > 0 && (
              <ul className="list-disc pl-5 text-body-sm text-error">
                {state.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </details>
  );
}
