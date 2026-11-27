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

// Satu baris per kategori tarif (mis. Offline 35 / 100 + bilah, Online 38 terdaftar).
// Tipe ditulis ulang di sini, bukan diimpor dari event-capacity.ts, karena modul itu
// memuat klien database dan komponen ini juga dipakai Client Component.
export function EventCategorySeats({
  categories,
  className = "",
}: {
  categories: { label: string; quota: number | null; registered: number }[];
  className?: string;
}) {
  return (
    <ul className={`flex flex-col gap-2 ${className}`}>
      {categories.map((c) => (
        <li key={c.label} className="flex flex-col gap-1">
          <span className="flex items-baseline justify-between gap-3 text-body-sm tabular-nums">
            <span className="text-on-background">{c.label}</span>
            <span className="text-on-surface-variant">
              {c.quota != null ? `${c.registered} / ${c.quota}` : `${c.registered} terdaftar`}
            </span>
          </span>
          <EventCapacityMeter registered={c.registered} capacity={c.quota} />
        </li>
      ))}
    </ul>
  );
}
