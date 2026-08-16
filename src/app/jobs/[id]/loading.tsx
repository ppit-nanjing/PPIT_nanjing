import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default function JobDetailLoading() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <header className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16">
          <div className="max-w-3xl">
            <div className="h-5 w-28 bg-surface-container-low rounded-full animate-pulse mb-6" />
            <div className="h-10 w-3/4 bg-surface-container-low rounded-md animate-pulse mb-3" />
            <div className="h-6 w-40 bg-surface-container-low rounded-md animate-pulse mb-6" />
            <div className="h-4 w-48 bg-surface-container-low rounded-md animate-pulse" />
          </div>
        </div>
      </header>
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 animate-pulse h-64" />
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 animate-pulse h-64" />
        </div>
        <div className="lg:col-span-4">
          <div className="sticky top-24 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 animate-pulse h-72" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
