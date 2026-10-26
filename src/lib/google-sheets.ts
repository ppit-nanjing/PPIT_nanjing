import { google } from "googleapis";

// Membuat Google Sheet dari data ekspor (tombol "Ke Google Sheets" di tabel
// konsol).
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
// Sheet dimiliki akun itu dan dikumpulkan dalam satu folder khusus
// (EXPORT_FOLDER_NAME). Tiap sheet hanya dibagikan ke satu email (pengguna yang
// menekan tombol), tanpa hak membagikan ulang. TIDAK ada penghapusan otomatis:
// sheet bertahan sampai pemilik akunnya menghapusnya sendiri di Drive. (Penulis
// yang diajak berbagi tidak bisa menghapus berkas milik orang lain.)

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

// Tanda di appProperties: memudahkan mencari berkas buatan aplikasi ini.
const EXPORT_MARK_KEY = "ppitExport";
const EXPORT_FOLDER_KEY = "ppitExportFolder";
const EXPORT_FOLDER_NAME = "PPIT Nanjing - Ekspor Google Sheets";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export type SheetCell = string | number;

/** true kalau ketiga variabel lingkungan ada. Tidak menguji apakah tokennya masih berlaku. */
export function isSheetsConfigured(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.GOOGLE_DRIVE_REFRESH_TOKEN);
}

let cached: ReturnType<typeof buildClients> | null = null;
// Id folder ekspor, disimpan per instance supaya tidak mencari folder di setiap
// permintaan. Kalau folder dihapus pemiliknya, pembuatan sheet mengulang sekali.
let exportFolderId: string | null = null;

function buildClients() {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) throw new SheetsNotConfiguredError();
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return { drive: google.drive({ version: "v3", auth }), sheets: google.sheets({ version: "v4", auth }) };
}

function clients() {
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

async function ensureExportFolder(drive: ReturnType<typeof buildClients>["drive"]): Promise<string> {
  if (exportFolderId) return exportFolderId;
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
  exportFolderId = id;
  return id;
}

async function createSheetFile(title: string): Promise<string> {
  const { drive } = clients();
  const create = async () => {
    const parent = await ensureExportFolder(drive);
    return drive.files.create({
      requestBody: {
        name: title.slice(0, 180),
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [parent],
        appProperties: { [EXPORT_MARK_KEY]: "1" },
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
      // Folder yang diingat sudah dihapus pemiliknya: cari/buat lagi, sekali saja.
      if (!exportFolderId || !isNotFound(err)) throw err;
      exportFolderId = null;
      res = await create();
    }
    if (!res.data.id) throw new Error("Drive tidak mengembalikan id sheet");
    return res.data.id;
  } catch (err) {
    if (isInvalidGrant(err)) throw new SheetsAuthExpiredError();
    throw err;
  }
}

/**
 * Buat Google Sheet berisi `header` + `rows` lalu bagikan ke `shareWithEmail`.
 * Nilai ditulis RAW: teks yang diawali "=" tetap teks (tidak jadi rumus), jadi
 * jawaban peserta tidak bisa menjalankan rumus di sheet pengurus.
 */
export async function createExportSheet(input: {
  title: string;
  header: string[];
  rows: SheetCell[][];
  shareWithEmail: string;
}): Promise<{ id: string; url: string }> {
  const { drive, sheets } = clients();
  const id = await createSheetFile(input.title);

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: "A1",
      valueInputOption: "RAW",
      requestBody: { values: [input.header, ...input.rows] },
    });

    const meta = await sheets.spreadsheets.get({ spreadsheetId: id, fields: "sheets.properties.sheetId" });
    const sheetId = meta.data.sheets?.[0]?.properties?.sheetId ?? 0;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: input.header.length },
            },
          },
        ],
      },
    });
  } catch (err) {
    // Sheet setengah jadi yang tidak pernah dibagikan hanya sampah: buang lagi.
    await drive.files.delete({ fileId: id }).catch(() => undefined);
    throw err;
  }

  try {
    await drive.permissions.create({
      fileId: id,
      sendNotificationEmail: false,
      requestBody: { type: "user", role: "writer", emailAddress: input.shareWithEmail },
    });
  } catch (err) {
    // Sheet yang tidak bisa dibuka siapa pun (selain pemilik) hanya sampah: buang lagi.
    await drive.files.delete({ fileId: id }).catch(() => undefined);
    console.error("[sheets] gagal membagikan sheet:", (err as Error).message);
    throw new SheetsShareError();
  }

  return { id, url: `https://docs.google.com/spreadsheets/d/${id}/edit` };
}
