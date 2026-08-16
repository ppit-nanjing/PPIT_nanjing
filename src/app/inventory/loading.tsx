import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default function InventoryLoading() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <div className="animate-pulse motion-reduce:animate-none flex flex-col gap-4">
          <div className="h-12 w-2/3 max-w-lg bg-surface-container-low rounded-md" />
          <div className="h-5 w-full max-w-xl bg-surface-container-low rounded-md" />
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="h-10 w-56 bg-surface-container-low rounded-md" />
            <div className="h-10 w-44 bg-surface-container-low rounded-md" />
          </div>
          <div className="h-14 w-full max-w-xl bg-surface-container-low rounded-md mt-2" />
          <div className="flex flex-wrap gap-2 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-24 bg-surface-container-low rounded-full" />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        <p className="sr-only" role="status" aria-live="polite">
          Memuat daftar barang inventaris
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse motion-reduce:animate-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col"
            >
              <div className="h-40 bg-surface-container-low" />
              <div className="p-5 flex flex-col gap-3">
                <div className="h-3 w-20 bg-surface-container-low rounded" />
                <div className="h-4 w-3/4 bg-surface-container-low rounded" />
                <div className="h-3 w-full bg-surface-container-low rounded" />
                <div className="h-3 w-32 bg-surface-container-low rounded" />
                <div className="h-9 w-full bg-surface-container-low rounded-md mt-2" />
              </div>
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
