"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

// Route-level boundary for every /console/* page. Server actions that throw
// plain Errors (validation, Forbidden) land here instead of crashing the
// whole app with Next's default screen. Kept generic on purpose - specific
// forms should surface their own inline errors via useActionState.
export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[console]", error);
  }, [error]);

  // Di produksi Next.js mengganti pesan galat server dengan kalimat Inggris generik
  // ("An error occurred in the Server Components render..."), yang tidak berguna bagi pengurus.
  const opaque = !error.message || /Server Components render/i.test(error.message);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 rounded-full bg-error-container/40 flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-error" aria-hidden />
      </div>
      <h1 className="text-headline-md text-on-background mb-2">Halaman ini belum bisa dibuka</h1>
      <p className="text-body-md text-on-surface-variant max-w-md mb-6">
        {opaque ? "Ada yang salah saat memuat halaman ini." : error.message} Coba lagi; kalau berulang,
        hubungi Divisi Teknologi{error.digest ? ` (kode: ${error.digest})` : ""}.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors"
        >
          <RotateCcw size={14} aria-hidden /> Coba Lagi
        </button>
        <Link
          href="/console"
          className="inline-flex items-center gap-2 border border-outline-variant text-on-surface-variant text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-surface-container-low hover:text-on-background transition-colors"
        >
          Ke Dashboard
        </Link>
      </div>
    </div>
  );
}
