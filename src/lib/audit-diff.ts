// Ringkas entri audit_logs jadi satu baris "field yang berubah: a, b, c".
// Dipakai di halaman detail & log sensus. Aman dipakai di client & server.

const IGNORE = new Set(["updatedAt", "id"]);

export function changedFields(
  before: unknown,
  after: unknown,
): string[] {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const out: string[] = [];
  for (const k of keys) {
    if (IGNORE.has(k)) continue;
    if (JSON.stringify(b[k] ?? null) !== JSON.stringify(a[k] ?? null)) out.push(k);
  }
  return out;
}

export function summarizeAuditChange(action: string, before: unknown, after: unknown): string {
  if (action === "deleted") return "baris dihapus";
  if (action === "created") return "baris dibuat";
  const fields = changedFields(before, after);
  if (fields.length === 0) return "tidak ada perubahan field";
  return `field berubah: ${fields.join(", ")}`;
}
