"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import {
  canReadCommitteeEvaluation,
  getEventAccess,
  hasEvaluationExportAccess,
} from "@/lib/event-access";
import { logEventAudit } from "@/lib/event-audit";
import { loadEvaluationExport } from "@/lib/event-evaluation-export";
import { isEvalAudience } from "@/lib/event-evaluation-questions";
import {
  SheetsAuthExpiredError,
  SheetsNotConfiguredError,
  SheetsShareError,
  createExportSheet,
  deleteExpiredExportSheets,
  isSheetsConfigured,
  type SheetCell,
} from "@/lib/google-sheets";
import { formatChinaDateTimeIso } from "@/lib/datetime";
import { exportCellText } from "@/lib/registration-export";
import { loadRegistrationExport } from "@/lib/registration-export-load";
import { getSiteOrigin } from "@/lib/site";
import { datasetToTable } from "@/lib/table-view";
import { UUID_RE } from "@/lib/uuid";

// Tombol "Buka di Google Sheets" di tabel konsol (pendaftar dan evaluasi acara).
// Sheet-nya SALINAN sekali jalan: tidak ada yang membaca balik dari sheet, jadi
// mengubah isinya tidak mengubah data di website, dan data baru tidak muncul di
// sheet yang sudah dibuat. Lihat src/lib/google-sheets.ts untuk umur dan
// kepemilikannya.

export type OpenSheetResult = { ok: true; url: string } | { ok: false; error: string };

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;
// Google Sheets menerima jauh lebih banyak, tapi satu permintaan ekspor
// sebesar ini sudah bukan pekerjaan tabel; arahkan ke unduhan.
const MAX_ROWS = 5000;

const NOT_CONFIGURED = "Google Sheets belum diatur di server. Pakai Salin atau Unduh dulu.";
const AUTH_EXPIRED =
  "Izin Google untuk Sheets sudah tidak berlaku. Minta Divisi Teknologi memperbarui tokennya, atau pakai Salin / Unduh dulu.";
const SHARE_FAILED =
  "Google tidak bisa membagikan sheet ke email akunmu (mungkin bukan akun Google). Pakai Salin atau Unduh dulu.";
const GENERIC_FAILURE = "Gagal membuat Google Sheet. Coba lagi sebentar lagi, atau pakai Salin / Unduh.";

function failure(err: unknown): OpenSheetResult {
  if (err instanceof SheetsNotConfiguredError) return { ok: false, error: NOT_CONFIGURED };
  if (err instanceof SheetsAuthExpiredError) return { ok: false, error: AUTH_EXPIRED };
  if (err instanceof SheetsShareError) return { ok: false, error: SHARE_FAILED };
  // Pesan error Google tidak memuat data peserta, tapi tetap hanya pesannya yang dicatat.
  console.error("[sheets] gagal membuat sheet:", err instanceof Error ? err.message : err);
  return { ok: false, error: GENERIC_FAILURE };
}

// Batas per pengguna dihitung dari jejak audit (bukan memori instance), jadi
// berlaku lintas instance serverless: satu akun tidak bisa menyalakan ratusan
// sheet di akun Google organisasi.
async function tooManyRecent(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.actorUserId, userId),
        eq(auditLogs.action, "export.sheet"),
        gt(auditLogs.createdAt, new Date(Date.now() - WINDOW_MS)),
      ),
    );
  return (row?.n ?? 0) >= MAX_PER_WINDOW;
}

async function publish(input: {
  userId: string;
  email: string;
  eventId: string;
  kind: "pendaftar" | "evaluasi-peserta" | "evaluasi-panitia";
  eventTitle: string;
  header: string[];
  rows: SheetCell[][];
}): Promise<OpenSheetResult> {
  if (input.rows.length > MAX_ROWS) {
    return { ok: false, error: `Datanya ${input.rows.length} baris, terlalu besar untuk tombol ini. Pakai Unduh.` };
  }
  if (await tooManyRecent(input.userId)) {
    return { ok: false, error: "Terlalu sering membuat Google Sheet. Tunggu beberapa menit lalu coba lagi." };
  }
  // Dicatat SEBELUM membuat: percobaan yang gagal pun menghitung ke batas di atas.
  await logEventAudit(input.userId, input.eventId, "export.sheet", {
    after: { kind: input.kind, rows: input.rows.length },
  });

  const label = { pendaftar: "Pendaftar", "evaluasi-peserta": "Evaluasi", "evaluasi-panitia": "Evaluasi Panitia" }[input.kind];
  try {
    const sheet = await createExportSheet({
      title: `PPIT ${label} - ${input.eventTitle} - ${formatChinaDateTimeIso(new Date())} (jam Tiongkok)`,
      header: input.header,
      rows: input.rows,
      shareWithEmail: input.email,
    });
    after(() => deleteExpiredExportSheets().catch(() => undefined));
    return { ok: true, url: sheet.url };
  } catch (err) {
    return failure(err);
  }
}

function sessionEmail(access: Awaited<ReturnType<typeof getEventAccess>>): { userId: string; email: string } | null {
  const user = access.session?.user;
  const email = user?.email?.trim();
  if (!user?.id || !email || !email.includes("@")) return null;
  return { userId: user.id, email };
}

/**
 * Pendaftar acara -> Google Sheet. Gerbangnya sama dengan ekspor CSV (BPH
 * Kabinet, Divisi Teknologi, BPH Panitia acara ini). Kolom paspor, telepon, dan
 * bukti mahasiswa TIDAK ikut.
 */
export async function openRegistrationsInSheets(eventId: string): Promise<OpenSheetResult> {
  if (!UUID_RE.test(eventId)) return { ok: false, error: "Acara tidak ditemukan." };
  const access = await getEventAccess(eventId);
  if (!access.isFullAdmin && !access.isBphPanitia) {
    return { ok: false, error: "Kamu tidak punya akses untuk mengekspor pendaftar acara ini." };
  }
  if (!isSheetsConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const who = sessionEmail(access);
  if (!who) return { ok: false, error: "Akunmu tidak punya email, jadi sheet tidak bisa dibagikan." };

  try {
    const loaded = await loadRegistrationExport(eventId, await getSiteOrigin());
    if (!loaded) return { ok: false, error: "Acara tidak ditemukan." };
    const keep = loaded.data.header.map((h) => !h.sensitive);
    return await publish({
      ...who,
      eventId,
      kind: "pendaftar",
      eventTitle: loaded.eventTitle,
      header: loaded.data.header.filter((_, i) => keep[i]).map((h) => h.label),
      rows: loaded.data.lines.map((line) => line.filter((_, i) => keep[i]).map(exportCellText)),
    });
  } catch (err) {
    return failure(err);
  }
}

/**
 * Respons evaluasi acara -> Google Sheet. Gerbangnya sama dengan ekspor
 * Excel/CSV evaluasi; evaluasi panitia lebih ketat (BPH saja).
 */
export async function openEvaluationInSheets(eventId: string, audience: string): Promise<OpenSheetResult> {
  if (!UUID_RE.test(eventId)) return { ok: false, error: "Acara tidak ditemukan." };
  if (!isEvalAudience(audience)) return { ok: false, error: "Audiens evaluasi tidak dikenal." };
  const access = await getEventAccess(eventId);
  if (!hasEvaluationExportAccess(access) || (audience === "panitia" && !canReadCommitteeEvaluation(access))) {
    return { ok: false, error: "Kamu tidak punya akses untuk mengekspor evaluasi ini." };
  }
  if (!isSheetsConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const who = sessionEmail(access);
  if (!who) return { ok: false, error: "Akunmu tidak punya email, jadi sheet tidak bisa dibagikan." };

  try {
    const loaded = await loadEvaluationExport(eventId, audience);
    if (!loaded) return { ok: false, error: "Acara tidak ditemukan." };
    // Sel dan judul kolom persis seperti di tabel layar dan file ekspor
    // (waktu dalam jam Tiongkok, nama anonim dikosongkan).
    const table = datasetToTable(loaded.dataset);
    return await publish({
      ...who,
      eventId,
      kind: audience === "panitia" ? "evaluasi-panitia" : "evaluasi-peserta",
      eventTitle: loaded.title,
      header: table.columns.map((c) => c.header),
      rows: table.rows.map((r) => table.columns.map((c) => r.cells[c.key] ?? "")),
    });
  } catch (err) {
    return failure(err);
  }
}
