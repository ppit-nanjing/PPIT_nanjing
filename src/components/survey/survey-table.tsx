"use client";

import { openFormInSheets } from "@/app/actions/export-sheets";
import { DataTable } from "@/components/console/data-table";
import type { TableData } from "@/lib/table-view";

// Tabel jawaban formulir kustom: kolom dan baris yang sama persis dengan berkas
// CSV/Excel dan Google Sheet (dirakit surveyTable di src/lib/survey-load.ts), waktu
// dalam jam Tiongkok (CST). Pembungkus klien ini perlu karena onOpenSheets berupa
// fungsi. Aksi server-nya (openFormInSheets) memeriksa hak akses sendiri.
export function SurveyResultsTable({
  table,
  formId,
  sheetsEnabled,
}: {
  table: TableData;
  formId: string;
  sheetsEnabled: boolean;
}) {
  return (
    <DataTable
      label="Jawaban formulir"
      columns={table.columns}
      rows={table.rows}
      canCopy
      onOpenSheets={sheetsEnabled ? () => openFormInSheets(formId) : undefined}
      exportLinks={
        table.rows.length > 0
          ? [
              { label: "CSV", href: `/api/formulir/${formId}/export?format=csv` },
              { label: "Excel", href: `/api/formulir/${formId}/export?format=xlsx` },
            ]
          : []
      }
      emptyText="Belum ada jawaban."
      note="Waktu dalam jam Tiongkok (CST, UTC+8). Isinya sama dengan berkas CSV/Excel dan Google Sheet. Tabel ini hanya untuk dilihat."
    />
  );
}
