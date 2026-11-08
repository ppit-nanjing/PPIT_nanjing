// Bilah kuota acara. Tanpa kapasitas tidak ada bilah: "tanpa batas" tidak punya rasio
// yang jujur untuk digambar. Angkanya selalu tertulis di dekatnya oleh pemanggil.
export function EventCapacityMeter({
  registered,
  capacity,
  className = "",
}: {
  registered: number;
  capacity: number | null;
  className?: string;
}) {
  if (capacity == null || capacity <= 0) return null;
  const filled = Math.min(registered, capacity);
  return (
    <div
      role="progressbar"
      aria-label="Kuota terisi"
      aria-valuemin={0}
      aria-valuemax={capacity}
      aria-valuenow={filled}
      className={`h-1.5 overflow-hidden rounded-full bg-surface-container-high ${className}`}
    >
      <div className="h-full bg-gold-ink" style={{ width: `${(filled / capacity) * 100}%` }} />
    </div>
  );
}
