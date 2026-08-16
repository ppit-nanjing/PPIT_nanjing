import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default function JobsLoading() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <header className="max-w-2xl mx-auto px-[var(--spacing-container-padding)] pt-16 pb-10 text-center">
        <div className="h-10 w-72 mx-auto bg-surface-container-low rounded-md animate-pulse" />
        <div className="h-4 w-96 mx-auto mt-4 bg-surface-container-low rounded-md animate-pulse" />
        <div className="h-14 w-full mt-8 bg-surface-container-lowest border border-outline-variant rounded-md animate-pulse" />
      </header>
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-3 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 hidden lg:block">
          <div className="h-5 w-24 bg-surface-container-low rounded-md animate-pulse mb-6" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 w-32 bg-surface-container-low rounded-md animate-pulse" />
            ))}
          </div>
        </aside>
        <div className="lg:col-span-9 flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 animate-pulse">
              <div className="h-4 w-24 bg-surface-container-low rounded-md mb-3" />
              <div className="h-6 w-2/3 bg-surface-container-low rounded-md mb-2" />
              <div className="h-4 w-40 bg-surface-container-low rounded-md" />
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
