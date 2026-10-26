import { after } from "next/server";
import { loadEvaluationExport } from "@/lib/event-evaluation-export";
import {
  LIVE_SHEET_KINDS,
  isSheetsConfigured,
  syncLiveSheet,
  type LiveSheetKind,
  type SheetData,
} from "@/lib/google-sheets";
import { exportCellText } from "@/lib/registration-export";
import { loadRegistrationExport } from "@/lib/registration-export-load";
import { getSiteUrl } from "@/lib/site-url";
import { datasetToTable } from "@/lib/table-view";

// Sisi database dari sheet langsung (mesin Google-nya ada di google-sheets.ts):
// membangun isi sheet dari database dan menjadwalkan pembaruannya.

// Alamat situs untuk menjadikan path unggahan (/api/...) tautan penuh di sheet.
// Pembaruan jalan di luar permintaan, jadi tidak ada header untuk dibaca:
// alamat kanonis dari konfigurasi, atau alamat produksi Vercel.
function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || getSiteUrl()).replace(/\/$/, "");
}

/**
 * Isi sheet untuk (acara, jenis): sama dengan file ekspor dan tabel di layar,
 * kecuali kolom paspor, telepon, dan bukti mahasiswa yang TIDAK ikut. null =
 * acara tidak ada.
 */
export async function loadSheetData(eventId: string, kind: LiveSheetKind): Promise<SheetData | null> {
  if (kind === "pendaftar") {
    const loaded = await loadRegistrationExport(eventId, siteOrigin());
    if (!loaded) return null;
    const keep = loaded.data.header.map((h) => !h.sensitive);
    return {
      eventTitle: loaded.eventTitle,
      header: loaded.data.header.filter((_, i) => keep[i]).map((h) => h.label),
      rows: loaded.data.lines.map((line) => line.filter((_, i) => keep[i]).map(exportCellText)),
    };
  }
  const loaded = await loadEvaluationExport(eventId, kind === "evaluasi-panitia" ? "panitia" : "peserta");
  if (!loaded) return null;
  // Sel dan judul kolom persis seperti di tabel layar dan file ekspor
  // (waktu dalam jam Tiongkok, nama anonim dikosongkan).
  const table = datasetToTable(loaded.dataset);
  return {
    eventTitle: loaded.title,
    header: table.columns.map((c) => c.header),
    rows: table.rows.map((r) => table.columns.map((c) => r.cells[c.key] ?? "")),
  };
}

// Jeda sebelum menulis: perubahan beruntun (mis. seratus pendaftar dalam semenit)
// digabung. Tiap pemicu menunggu, lalu hanya menulis kalau belum ada pembaruan
// sesudahnya (lihat syncLiveSheet).
const DEBOUNCE_MS = 3000;

/**
 * Beri tahu bahwa data acara berubah: kalau ada sheet langsung untuk acara dan
 * jenis ini, perbarui beberapa detik lagi. Dijalankan di belakang respons dan
 * TIDAK PERNAH melempar galat atau menunda pemanggilnya: pendaftaran, check-in,
 * dan evaluasi tidak boleh gagal karena Google lambat atau tidak dikonfigurasi.
 */
export function scheduleLiveSheetSync(eventId: string, kinds: readonly LiveSheetKind[]): void {
  if (!isSheetsConfigured()) return;
  const triggeredAt = Date.now();
  try {
    after(async () => {
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS));
      for (const kind of kinds) {
        if (!LIVE_SHEET_KINDS.includes(kind)) continue;
        try {
          await syncLiveSheet(eventId, kind, triggeredAt, loadSheetData);
        } catch (err) {
          const e = err as { code?: number | string; response?: { status?: number } };
          console.error("[live-sheet] pembaruan gagal:", kind, e.response?.status ?? e.code ?? (err as Error).message);
        }
      }
    });
  } catch {
    // Dipanggil di luar konteks permintaan (skrip, uji): tidak ada yang dijadwalkan.
  }
}
