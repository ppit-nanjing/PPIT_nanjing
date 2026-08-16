export default function AlbumLoading() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <div className="h-16 border-b border-outline-variant" />
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16">
        <div className="inline-flex items-center gap-1.5 h-5 w-40 rounded bg-surface-container-low animate-pulse mb-8" />
        <div className="h-12 w-2/3 rounded-lg bg-surface-container-low animate-pulse" />
        <div className="h-4 w-24 mt-4 rounded bg-surface-container-low animate-pulse mb-10" />

        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <li key={i} className="list-none aspect-square rounded-lg bg-surface-container-low animate-pulse" />
          ))}
        </ul>
      </main>
    </div>
  );
}
