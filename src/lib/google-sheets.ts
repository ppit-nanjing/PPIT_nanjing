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
// Letak berkas di Drive akun itu:
//   PPIT Nanjing - Ekspor Google Sheets / <nama acara> / <sheet>
// Satu subfolder per acara (dicari lewat id acara, bukan nama, dan namanya
// disusulkan kalau judul acara berubah). Tiap sheet hanya dibagikan ke satu email
// (pengguna yang menekan tombol), tanpa hak membagikan ulang. TIDAK ada
// penghapusan otomatis: sheet bertahan sampai pemilik akunnya menghapusnya sendiri
// di Drive. (Penulis yang diajak berbagi tidak bisa menghapus berkas milik orang lain.)

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
const EVENT_FOLDER_KEY = "ppitExportEvent";
const EXPORT_FOLDER_NAME = "PPIT Nanjing - Ekspor Google Sheets";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SheetCell = string | number;

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

function clients(): GoogleClients {
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
    // Judul acara berubah sejak ekspor terakhir: samakan nama foldernya.
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

async function createSheetFile(
  drive: GoogleClients["drive"],
  input: { title: string; eventId: string; eventTitle: string },
): Promise<string> {
  const create = async () => {
    const parent = await ensureEventFolder(drive, input.eventId, input.eventTitle);
    return drive.files.create({
      requestBody: {
        name: input.title.slice(0, 180),
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

/**
 * Buat Google Sheet berisi `header` + `rows` di folder acara lalu bagikan ke
 * `shareWithEmail`. Nilai ditulis RAW: teks yang diawali "=" tetap teks (tidak
 * jadi rumus), jadi jawaban peserta tidak bisa menjalankan rumus di sheet pengurus.
 * `deps` hanya untuk uji; produksi memakai klien dari variabel lingkungan.
 */
export async function createExportSheet(
  input: {
    title: string;
    eventId: string;
    eventTitle: string;
    header: string[];
    rows: SheetCell[][];
    shareWithEmail: string;
  },
  deps?: GoogleClients,
): Promise<{ id: string; url: string }> {
  const { drive, sheets } = deps ?? clients();
  const id = await createSheetFile(drive, input);

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
