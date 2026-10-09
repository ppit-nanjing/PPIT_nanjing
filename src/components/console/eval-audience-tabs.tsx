"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ClipboardCheck, ClipboardList } from "lucide-react";

type Audience = "peserta" | "panitia";
const ORDER: Audience[] = ["peserta", "panitia"];

// Switcher dua audiens evaluasi (Peserta | Panitia) untuk section konsol.
// Children diisi dari server component — di sini hanya menyimpan tab aktif.
// Kedua panel tetap terpasang (yang tidak aktif `hidden`), jadi isian builder
// yang belum disimpan tidak hilang saat berpindah tab. Pola tab ARIA lengkap:
// panah kiri/kanan, Home/End, dan roving tabIndex.
export function EvalAudienceTabs({
  peserta,
  panitia,
  pesertaLabel = "Peserta",
  panitiaLabel = "Panitia",
  initial = "peserta",
}: {
  peserta: ReactNode;
  panitia: ReactNode;
  pesertaLabel?: string;
  panitiaLabel?: string;
  initial?: Audience;
}) {
  const [active, setActive] = useState<Audience>(initial);
  const baseId = useId();
  const tabRefs = useRef<Record<Audience, HTMLButtonElement | null>>({ peserta: null, panitia: null });

  const tabId = (a: Audience) => `${baseId}-tab-${a}`;
  const panelId = (a: Audience) => `${baseId}-panel-${a}`;
  const labels: Record<Audience, string> = { peserta: pesertaLabel, panitia: panitiaLabel };
  const icons: Record<Audience, ReactNode> = {
    peserta: <ClipboardList size={14} aria-hidden="true" />,
    panitia: <ClipboardCheck size={14} aria-hidden="true" />,
  };

  function select(a: Audience) {
    setActive(a);
    tabRefs.current[a]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const i = ORDER.indexOf(active);
    if (e.key === "ArrowRight") select(ORDER[(i + 1) % ORDER.length]);
    else if (e.key === "ArrowLeft") select(ORDER[(i - 1 + ORDER.length) % ORDER.length]);
    else if (e.key === "Home") select(ORDER[0]);
    else if (e.key === "End") select(ORDER[ORDER.length - 1]);
    else return;
    e.preventDefault();
  }

  const tabClass = (isActive: boolean) =>
    `inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-label-caps uppercase tracking-wide transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
      isActive ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-background"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-wrap gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-1 w-fit"
        role="tablist"
        aria-label="Audiens evaluasi"
      >
        {ORDER.map((a) => (
          <button
            key={a}
            ref={(el) => {
              tabRefs.current[a] = el;
            }}
            type="button"
            role="tab"
            id={tabId(a)}
            aria-selected={active === a}
            aria-controls={panelId(a)}
            tabIndex={active === a ? 0 : -1}
            onClick={() => setActive(a)}
            onKeyDown={onKeyDown}
            className={tabClass(active === a)}
          >
            {icons[a]} {labels[a]}
          </button>
        ))}
      </div>
      {ORDER.map((a) => (
        <div key={a} role="tabpanel" id={panelId(a)} aria-labelledby={tabId(a)} hidden={active !== a}>
          {a === "peserta" ? peserta : panitia}
        </div>
      ))}
    </div>
  );
}
