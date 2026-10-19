"use client";

import { ShareButton } from "@/components/share-button";

// Tombol Bagikan halaman lowongan — pembungkus tipis ShareButton bersama
// (label khas lowongan, URL = halaman saat ini).
export function ShareJobButton({ title, text }: { title: string; text?: string | null }) {
  return <ShareButton title={title} text={text} labelKey="jobs.share" copiedKey="jobs.shareCopied" />;
}
