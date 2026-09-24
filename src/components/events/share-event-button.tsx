"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useT } from "@/lib/i18n/client";

// Web Share API opens the device's native share sheet (WeChat, WhatsApp,
// copy, etc.) where supported - mostly mobile browsers. Desktop browsers
// mostly lack it, so the fallback copies the URL instead, same UX as
// CopyLinkButton in the console.
export function ShareEventButton({ title, text }: { title: string; text?: string | null }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: text ?? undefined, url });
      } catch {
        // User dismissed the native share sheet - not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded text-label-caps uppercase tracking-wide text-primary-container transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
      {copied ? t("events.shareCopied") : t("events.share")}
    </button>
  );
}
