export default function ConsoleLoading() {
  // Skeleton mirrors the standard console page rhythm (title + stacked
  // sections) so the swap to real content doesn't jump.
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 animate-pulse" aria-busy="true" aria-label="Memuat">
      <div className="h-8 w-64 bg-surface-container-low rounded-md mb-8" />
      <div className="flex flex-col gap-4">
        <div className="h-24 w-full bg-surface-container-low rounded-xl" />
        <div className="h-40 w-full bg-surface-container-low rounded-xl" />
        <div className="h-40 w-full bg-surface-container-low rounded-xl" />
      </div>
    </div>
  );
}
