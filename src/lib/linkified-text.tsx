import type { ReactNode } from "react";

// URL detection for plain-text blocks (deskripsi/persyaratan lowongan). The
// console stores free text only, but admins paste application links into it -
// those must be clickable, not raw text. Server-safe: no "use client".
const URL_RE = /https?:\/\/[^\s<>()]+/g;
// Tanda baca yang menempel di akhir kalimat (".../viewform.") bukan bagian URL.
const TRAILING_PUNCT_RE = /[.,;:!?]+$/;

export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0];
    const idx = match.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));

    const trailing = raw.match(TRAILING_PUNCT_RE)?.[0] ?? "";
    const url = trailing ? raw.slice(0, -trailing.length) : raw;
    parts.push(
      <a
        key={`${idx}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-primary-container underline decoration-from-font break-all hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {url}
      </a>,
    );
    if (trailing) parts.push(trailing);

    last = idx + raw.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return <p className={className}>{parts}</p>;
}
