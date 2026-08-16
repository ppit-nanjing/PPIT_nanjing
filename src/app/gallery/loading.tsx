import { Images, Archive } from "lucide-react";
import Link from "next/link";

export default function GalleryLoading() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <div className="h-16 border-b border-outline-variant" />
      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-8">
        <div className="h-12 w-48 rounded-lg bg-surface-container-low animate-pulse" />
        <div className="h-4 w-72 mt-4 rounded bg-surface-container-low animate-pulse" />
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="list-none bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              <div className="h-52 bg-surface-container-low animate-pulse" />
              <div className="p-5">
                <div className="h-5 w-3/4 rounded bg-surface-container-low animate-pulse" />
                <div className="h-3 w-16 mt-3 rounded bg-surface-container-low animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
