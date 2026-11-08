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
import { loadSurvey, surveyTable } from "@/lib/survey-load";
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
  // Formulir kustom: `eventId` di sini adalah id FORMULIR. Kolom dan baris sama dengan
  // tabel di layar dan berkas ekspor (waktu jam Tiongkok CST); user_id tidak ikut.
  if (kind === "formulir") {
    const loaded = await loadSurvey(eventId);
    if (!loaded) return null;
    const table = surveyTable(loaded);
    return {
      eventTitle: loaded.form.title,
      header: table.columns.map((c) => c.header),
      rows: table.rows.map((r) => table.columns.map((c) => r.cells[c.key] ?? "")),
    };
  }
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
// digabung. Tiap pembaruan menunggu, lalu hanya menulis kalau belum ada pembaruan
// sesudahnya (lihat syncLiveSheet).
const DEBOUNCE_MS = 3000;

// Pembaruan yang masih MENUNGGU (belum mulai membaca data), per (acara, jenis) di
// instance ini. Pemicu baru selama itu sudah tercakup: pembaruan yang menunggu
// membaca database SESUDAH jedanya. Tanpa ini, form publik (evaluasi, pendaftaran)
// yang dibanjiri menjadwalkan satu panggilan ke Google per kiriman.
type Pending = { started: boolean; triggeredAt: number };
const waiting = new Map<string, Pending>();
const waitingKey = (eventId: string, kind: LiveSheetKind) => `${eventId}:${kind}`;

/**
 * Pesan tempat menunggu untuk tiap jenis yang belum punya pembaruan menunggu.
 * Dipesan SINKRON saat dijadwalkan (bukan di dalam after()), supaya dua pemanggilan
 * berurutan dalam satu tarikan napas tidak sama-sama lolos. Untuk jenis yang sudah
 * ada pembaruan menunggu, waktu pemicunya dimajukan: pembaruan itu akan membaca
 * database sesudah jedanya, jadi perubahan ini tercakup, dan waktunya harus ikut
 * maju supaya tidak dianggap sudah segar oleh pembaruan lain yang terjadi sebelum
 * perubahan ini. Diekspor hanya agar bisa diuji.
 */
export function reservePendingSyncs(
  eventId: string,
  kinds: readonly LiveSheetKind[],
  triggeredAt: number,
): { kind: LiveSheetKind; entry: Pending }[] {
  const reserved: { kind: LiveSheetKind; entry: Pending }[] = [];
  for (const kind of kinds) {
    if (!LIVE_SHEET_KINDS.includes(kind)) continue;
    const key = waitingKey(eventId, kind);
    const pending = waiting.get(key);
    if (pending && !pending.started) {
      pending.triggeredAt = Math.max(pending.triggeredAt, triggeredAt);
      continue;
    }
    const entry: Pending = { started: false, triggeredAt };
    waiting.set(key, entry);
    reserved.push({ kind, entry });
  }
  return reserved;
}

/** Lepas pesanan yang tidak jadi dijalankan, atau yang sudah selesai. */
export function releasePendingSyncs(eventId: string, reserved: readonly { kind: LiveSheetKind; entry: Pending }[]): void {
  for (const { kind, entry } of reserved) {
    const key = waitingKey(eventId, kind);
    if (waiting.get(key) === entry) waiting.delete(key);
  }
}

/**
 * Beri tahu bahwa data acara berubah: kalau ada sheet langsung untuk acara dan
 * jenis ini, perbarui beberapa detik lagi. Dijalankan di belakang respons dan
 * TIDAK PERNAH melempar galat atau menunda pemanggilnya: pendaftaran, check-in,
 * dan evaluasi tidak boleh gagal karena Google lambat atau tidak dikonfigurasi.
 */
export function scheduleLiveSheetSync(eventId: string, kinds: readonly LiveSheetKind[]): void {
  if (!isSheetsConfigured()) return;
  const reserved = reservePendingSyncs(eventId, kinds, Date.now());
  if (reserved.length === 0) return;
  try {
    after(async () => {
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS));
      for (const { kind, entry } of reserved) {
        entry.started = true;
        try {
          await syncLiveSheet(eventId, kind, entry.triggeredAt, loadSheetData);
        } catch (err) {
          // Hanya jenis galat dan kode status: pesan galat bisa memuat data.
          const e = err as { name?: string; code?: number | string; response?: { status?: number } };
          console.error("[live-sheet] pembaruan gagal:", kind, e.response?.status ?? e.code ?? e.name ?? "tidak diketahui");
        } finally {
          releasePendingSyncs(eventId, [{ kind, entry }]);
        }
      }
    });
  } catch {
    // Dipanggil di luar konteks permintaan (skrip, uji): tidak ada yang dijadwalkan.
    releasePendingSyncs(eventId, reserved);
  }
}
