import { TriangleAlert } from "lucide-react";

/**
 * Satu baris status di panel diagnostik: label tetap di kiri, nilainya di
 * kanan dengan penanda peringatan kalau tidak beres. Dipakai halaman topik
 * guidebook dan halaman daftar korpus.
 */
export function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant w-44 shrink-0">
        {label}
      </span>
      <span className={`flex items-start gap-1.5 ${ok ? "text-on-surface" : "text-error"}`}>
        {!ok && <TriangleAlert size={14} className="mt-1 shrink-0" aria-hidden />}
        {value}
      </span>
    </div>
  );
}
