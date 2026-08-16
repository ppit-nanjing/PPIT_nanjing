"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({
  value,
  label = "Salin",
  className = "flex items-center gap-1.5 text-label-caps uppercase tracking-wide border border-outline-variant rounded-md px-4 py-2 hover:bg-surface-container-low transition-colors",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context) - nothing else to do.
    }
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Tersalin" : label}
    </button>
  );
}
