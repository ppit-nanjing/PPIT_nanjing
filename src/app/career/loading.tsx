import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default function CareerLoading() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <header className="max-w-2xl mx-auto px-[var(--spacing-container-padding)] pt-16 pb-10 text-center">
        <div className="h-10 w-72 mx-auto bg-surface-container-low rounded-md animate-pulse" />
        <div className="h-4 w-96 mx-auto mt-4 bg-surface-container-low rounded-md animate-pulse" />
      </header>
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 flex flex-col gap-16">
        <section>
          <div className="h-6 w-48 bg-surface-container-low rounded-md animate-pulse mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 animate-pulse h-44" />
            ))}
          </div>
        </section>
        <section>
          <div className="h-6 w-56 bg-surface-container-low rounded-md animate-pulse mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 animate-pulse h-32" />
            ))}
          </div>
        </section>
        <div className="bg-primary-container/5 border border-primary-container/20 rounded-xl p-8 animate-pulse h-32" />
      </main>
      <SiteFooter />
    </div>
  );
}
