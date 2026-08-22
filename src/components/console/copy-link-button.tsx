"use client";

import { useState } from "react";

export function CopyLinkButton({ slug, label = "Salin" }: { slug: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const url = `${window.location.origin}/l/${slug}`;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors"
      aria-label={`Salin tautan /l/${slug}`}
    >
      {copied ? "Tersalin" : label}
    </button>
  );
}
