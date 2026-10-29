import { google } from "googleapis";
import { formatChinaDateTimeIso } from "@/lib/datetime";

// Google Sheet "langsung" untuk data acara (tombol "Ke Google Sheets" di tabel
// konsol): satu sheet per (acara, jenis data), diperbarui dari website beberapa
// detik setelah datanya berubah. Satu arah: website -> sheet. Edit di sheet tidak
// pernah dibaca balik, dan akan tertimpa pada pembaruan berikutnya.
//
// Memakai izin sebuah AKUN Google biasa (akun organisasi PPIT Nanjing), bukan
// service account: service account berkuota Drive 0 sehingga Google menolak
// semua pembuatan file/Sheet atas namanya (lihat docs/Tampilan Tabel Konsol.md).
// Izinnya OAuth refresh token dengan scope sempit `drive.file`, yaitu hanya
// berkas yang dibuat aplikasi ini. Cara membuat tokennya:
// scripts/google-drive-oauth-token.ts.
//
// Variabel lingkungan:
//   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET  klien OAuth yang sama dengan login Google
//   GOOGLE_DRIVE_REFRESH_TOKEN           token akun pemilik berkas (rahasia)
// Syarat di Google Cloud: Google Sheets API dan Google Drive API aktif di
// project klien OAuth itu, dan consent screen berstatus In production (status
// Testing membuat refresh token kedaluwarsa tiap 7 hari).
//
// Letak berkas di Drive akun itu:
//   PPIT Nanjing - Ekspor Google Sheets / <judul acara> / <sheet>
// Folder acara dicari lewat id acara, bukan nama. Sheet dibagikan sebagai
// PEMBACA ke tiap pengurus yang menekan tombol. Sheet yang tidak berubah dan tidak
// diklik selama INACTIVE_DELETE_MS dihapus permanen (dibersihkan di belakang
// klik berikutnya, tanpa cron), supaya data peserta tidak tinggal selamanya di
// Drive.

export class SheetsNotConfiguredError extends Error {
  constructor() {
    super("Google Sheets belum dikonfigurasi (AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN)");
    this.name = "SheetsNotConfiguredError";
  }
}

/** Refresh token ditolak Google (dicabut, kedaluwarsa, atau consent screen masih Testing). */
export class SheetsAuthExpiredError extends Error {
  constructor() {
    super("Izin Google untuk Sheets sudah tidak berlaku");
    this.name = "SheetsAuthExpiredError";
  }
}

export class SheetsShareError extends Error {
  constructor() {
    super("Sheet tidak bisa dibagikan ke email ini");
    this.name = "SheetsShareError";
  }
}

export type SheetCell = string | number;
// "formulir" = jawaban formulir kustom (kind "survei"). Kuncinya id FORMULIR (bukan id acara):
// mesin di sini hanya butuh id berbentuk UUID, jadi dipakai apa adanya.
export type LiveSheetKind = "pendaftar" | "evaluasi-peserta" | "evaluasi-panitia" | "formulir";
export type SheetData = { eventTitle: string; header: string[]; rows: SheetCell[][] };

export const LIVE_SHEET_KINDS: readonly LiveSheetKind[] = ["pendaftar", "evaluasi-peserta", "evaluasi-panitia", "formulir"];
const KIND_LABEL: Record<LiveSheetKind, string> = {
  pendaftar: "Pendaftar",
  "evaluasi-peserta": "Evaluasi",
  "evaluasi-panitia": "Evaluasi Panitia",
  formulir: "Formulir",
};

// appProperties berkas (hanya terlihat oleh klien OAuth ini).
const EXPORT_MARK_KEY = "ppitExport";
const LIVE_KEY = "ppitLive";
const SYNCED_KEY = "ppitSyncedAt";
const EXPORT_FOLDER_KEY = "ppitExportFolder";
const EVENT_FOLDER_KEY = "ppitExportEvent";
const EXPORT_FOLDER_NAME = "PPIT Nanjing - Ekspor Google Sheets";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const DATA_TAB = "Data";
const INFO_TAB = "Info";
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLEANUP_BATCH = 50;
// Berapa sheet ekspor yang dibaca sekali jalan untuk disaring (jumlahnya jauh di bawah ini).
const CLEANUP_LIST_MAX = 200;

/** Sheet yang tidak berubah dan tidak diklik selama ini dihapus (30 hari). */
export const INACTIVE_DELETE_MS = 30 * 24 * 60 * 60 * 1000;

/** true kalau ketiga variabel lingkungan ada. Tidak menguji apakah tokennya masih berlaku. */
export function isSheetsConfigured(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.GOOGLE_DRIVE_REFRESH_TOKEN);
}

function buildClients() {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) throw new SheetsNotConfiguredError();
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return { drive: google.drive({ version: "v3", auth }), sheets: google.sheets({ version: "v4", auth }) };
}

export type GoogleClients = ReturnType<typeof buildClients>;

let cached: GoogleClients | null = null;
// Id folder induk dan folder per acara, diingat per instance supaya tidak mencari
// di setiap permintaan. Kalau pemiliknya menghapus folder, pembuatan sheet
// mengosongkan ingatan ini dan mengulang sekali.
let rootFolderId: string | null = null;
const eventFolders = new Map<string, { id: string; name: string }>();

function clients(deps?: GoogleClients): GoogleClients {
  if (deps) return deps;
  if (!cached) cached = buildClients();
  return cached;
}

// Google menjawab "invalid_grant" kalau refresh token tidak berlaku lagi.
function isInvalidGrant(err: unknown): boolean {
  const e = err as { message?: string; response?: { data?: { error?: string } } } | null;
  return e?.response?.data?.error === "invalid_grant" || /invalid_grant/i.test(e?.message ?? "");
}

function isNotFound(err: unknown): boolean {
  const e = err as { code?: number | string; response?: { status?: number } } | null;
  return e?.code === 404 || e?.response?.status === 404;
}

function liveTag(eventId: string, kind: LiveSheetKind): string {
  // Disisipkan ke query Drive: hanya id UUID dan jenis dari daftar tertutup.
  if (!UUID_LIKE.test(eventId)) throw new Error("id acara tidak valid");
  if (!LIVE_SHEET_KINDS.includes(kind)) throw new Error("jenis sheet tidak dikenal");
  return `${eventId}:${kind}`;
}

// Nama folder dari judul acara: tanpa karakter kontrol, spasi dirapikan, dan
// dipotong. Hanya label; pencarian memakai id acara.
function folderNameFor(title: string): string {
  const clean = title.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (clean || "Acara tanpa judul").slice(0, 100);
}

async function ensureRootFolder(drive: GoogleClients["drive"]): Promise<string> {
  if (rootFolderId) return rootFolderId;
  const found = await drive.files.list({
    q: `mimeType = '${FOLDER_MIME}' and appProperties has { key='${EXPORT_FOLDER_KEY}' and value='1' } and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });
  let id = found.data.files?.[0]?.id ?? null;
  if (!id) {
    const created = await drive.files.create({
      requestBody: { name: EXPORT_FOLDER_NAME, mimeType: FOLDER_MIME, appProperties: { [EXPORT_FOLDER_KEY]: "1" } },
      fields: "id",
    });
    id = created.data.id ?? null;
  }
  if (!id) throw new Error("Drive tidak mengembalikan id folder ekspor");
  rootFolderId = id;
  return id;
}

async function ensureEventFolder(drive: GoogleClients["drive"], eventId: string, eventTitle: string): Promise<string> {
  if (!UUID_LIKE.test(eventId)) throw new Error("id acara tidak valid");
  const name = folderNameFor(eventTitle);
  const root = await ensureRootFolder(drive);
  const known = eventFolders.get(eventId);
  if (known) {
    // Judul acara berubah sejak ekspor terakhir di instance ini: samakan nama foldernya.
    if (known.name !== name) {
      await drive.files.update({ fileId: known.id, requestBody: { name } });
      known.name = name;
    }
    return known.id;
  }

  const found = await drive.files.list({
    q: `'${root}' in parents and mimeType = '${FOLDER_MIME}' and appProperties has { key='${EVENT_FOLDER_KEY}' and value='${eventId}' } and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
  });
  const existing = found.data.files?.[0];
  let id = existing?.id ?? null;
  if (id && existing?.name !== name) {
    await drive.files.update({ fileId: id, requestBody: { name } });
  }
  if (!id) {
    const created = await drive.files.create({
      requestBody: { name, mimeType: FOLDER_MIME, parents: [root], appProperties: { [EVENT_FOLDER_KEY]: eventId } },
      fields: "id",
    });
    id = created.data.id ?? null;
  }
  if (!id) throw new Error("Drive tidak mengembalikan id folder acara");
  eventFolders.set(eventId, { id, name });
  return id;
}

/** Sheet langsung untuk (acara, jenis), atau null kalau belum pernah dibuat. */
export async function findLiveSheet(
  eventId: string,
  kind: LiveSheetKind,
  deps?: GoogleClients,
): Promise<{ id: string; syncedAt: number } | null> {
  const { drive } = clients(deps);
  const res = await drive.files.list({
    q: `appProperties has { key='${LIVE_KEY}' and value='${liveTag(eventId, kind)}' } and mimeType = '${SHEET_MIME}' and trashed = false`,
    fields: "files(id, appProperties)",
    pageSize: 1,
  });
  const file = res.data.files?.[0];
  if (!file?.id) return null;
  return { id: file.id, syncedAt: Number(file.appProperties?.[SYNCED_KEY] ?? 0) || 0 };
}

async function createSheetFile(
  drive: GoogleClients["drive"],
  input: { title: string; eventId: string; eventTitle: string; tag: string },
): Promise<string> {
  const create = async () => {
    const parent = await ensureEventFolder(drive, input.eventId, input.eventTitle);
    return drive.files.create({
      requestBody: {
        name: input.title.slice(0, 180),
        mimeType: SHEET_MIME,
        parents: [parent],
        appProperties: { [EXPORT_MARK_KEY]: "1", [LIVE_KEY]: input.tag },
        writersCanShare: false,
      },
      fields: "id",
    });
  };
  try {
    let res;
    try {
      res = await create();
    } catch (err) {
      // Folder yang diingat sudah dihapus pemiliknya: lupakan dan cari/buat lagi, sekali saja.
      if (!isNotFound(err)) throw err;
      rootFolderId = null;
      eventFolders.clear();
      res = await create();
    }
    if (!res.data.id) throw new Error("Drive tidak mengembalikan id sheet");
    return res.data.id;
  } catch (err) {
    if (isInvalidGrant(err)) throw new SheetsAuthExpiredError();
    throw err;
  }
}

/** Sheet langsung untuk (acara, jenis): yang sudah ada, atau dibuat baru (kosong, belum dibagikan). */
export async function ensureLiveSheet(
  input: { eventId: string; eventTitle: string; kind: LiveSheetKind },
  deps?: GoogleClients,
): Promise<{ id: string; created: boolean }> {
  const { drive, sheets } = clients(deps);
  const tag = liveTag(input.eventId, input.kind);
  let existing;
  try {
    existing = await findLiveSheet(input.eventId, input.kind, deps);
  } catch (err) {
    if (isInvalidGrant(err)) throw new SheetsAuthExpiredError();
    throw err;
  }
  if (existing) return { id: existing.id, created: false };

  const id = await createSheetFile(drive, {
    title: `PPIT ${KIND_LABEL[input.kind]} - ${input.eventTitle} (langsung)`,
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    tag,
  });
  try {
    // Tab pertama jadi "Data" (dibekukan di baris judul), ditambah tab "Info".
    const meta = await sheets.spreadsheets.get({ spreadsheetId: id, fields: "sheets.properties.sheetId" });
    const sheetId = meta.data.sheets?.[0]?.properties?.sheetId ?? 0;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: { sheetId, title: DATA_TAB, gridProperties: { frozenRowCount: 1 } },
              fields: "title,gridProperties.frozenRowCount",
            },
          },
          { addSheet: { properties: { title: INFO_TAB } } },
        ],
      },
    });
  } catch (err) {
    await drive.files.delete({ fileId: id }).catch(() => undefined);
    throw err;
  }
  return { id, created: true };
}

/**
 * Timpa isi sheet dengan data terbaru. Nilai ditulis RAW: teks yang diawali "="
 * tetap teks (tidak jadi rumus), jadi jawaban peserta tidak bisa menjalankan
 * rumus di sheet pengurus. `firstWrite` memasang format judul (tebal) dan lebar kolom.
 */
export async function writeLiveSheet(
  id: string,
  data: SheetData,
  kind: LiveSheetKind,
  opts: { firstWrite?: boolean } = {},
  deps?: GoogleClients,
): Promise<void> {
  const { sheets } = clients(deps);
  await sheets.spreadsheets.values.clear({ spreadsheetId: id, range: DATA_TAB });
  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: `${DATA_TAB}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [data.header, ...data.rows] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: `${INFO_TAB}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["Diperbarui (jam Tiongkok CST, UTC+8)", formatChinaDateTimeIso(new Date())],
        [kind === "formulir" ? "Formulir" : "Acara", data.eventTitle],
        ["Isi", `${KIND_LABEL[kind]}: ${data.rows.length} baris`],
        [
          "Catatan",
          "Sheet ini diperbarui otomatis dari website PPIT Nanjing beberapa detik setelah datanya berubah. Hanya-baca: perubahan di sini tidak masuk ke website dan akan tertimpa pada pembaruan berikutnya. Untuk menyimpan salinan, pakai File > Buat salinan.",
        ],
      ],
    },
  });
  if (opts.firstWrite) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: id, fields: "sheets.properties(sheetId,title)" });
    const dataSheetId = meta.data.sheets?.find((s) => s.properties?.title === DATA_TAB)?.properties?.sheetId ?? 0;
    const infoSheetId = meta.data.sheets?.find((s) => s.properties?.title === INFO_TAB)?.properties?.sheetId;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId: dataSheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId: dataSheetId, dimension: "COLUMNS", startIndex: 0, endIndex: Math.max(1, data.header.length) },
            },
          },
          ...(infoSheetId != null
            ? [
                {
                  repeatCell: {
                    range: { sheetId: infoSheetId, startColumnIndex: 0, endColumnIndex: 1 },
                    cell: { userEnteredFormat: { textFormat: { bold: true } } },
                    fields: "userEnteredFormat.textFormat.bold",
                  },
                },
              ]
            : []),
        ],
      },
    });
  }
}

/**
 * Hapus sheet langsung untuk (id, jenis) kalau ada. Dipakai saat formulir kustom
 * dihapus: tanpa ini jawabannya (termasuk biodata) tetap terbaca pembaca sheet
 * sampai pembersihan 30 hari. Folder per formulir dibiarkan (kosong, hanya judulnya).
 */
export async function deleteLiveSheet(eventId: string, kind: LiveSheetKind, deps?: GoogleClients): Promise<boolean> {
  const { drive } = clients(deps);
  const live = await findLiveSheet(eventId, kind, deps);
  if (!live) return false;
  await drive.files.delete({ fileId: live.id });
  return true;
}

/**
 * Tandai sheet segar sampai `at`, yaitu SAAT DATA MULAI DIBACA (bukan saat
 * penulisan selesai): perubahan yang masuk setelah itu belum tercakup dan harus
 * tetap memicu pembaruan. Dipakai jalur klik; jalur sinkron menandainya sendiri.
 */
export async function markLiveSheetSynced(id: string, at: number, deps?: GoogleClients): Promise<void> {
  const { drive } = clients(deps);
  await drive.files.update({ fileId: id, requestBody: { appProperties: { [SYNCED_KEY]: String(at) } } });
}

/** Bagikan sheet ke satu email sebagai PEMBACA (tanpa email pemberitahuan). */
export async function shareLiveSheetReader(
  id: string,
  email: string,
  opts: { deleteOnFailure?: boolean } = {},
  deps?: GoogleClients,
): Promise<void> {
  const { drive } = clients(deps);
  try {
    // Sudah punya akses (klik berikutnya, atau pengklik adalah pemilik akun itu
    // sendiri): tidak ada yang perlu dibagikan, dan membagikan ke pemilik malah ditolak Google.
    const existing = await drive.permissions.list({ fileId: id, fields: "permissions(emailAddress)", pageSize: 100 });
    const target = email.trim().toLowerCase();
    if ((existing.data.permissions ?? []).some((p) => p.emailAddress?.toLowerCase() === target)) return;
    await drive.permissions.create({
      fileId: id,
      sendNotificationEmail: false,
      requestBody: { type: "user", role: "reader", emailAddress: email },
    });
  } catch (err) {
    // Sheet baru yang tidak bisa dibuka siapa pun (selain pemilik) hanya sampah.
    if (opts.deleteOnFailure) await drive.files.delete({ fileId: id }).catch(() => undefined);
    // Hanya kode status: pesan Google untuk kegagalan berbagi bisa memuat alamat email pengurus.
    const e = err as { code?: number | string; response?: { status?: number } };
    console.error("[sheets] gagal membagikan sheet, status:", e.response?.status ?? e.code ?? "tidak diketahui");
    throw new SheetsShareError();
  }
}

/**
 * Perbarui sheet langsung (kalau ada) dengan data terbaru. `triggeredAt` adalah
 * saat perubahan data terjadi: kalau sheet sudah diperbarui SETELAH itu (oleh
 * pemicu lain), tidak ada yang perlu dilakukan. Dengan begitu sepuluh perubahan
 * beruntun hanya menghasilkan satu atau dua penulisan, tapi perubahan terakhir
 * selalu ikut tertulis.
 */
export async function syncLiveSheet(
  eventId: string,
  kind: LiveSheetKind,
  triggeredAt: number,
  load: (eventId: string, kind: LiveSheetKind) => Promise<SheetData | null>,
  deps?: GoogleClients,
): Promise<"tidak-ada-sheet" | "sudah-segar" | "tidak-ada-data" | "diperbarui"> {
  const live = await findLiveSheet(eventId, kind, deps);
  if (!live) return "tidak-ada-sheet";
  if (live.syncedAt >= triggeredAt) return "sudah-segar";
  // Klaim dulu, SEBELUM data dibaca: pemicu lain yang berjalan bersamaan melihat
  // tandanya dan mundur, dan semua perubahan yang sudah tersimpan sampai saat ini
  // ikut terbaca di bawah. Perubahan sesudahnya punya pemicu sendiri yang lebih baru.
  await markLiveSheetSynced(live.id, Date.now(), deps);
  try {
    const data = await load(eventId, kind);
    if (!data) {
      await markLiveSheetSynced(live.id, live.syncedAt, deps).catch(() => undefined);
      return "tidak-ada-data";
    }
    await writeLiveSheet(live.id, data, kind, {}, deps);
    return "diperbarui";
  } catch (err) {
    // Gagal: kembalikan tandanya, kalau tidak pemicu lain yang menunggu mengira
    // sheet sudah segar dan sheet basi sampai ada perubahan berikutnya.
    await markLiveSheetSynced(live.id, live.syncedAt, deps).catch(() => undefined);
    throw err;
  }
}

/**
 * Hapus sheet ekspor yang tidak berubah dan tidak diklik selama INACTIVE_DELETE_MS.
 * Dasarnya penanda milik kita sendiri (ppitSyncedAt: diperbarui tiap sinkron dan
 * tiap klik), dengan tanggal pembuatan sebagai cadangan untuk sheet tanpa penanda.
 * BUKAN modifiedTime Drive: diuji, nilainya tidak maju setelah penulisan lewat API.
 * Dipanggil di belakang respons, jadi kegagalannya tidak boleh sampai ke pengguna.
 */
export async function deleteInactiveExportSheets(now = Date.now(), deps?: GoogleClients): Promise<number> {
  const { drive } = clients(deps);
  const cutoff = now - INACTIVE_DELETE_MS;
  const res = await drive.files.list({
    q: `appProperties has { key='${EXPORT_MARK_KEY}' and value='1' } and mimeType = '${SHEET_MIME}' and trashed = false`,
    fields: "files(id, createdTime, appProperties)",
    pageSize: CLEANUP_LIST_MAX,
  });
  const inactive = (res.data.files ?? []).filter((file) => {
    const syncedAt = Number(file.appProperties?.[SYNCED_KEY] ?? 0) || 0;
    const createdAt = file.createdTime ? Date.parse(file.createdTime) : 0;
    return Math.max(syncedAt, createdAt) < cutoff;
  });
  let deleted = 0;
  for (const file of inactive.slice(0, CLEANUP_BATCH)) {
    if (!file.id) continue;
    try {
      await drive.files.delete({ fileId: file.id });
      deleted++;
    } catch (err) {
      console.error("[sheets] gagal menghapus sheet tidak aktif:", (err as Error).message);
    }
  }
  return deleted;
}
