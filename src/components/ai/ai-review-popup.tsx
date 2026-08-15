"use client";

import { useState } from "react";
import { Lightbulb, Loader2, X } from "lucide-react";
import { suggestContentAction } from "@/app/actions/ai";

type FieldRef = { id: string; label: string };

export function AIReviewButton({ context, fields }: { context: "event" | "news"; fields: FieldRef[] }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    const data: Record<string, string> = {};
    for (const f of fields) {
      const el = document.getElementById(f.id) as HTMLInputElement | HTMLTextAreaElement | null;
      data[f.label] = el?.value ?? "";
    }
    setBusy(true);
    setErr(null);
    setSuggestions(null);
    try {
      const s = await suggestContentAction(context, data);
      setSuggestions(s);
      setOpen(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal meminta saran AI");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-label-caps text-primary-container hover:text-primary disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
        {busy ? "Meminta saran..." : "Minta saran AI"}
      </button>
      {err && <p className="text-error text-label-caps mt-1">{err}</p>}

      {open && suggestions && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-headline-sm text-on-background flex items-center gap-2">
                <Lightbulb size={18} className="text-primary-container" /> Saran AI
              </h3>
              <button onClick={() => setOpen(false)} className="text-secondary hover:text-on-background" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>
            <div className="text-body-md text-on-background whitespace-pre-wrap">{suggestions}</div>
            <button
              onClick={() => setOpen(false)}
              className="mt-5 self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-2.5 rounded-md hover:bg-primary transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
