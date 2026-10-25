// Bentuk data untuk tampilan tabel di konsol (src/components/console/data-table.tsx).
// Sengaja murni dan aman dipakai di sisi klien: tidak memuat exceljs maupun database.
//
// Tabel hanya memuat apa yang SUDAH boleh dilihat pembacanya. Penjagaan akses
// ada di pemanggil (halaman server yang membuat props-nya); `sensitive` di sini
// hanya soal kenyamanan (kolom data pribadi tersembunyi sampai dipilih), bukan
// kontrol akses.
import { formatChinaDateTimeIso, timeHeader } from "@/lib/datetime";

export type TableColumn = {
  key: string;
  header: string;
  kind: "text" | "number" | "date";
  /** Kolom data pribadi (paspor, telepon, tautan bukti): tersembunyi sampai pembaca menampilkannya. */
  sensitive?: boolean;
  /** Teks panjang (komentar, jawaban): dipotong dua baris sampai "Teks penuh" dinyalakan. */
  long?: boolean;
};

export type TableCell = string | number | null;
export type TableRow = { id: string; cells: Record<string, TableCell> };
export type TableData = { columns: TableColumn[]; rows: TableRow[] };

/** Bentuk kolom/baris yang sama dengan ReportDataset di report-export.ts (ekspor Excel/CSV). */
type DatasetColumn = { header: string; key: string; type?: "string" | "date" | "number" };
type DatasetLike = { columns: DatasetColumn[]; rows: Record<string, unknown>[] };

const LONG_TEXT_CHARS = 60;

function cellOf(value: unknown, kind: TableColumn["kind"]): TableCell {
  if (value == null || value === "") return kind === "number" ? null : "";
  if (value instanceof Date) return formatChinaDateTimeIso(value);
  if (kind === "date") {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : formatChinaDateTimeIso(d);
  }
  if (typeof value === "number") return value;
  return String(value);
}

/**
 * Dataset ekspor -> tabel. Kolom dan baris yang sama dengan file Excel/CSV,
 * dengan kolom waktu ditulis dalam jam Tiongkok dan berlabel zona.
 */
export function datasetToTable(ds: DatasetLike, opts: { sensitiveKeys?: readonly string[] } = {}): TableData {
  const sensitive = new Set(opts.sensitiveKeys ?? []);
  const columns: TableColumn[] = ds.columns.map((c) => {
    const kind: TableColumn["kind"] = c.type === "date" ? "date" : c.type === "number" ? "number" : "text";
    return {
      key: c.key,
      header: kind === "date" ? timeHeader(c.header) : c.header,
      kind,
      ...(sensitive.has(c.key) ? { sensitive: true } : {}),
    };
  });
  const rows: TableRow[] = ds.rows.map((r, i) => ({
    id: String(i),
    cells: Object.fromEntries(columns.map((c) => [c.key, cellOf(r[c.key], c.kind)])),
  }));
  return { columns: markLongColumns(columns, rows), rows };
}

/** Tandai kolom teks yang isinya panjang (dipakai pemanggil yang merakit TableData sendiri). */
export function markLongColumns(columns: TableColumn[], rows: TableRow[]): TableColumn[] {
  return columns.map((c) =>
    c.kind === "text" && rows.some((r) => String(r.cells[c.key] ?? "").length > LONG_TEXT_CHARS) ? { ...c, long: true } : c,
  );
}
