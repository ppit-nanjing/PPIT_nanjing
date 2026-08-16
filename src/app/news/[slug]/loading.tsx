import { ArrowLeft } from "lucide-react";

export default function NewsDetailLoading() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <div className="h-16 border-b border-outline-variant" />
      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <div className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant mb-8">
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke Berita
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="h-4 w-40 bg-surface-container-low rounded-md animate-pulse" />
          <div className="h-4 w-28 bg-surface-container-low rounded-md animate-pulse" />
        </div>

        <div className="h-10 w-4/5 bg-surface-container-low rounded-md animate-pulse mb-8" />
        <div className="h-10 w-2/3 bg-surface-container-low rounded-md animate-pulse mb-10" />

        <div className="w-full h-64 bg-surface-container-low rounded-xl animate-pulse mb-10" />

        <div className="flex items-center justify-between gap-4 mb-10 pb-6 border-b border-outline-variant">
          <div className="h-4 w-32 bg-surface-container-low rounded-md animate-pulse" />
          <div className="h-9 w-36 bg-surface-container-low rounded-md animate-pulse" />
        </div>

        <div className="flex flex-col gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-surface-container-low rounded-md animate-pulse"
              style={{ width: `${90 - (i % 3) * 12}%` }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
