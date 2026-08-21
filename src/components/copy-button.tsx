"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export function CopyButton({
  value,
  label,
  className = "flex items-center gap-1.5 text-label-caps uppercase tracking-wide border border-outline-variant rounded-md px-4 py-2 hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const t = useT();
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

  // Resolved here rather than as a default parameter value: `label` is optional,
  // and a default can't call useT(). The copied state is translated too - it used
  // to be a hard-coded "Tersalin" that stayed Indonesian even when the caller
  // passed an English `label`, so the button showed two languages at once.
  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? t("common.copied") : (label ?? t("common.copy"))}
    </button>
  );
}
