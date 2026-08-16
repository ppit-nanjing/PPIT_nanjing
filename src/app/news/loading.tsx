import { Newspaper } from "lucide-react";

export default function NewsLoading() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <div className="h-16 border-b border-outline-variant" />
      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-outline-variant">
        <div className="max-w-2xl w-full">
          <div className="h-12 w-48 bg-surface-container-low rounded-md animate-pulse" />
          <div className="h-5 w-full max-w-md bg-surface-container-low rounded-md mt-4 animate-pulse" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-surface-container-low rounded-full animate-pulse" />
          ))}
        </div>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 pt-12 flex flex-col gap-16">
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="relative h-64 lg:h-auto bg-surface-container-low flex items-center justify-center">
              <Newspaper className="text-outline-variant/40" size={40} aria-hidden="true" />
            </div>
            <div className="p-8 lg:p-10 flex flex-col justify-center gap-4">
              <div className="h-5 w-24 bg-surface-container-low rounded-md animate-pulse" />
              <div className="h-8 w-3/4 bg-surface-container-low rounded-md animate-pulse" />
              <div className="h-4 w-full bg-surface-container-low rounded-md animate-pulse" />
              <div className="h-4 w-5/6 bg-surface-container-low rounded-md animate-pulse" />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-8">
          <div className="h-8 w-56 bg-surface-container-low rounded-md animate-pulse border-b border-outline-variant pb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"
              >
                <div className="h-48 bg-surface-container-low animate-pulse" />
                <div className="p-6 flex flex-col gap-3">
                  <div className="h-4 w-1/3 bg-surface-container-low rounded-md animate-pulse" />
                  <div className="h-6 w-3/4 bg-surface-container-low rounded-md animate-pulse" />
                  <div className="h-4 w-full bg-surface-container-low rounded-md animate-pulse" />
                  <div className="h-4 w-2/3 bg-surface-container-low rounded-md animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
