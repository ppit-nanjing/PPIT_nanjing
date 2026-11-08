export type EventStatusTone = "neutral" | "jade" | "gold" | "alarm";

const TEXT: Record<EventStatusTone, string> = {
  neutral: "text-on-surface-variant",
  jade: "text-primary-container",
  gold: "text-gold-ink",
  alarm: "text-error",
};

const DOT: Record<EventStatusTone, string> = {
  neutral: "bg-outline",
  jade: "bg-primary-container",
  gold: "bg-gold-ink",
  alarm: "bg-error",
};

// Latar opaque karena tanda ini juga menempel di atas foto sampul. `bare` untuk baris
// teks biasa, tempat latarnya justru mengganggu.
export function EventStatusMark({
  label,
  tone,
  bare = false,
  className = "",
}: {
  label: string;
  tone: EventStatusTone;
  bare?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-label-caps uppercase tracking-wide ${
        bare ? "" : "rounded bg-surface-container-lowest px-2 py-1"
      } ${TEXT[tone]} ${className}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
      {label}
    </span>
  );
}
