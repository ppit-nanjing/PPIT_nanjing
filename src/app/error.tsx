"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  const handleRetry = () => (reset ?? retry)?.();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-[var(--spacing-container-padding)]">
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl p-10 text-center">
        <h1 className="text-headline-lg text-on-background mb-4">Terjadi kesalahan</h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          Maaf, terjadi kendala saat memuat halaman ini. Silakan coba lagi atau kembali ke
          beranda.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRetry}
            className="inline-flex items-center justify-center bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:opacity-90 transition-colors"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
