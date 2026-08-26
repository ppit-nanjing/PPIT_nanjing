import { Readable } from "node:stream";
import { google } from "googleapis";

// Typed so callers (console/documents) can distinguish "env vars missing"
// from any other Drive failure without string-matching Indonesian messages.
export class DriveNotConfiguredError extends Error {
  constructor() {
    super("Google Drive belum dikonfigurasi (GOOGLE_DRIVE_SA_JSON / GOOGLE_DRIVE_ROOT_FOLDER_ID)");
    this.name = "DriveNotConfiguredError";
  }
}

// Service-account Drive client. Semua operasi file PPIT dilakukan server-side
// lewat credential ini; akses per-divisi/periode di-enforce di level aplikasi
// (lihat src/lib/drive-access.ts), bukan di Google.
let cached: ReturnType<typeof buildClient> | null = null;

function buildClient() {
  const saJson = process.env.GOOGLE_DRIVE_SA_JSON;
  const root = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!saJson || !root) {
    throw new DriveNotConfiguredError();
  }
  const credentials = JSON.parse(saJson) as Record<string, unknown>;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  const drive = google.drive({ version: "v3", auth });
  return { drive, root };
}

export function getDrive() {
  if (!cached) cached = buildClient();
  return cached;
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string | null;
  parents?: string[] | null;
  // Drive returns size as a decimal string (and omits it entirely for
  // Google-Docs-type files that have no fixed byte size).
  size?: string | null;
  modifiedTime?: string | null;
};

export async function listFolder(folderId: string): Promise<DriveFile[]> {
  const { drive } = getDrive();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink, parents, size, modifiedTime)",
    orderBy: "folder, name",
  });
  return (res.data.files ?? []) as DriveFile[];
}

export async function createFolder(name: string, parentId: string): Promise<DriveFile> {
  const { drive } = getDrive();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id, name, mimeType, webViewLink",
  });
  return res.data as DriveFile;
}

export async function uploadFile(
  name: string,
  parentId: string,
  data: Buffer | Uint8Array,
  mimeType: string,
): Promise<DriveFile> {
  const { drive } = getDrive();
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId] },
    // googleapis' media uploader pipes the body - in bundled serverless
    // environments a plain Buffer has no .pipe(), so hand it a Node stream
    // (this was the production "body.pipe is not a function" crash).
    media: { mimeType, body: Readable.from(Buffer.from(data)) },
    fields: "id, name, mimeType, webViewLink",
  });
  return res.data as DriveFile;
}

export async function renameFile(fileId: string, name: string): Promise<void> {
  const { drive } = getDrive();
  await drive.files.update({ fileId, requestBody: { name } });
}

export async function trashFile(fileId: string): Promise<void> {
  const { drive } = getDrive();
  await drive.files.update({ fileId, requestBody: { trashed: true } });
}

// Used by rename/trash actions to verify a client-supplied fileId actually
// lives inside the folder the caller was authorized to write to, by the
// console breadcrumb for the real folder name, and to look up the webViewLink
// so a trashed file's short link can be deactivated.
export async function getFileMeta(
  fileId: string,
): Promise<{ name?: string; parents: string[]; webViewLink: string | null }> {
  const { drive } = getDrive();
  const res = await drive.files.get({ fileId, fields: "name, parents, webViewLink" });
  return {
    name: res.data.name ?? undefined,
    parents: res.data.parents ?? [],
    webViewLink: res.data.webViewLink ?? null,
  };
}

// Make the file openable by anyone with the link (read-only) so the short link
// works for recipients without Google auth.
export async function setLinkViewer(fileId: string): Promise<string> {
  const { drive } = getDrive();
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone", allowFileDiscovery: false },
  });
  const res = await drive.files.get({ fileId, fields: "webViewLink" });
  return res.data.webViewLink ?? "";
}
