"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { TKey } from "@/lib/i18n/dictionaries/id";

const DEFAULT_CLASS =
  "inline-flex items-center gap-2 rounded text-label-caps uppercase tracking-wide text-primary-container transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Tombol berbagi bersama (acara, lowongan, formulir): Web Share API membuka
// sheet bawaan perangkat (WeChat, WhatsApp, dll) di HP; browser desktop
// umumnya tidak punya, jadi fallback menyalin tautan. `url` eksplisit WAJIB
// dikirim saat dipakai dari console — window.location di sana halaman console.
export function ShareButton({
  title,
  text,
  url,
  labelKey,
  copiedKey,
  className,
}: {
  title: string;
  text?: string | null;
  url?: string;
  labelKey: TKey;
  copiedKey: TKey;
  className?: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = url ?? window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: text ?? undefined, url: shareUrl });
      } catch {
        // User dismissed the native share sheet - not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" onClick={handleShare} className={className ?? DEFAULT_CLASS}>
      {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
      {copied ? t(copiedKey) : t(labelKey)}
    </button>
  );
}
