"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

// Tombol "perbarui" untuk daftar konsol yang datanya sering berubah (mis.
// pendaftar acara saat pendaftaran sedang ramai). router.refresh() menarik
// ulang data server component tanpa reload penuh - state klien (scroll, filter,
// baris yang terbuka) tetap. Opsional auto tiap 30 detik.
export function RefreshButton({
  label = "Perbarui",
  autoLabel = "Otomatis tiap 30 dtk",
  intervalMs = 30_000,
}: {
  label?: string;
  autoLabel?: string;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [auto, setAuto] = useState(false);
  const [lastAt, setLastAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      const t = Date.now();
      setLastAt(t);
      setNow(t);
    });
  }, [router]);

  // Jam untuk label "X lalu" - juga menutupi selisih SSR/klien.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [auto, intervalMs, refresh]);

  const secs = Math.max(0, Math.round((now - lastAt) / 1000));
  const ago =
    secs < 10 ? "baru saja" : secs < 60 ? `${secs} dtk lalu` : `${Math.round(secs / 60)} mnt lalu`;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-1.5 text-label-caps uppercase tracking-wide text-on-background transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container disabled:opacity-60"
      >
        <RefreshCw size={13} aria-hidden className={pending ? "animate-spin" : ""} /> {label}
      </button>
      <label className="inline-flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => setAuto(e.target.checked)}
          className="h-3.5 w-3.5 accent-[var(--color-primary-container)]"
        />
        {autoLabel}
      </label>
      <span aria-live="polite">diperbarui {ago}</span>
    </div>
  );
}
