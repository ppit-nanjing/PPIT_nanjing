"use client";

import { useState } from "react";
import Image from "next/image";
import { FileText, TriangleAlert, ExternalLink } from "lucide-react";

// Menampilkan berkas yang diunggah peserta (bukti mahasiswa aktif, bukti
// transfer) di panel admin:
//  - blob publik gambar  -> thumbnail Next-optimized (ringan walau aslinya foto HP besar)
//  - blob publik dokumen -> tautan "lihat berkas"
//  - route internal /api/… (kartu mahasiswa privat dari sensus) -> <img> biasa
//    (browser bawa cookie sesi; kalau admin tak punya akses `reports`, gambarnya
//    gagal dan kita jatuh ke tautan)
//  - selain itu (file://, C:\…, javascript:, teks acak) -> peringatan merah.
//    Nilai begini sering muncul kalau unggahan gagal lalu peserta menempel path
//    berkas di perangkatnya sendiri.

const IMG_EXT_RE = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;
const BLOB_RE = /^https:\/\/[a-z0-9.-]*\.public\.blob\.vercel-storage\.com\//i;

export function ProofView({ url, label }: { url: string | null | undefined; label: string }) {
  const clean = (url ?? "").trim();
  const [imgFailed, setImgFailed] = useState(false);

  if (!clean) {
    return <span className="text-on-surface-variant normal-case">— belum ada</span>;
  }

  const isBlob = BLOB_RE.test(clean);
  const isInternal = clean.startsWith("/api/");

  // Bukan sumber yang bisa dibuka admin.
  if (!isBlob && !isInternal) {
    return (
      <span className="inline-flex items-center gap-1 text-error normal-case" title={clean}>
        <TriangleAlert size={13} aria-hidden /> berkas tidak valid — minta peserta unggah ulang
      </span>
    );
  }

  const openLink = (
    <a
      href={clean}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary-container hover:underline normal-case"
    >
      <FileText size={13} aria-hidden /> lihat berkas <ExternalLink size={11} aria-hidden />
    </a>
  );

  // Blob dokumen (PDF/doc) — tak ada pratinjau.
  if (isBlob && !IMG_EXT_RE.test(clean)) return openLink;

  if (imgFailed) return openLink;

  const thumb = isBlob ? (
    <Image
      src={clean}
      alt={label}
      width={128}
      height={96}
      onError={() => setImgFailed(true)}
      className="h-16 w-auto max-w-[8rem] object-cover"
    />
  ) : (
    // Route internal: optimizer Next tak bisa (butuh cookie), pakai <img> biasa.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={clean}
      alt={label}
      loading="lazy"
      decoding="async"
      onError={() => setImgFailed(true)}
      className="h-16 w-auto max-w-[8rem] rounded-md border border-outline-variant object-cover"
    />
  );

  return (
    <a
      href={clean}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block overflow-hidden rounded-md border border-outline-variant align-middle transition-opacity hover:opacity-90"
      title={`${label} — klik untuk memperbesar`}
    >
      {thumb}
    </a>
  );
}
