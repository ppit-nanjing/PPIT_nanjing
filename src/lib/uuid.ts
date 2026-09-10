// Bentuk UUID v4 kanonik. Dipakai untuk menyaring nilai FormData / query sebelum
// dipakai di `eq(col, value)` — Postgres melempar error sintaks (bukan 0 baris)
// untuk teks yang bukan UUID, yang bisa menggagalkan seluruh aksi.
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
