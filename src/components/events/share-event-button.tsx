"use client";

import { ShareButton } from "@/components/share-button";

// Tombol Bagikan halaman acara — pembungkus tipis ShareButton bersama (label
// khas acara, URL = halaman saat ini).
export function ShareEventButton({ title, text }: { title: string; text?: string | null }) {
  return <ShareButton title={title} text={text} labelKey="events.share" copiedKey="events.shareCopied" />;
}
