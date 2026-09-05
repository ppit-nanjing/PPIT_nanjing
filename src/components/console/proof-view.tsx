"use client";

import { useState } from "react";
import Image from "next/image";
import { FileText, TriangleAlert, ExternalLink, Download } from "lucide-react";

// Menampilkan berkas yang diunggah peserta/peminjam (Pernyataan Peminjam
// bertanda tangan, bukti mahasiswa aktif, bukti transfer) di panel admin, dengan
// dua aksi: PREVIEW (buka / thumbnail) dan UNDUH (simpan sebagai arsip bukti).
//
//  - blob publik gambar  -> thumbnail Next-optimized + tautan Buka/Unduh
//  - blob publik dokumen -> tautan Buka + Unduh (Unduh pakai ?download=1 supaya
//    Vercel Blob mengirim Content-Disposition: attachment)
//  - route internal /api/… (kartu mahasiswa privat) -> <img> biasa / tautan Buka
//    (browser bawa cookie sesi; kalau admin tak punya akses `reports`, gambarnya
//    gagal dan kita jatuh ke tautan)
//  - path relatif situs (/pernyataan-peminjam.docx dll) -> tautan Buka + Unduh
//  - selain itu (file://, C:\…, \\server\, teks acak) -> peringatan merah.
//    Nilai begini muncul kalau unggahan gagal lalu nilai path lokal ikut tersimpan.

const IMG_EXT_RE = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;
// Blob publik Vercel — cocokkan `*.public.blob…` maupun `*.blob…` (sama seperti
// isAllowedUploadUrl di actions/events.ts).
const BLOB_RE = /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i;
// Path lokal perangkat / non-web, bukan berkas yang bisa dibuka admin: drive
// Windows (C:\), file:, UNC (\\server), dan folder khas OS di path Unix.
const LOCAL_PATH_RE = /^([a-z]:[\\/]|file:|\\\\|\/(Users|home|root|mnt|media|private|var|tmp|opt|etc)\/)/i;

export function ProofView({ url, label }: { url: string | null | undefined; label: string }) {
  const clean = (url ?? "").trim();
  const [imgFailed, setImgFailed] = useState(false);

  if (!clean) {
    return <span className="text-on-surface-variant normal-case">— belum ada</span>;
  }

  const isBlob = BLOB_RE.test(clean);
  const isSameOriginPath = clean.startsWith("/") && !clean.startsWith("//");
  const isInternal = clean.startsWith("/api/");

  // Bukan sumber yang bisa dibuka admin. statementUrl / proofUrl divalidasi
  // server-side (blob atau /api/…), jadi selain itu = data rusak / path lokal.
  if (clean.includes("\\") || LOCAL_PATH_RE.test(clean) || (!isBlob && !isSameOriginPath)) {
    return (
      <span className="inline-flex items-center gap-1 text-error normal-case" title={clean}>
        <TriangleAlert size={13} aria-hidden /> berkas tidak valid — minta peserta unggah ulang
      </span>
    );
  }

  // Vercel Blob melayani berkas inline; `?download=1` memaksa attachment supaya
  // admin bisa menyimpannya. Route internal & path statis tak punya opsi ini —
  // tautan Unduh-nya buka biasa, admin simpan lewat menu browser.
  const downloadHref = isBlob ? `${clean}${clean.includes("?") ? "&" : "?"}download=1` : clean;

  const openLink = (
    <a
      href={clean}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary-container hover:underline normal-case"
    >
      <FileText size={13} aria-hidden /> Buka <ExternalLink size={11} aria-hidden />
    </a>
  );

  const downloadLink = (
    <a
      href={downloadHref}
      target={isBlob ? undefined : "_blank"}
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary-container normal-case"
      title={`Unduh ${label}`}
    >
      <Download size={13} aria-hidden /> Unduh
    </a>
  );

  const showThumb = (isBlob || isInternal || isSameOriginPath) && IMG_EXT_RE.test(clean) && !imgFailed;

  const preview = showThumb ? (
    <a
      href={clean}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block overflow-hidden rounded-md border border-outline-variant align-middle transition-opacity hover:opacity-90"
      title={`${label} — klik untuk memperbesar`}
    >
      {isBlob ? (
        <Image
          src={clean}
          alt={label}
          width={128}
          height={96}
          onError={() => setImgFailed(true)}
          className="h-16 w-auto max-w-[8rem] object-cover"
        />
      ) : (
        // Route internal / path statis: optimizer Next dilewati (butuh cookie /
        // sederhana), pakai <img> biasa.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={clean}
          alt={label}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          className="h-16 w-auto max-w-[8rem] rounded-md border border-outline-variant object-cover"
        />
      )}
    </a>
  ) : (
    openLink
  );

  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 align-middle">
      {preview}
      {downloadLink}
    </span>
  );
}
