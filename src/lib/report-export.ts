import ExcelJS from "exceljs";

export type ReportColumn = {
  header: string;
  key: string;
  type?: "string" | "date" | "number";
};

export type ReportDataset = {
  title: string;
  type: string;
  generatedAt: Date;
  filters: Record<string, string | null | undefined>;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
};

const idDateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function rawValue(col: ReportColumn, row: Record<string, unknown>): string | number | Date | null {
  const v = row[col.key];
  if (v == null) return "";
  if (v instanceof Date) return v;
  if (typeof v === "number") return v;
  return String(v);
}

// ---------- CSV ----------
// BOM + CRLF so Excel (especially on Windows / id-ID locale) opens UTF-8
// Indonesian text (é, ü, ç, ") correctly instead of mojibake.
export function datasetToCsv(ds: ReportDataset): string {
  const esc = (v: unknown): string => {
    let s = v == null ? "" : String(v);
    // Neutralize CSV/formula injection (cells starting with = + - @).
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cell = (col: ReportColumn, row: Record<string, unknown>) => {
    const v = rawValue(col, row);
    if (v instanceof Date) return esc(idDateTime.format(v));
    return esc(v);
  };
  const header = ds.columns.map((c) => esc(c.header)).join(",");
  const lines = ds.rows.map((r) => ds.columns.map((c) => cell(c, r)).join(","));
  return "﻿" + [header, ...lines].join("\r\n");
}

// ---------- XLSX ----------
export async function datasetToXlsx(ds: ReportDataset): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PPIT Nanjing";
  wb.created = ds.generatedAt;
  wb.modified = ds.generatedAt;

  const ws = wb.addWorksheet(ds.title.slice(0, 31));

  const filterText = Object.entries(ds.filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("   •   ");

  ws.getCell("A1").value = ds.title;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A2").value = `Dicetak: ${idDateTime.format(ds.generatedAt)}`;
  ws.getCell("A2").font = { italic: true, color: { argb: "FF6B5849" } };
  if (filterText) {
    ws.getCell("A3").value = `Filter: ${filterText}`;
    ws.getCell("A3").font = { italic: true, color: { argb: "FF6B5849" } };
  }
  const headerRowIdx = filterText ? 5 : 4;

  const headerRow = ws.getRow(headerRowIdx);
  ds.columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7A2E2A" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: "FF271715" } } };
  });
  headerRow.height = 22;

  ds.rows.forEach((r, ri) => {
    const row = ws.getRow(headerRowIdx + 1 + ri);
    ds.columns.forEach((c, i) => {
      const val = rawValue(c, r);
      const cell = row.getCell(i + 1);
      if (val instanceof Date) {
        cell.value = val;
        cell.numFmt = "dd/mm/yyyy hh:mm";
      } else if (typeof val === "number") {
        cell.value = val;
      } else {
        cell.value = val === "" ? null : val;
      }
    });
  });

  // Auto-fit column widths from header + content.
  ds.columns.forEach((c, i) => {
    let max = c.header.length;
    ds.rows.forEach((r) => {
      const v = rawValue(c, r);
      const len = v instanceof Date ? 16 : String(v ?? "").length;
      if (len > max) max = len;
    });
    ws.getColumn(i + 1).width = Math.min(Math.max(max + 2, 10), 60);
  });

  // Freeze the header row so it stays visible while scrolling.
  ws.views = [{ state: "frozen", ySplit: headerRowIdx }];

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}
