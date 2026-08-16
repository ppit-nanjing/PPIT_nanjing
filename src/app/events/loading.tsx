import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

function CardSkeleton() {
  return (
    <div className="h-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="h-44 bg-surface-container-low animate-pulse motion-reduce:animate-none" />
      <div className="p-6 flex flex-col gap-3">
        <div className="h-3 w-20 rounded bg-surface-container-low animate-pulse motion-reduce:animate-none" />
        <div className="h-5 w-3/4 rounded bg-surface-container-low animate-pulse motion-reduce:animate-none" />
        <div className="h-3 w-1/2 rounded bg-surface-container-low animate-pulse motion-reduce:animate-none mt-2" />
      </div>
    </div>
  );
}

export default function EventsLoading() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-8 border-b border-outline-variant">
        <div className="h-12 w-64 rounded bg-surface-container-low animate-pulse motion-reduce:animate-none" />
        <div className="h-5 w-80 max-w-full rounded bg-surface-container-low animate-pulse motion-reduce:animate-none mt-4" />
      </header>
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 pt-12 flex flex-col gap-16">
        <div className="h-72 w-full rounded-xl bg-surface-container-lowest border border-outline-variant animate-pulse motion-reduce:animate-none" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
