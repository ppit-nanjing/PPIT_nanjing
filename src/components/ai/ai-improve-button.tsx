"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { improveTextAction } from "@/app/actions/ai";
import type { ImproveContext } from "@/lib/groq";
import { useT } from "@/lib/i18n/client";

type Props = {
  context: ImproveContext;
  label?: string;
  // Uncontrolled (server forms): pass the textarea/input DOM id.
  targetId?: string;
  // Controlled (e.g. feedback widget): pass value + callback.
  value?: string;
  onImproved?: (text: string) => void;
  // Sumber dibaca saat diklik (bukan saat render) - untuk editor yang isinya
  // tidak tercermin di prop `value`. Dipasangkan dengan `improve` bila hasilnya
  // bukan teks polos (mis. HTML rich text).
  getValue?: () => string;
  // Pengganti improveTextAction(source, context) untuk konteks yang punya
  // aksi sendiri.
  improve?: (source: string) => Promise<string>;
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function AIImproveButton({ context, label, targetId, value, onImproved, getValue, improve, className, disabled, disabledReason }: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    const source = getValue ? getValue() : value !== undefined ? value : targetId ? ((document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null)?.value ?? "") : "";
    if (!source.trim()) {
      setErr(t("ai.errEmpty"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const improved = await (improve ? improve(source) : improveTextAction(source, context));
      if (onImproved) {
        onImproved(improved);
      } else if (targetId) {
        const el = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
        if (el) {
          el.value = improved;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("ai.errFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={run}
        disabled={busy || disabled}
        title={disabled ? disabledReason : undefined}
        className="inline-flex items-center gap-1.5 text-label-caps text-primary-container hover:text-primary disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {busy ? t("ai.processing") : (label ?? t("ai.improveDefault"))}
      </button>
      {err && <p className="text-error text-label-caps mt-1">{err}</p>}
    </div>
  );
}
