/**
 * Ambil refresh token Google untuk fitur "Ke Google Sheets" (dan nanti modul Dokumen).
 * Dijalankan SEKALI, oleh manusia, di komputer sendiri:
 *
 *   npx tsx --env-file=.env scripts/google-drive-oauth-token.ts
 *   npx tsx --env-file=.env scripts/google-drive-oauth-token.ts --write-env
 *
 * Langkah:
 *  1. Skrip mencetak sebuah alamat Google. Buka di browser, MASUK SEBAGAI AKUN
 *     ORGANISASI yang akan memiliki berkasnya (bukan akun pribadi), lalu setujui.
 *     Izin yang diminta hanya `drive.file`: berkas yang dibuat aplikasi ini.
 *  2. Google mengarahkan kembali ke localhost; skrip menangkap kodenya dan menukar
 *     jadi refresh token.
 *  3. Tanpa --write-env: token dicetak di terminal ini saja; tempel ke Vercel
 *     sebagai GOOGLE_DRIVE_REFRESH_TOKEN. Dengan --write-env: token ditulis ke
 *     .env lokal (berkas ini di-gitignore) dan TIDAK dicetak, jadi tidak tampil
 *     di layar/riwayat. Vercel tetap diisi manual lewat dashboard.
 *
 * Syarat di Google Cloud (project klien OAuth AUTH_GOOGLE_ID):
 *  - Google Sheets API dan Google Drive API aktif.
 *  - Klien OAuth "Web application" punya Authorized redirect URI:
 *      http://localhost:53682/oauth2callback
 *  - OAuth consent screen berstatus In production. Kalau Testing, token
 *    kedaluwarsa tiap 7 hari. `drive.file` bukan scope sensitif, jadi tidak
 *    perlu verifikasi.
 *
 * Token ini kredensial jangka panjang ke Drive akun itu (terbatas pada berkas
 * buatan aplikasi). Jangan ditempel di chat, tiket, atau commit.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { google } from "googleapis";

const PORT = 53682;
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const writeEnv = process.argv.includes("--write-env");

const clientId = process.env.AUTH_GOOGLE_ID;
const clientSecret = process.env.AUTH_GOOGLE_SECRET;
if (!clientId || !clientSecret) {
  console.error("AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET tidak ada. Jalankan dengan --env-file=.env.");
  process.exit(1);
}

const oauth = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);
const state = randomBytes(16).toString("hex");
const url = oauth.generateAuthUrl({
  access_type: "offline",
  // prompt=consent memaksa Google mengeluarkan refresh token baru walau akun ini pernah menyetujui.
  prompt: "consent",
  scope: SCOPES,
  state,
});

function saveToken(token: string) {
  const line = `GOOGLE_DRIVE_REFRESH_TOKEN=${token}`;
  if (!existsSync(".env")) {
    writeFileSync(".env", line + "\n");
    return;
  }
  const current = readFileSync(".env", "utf8");
  if (/^GOOGLE_DRIVE_REFRESH_TOKEN=/m.test(current)) {
    writeFileSync(".env", current.replace(/^GOOGLE_DRIVE_REFRESH_TOKEN=.*$/m, line));
  } else {
    appendFileSync(".env", (current.endsWith("\n") ? "" : "\n") + line + "\n");
  }
}

const server = createServer(async (req, res) => {
  const reqUrl = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (reqUrl.pathname !== "/oauth2callback") {
    res.writeHead(404).end();
    return;
  }
  try {
    if (reqUrl.searchParams.get("state") !== state) throw new Error("state tidak cocok (permintaan bukan dari skrip ini)");
    const error = reqUrl.searchParams.get("error");
    if (error) throw new Error(`Google menolak: ${error}`);
    const code = reqUrl.searchParams.get("code");
    if (!code) throw new Error("kode tidak ada di alamat balik");

    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "Google tidak memberi refresh token. Cabut izin aplikasi ini di https://myaccount.google.com/permissions lalu jalankan lagi.",
      );
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(
      "<h2>Selesai.</h2><p>Kembali ke terminal. Halaman ini boleh ditutup.</p>",
    );

    if (writeEnv) {
      saveToken(tokens.refresh_token);
      console.log("\nOK. GOOGLE_DRIVE_REFRESH_TOKEN ditulis ke .env (tidak dicetak).");
      console.log("Isi juga di Vercel: Project > Settings > Environment Variables (Production), lalu deploy ulang.");
    } else {
      console.log("\nOK. Salin nilai di bawah ini ke Vercel sebagai GOOGLE_DRIVE_REFRESH_TOKEN (Production):\n");
      console.log(tokens.refresh_token);
      console.log("\nJangan simpan di tempat lain. Tutup/bersihkan terminal ini sesudahnya.");
    }
    console.log(`Izin yang diberikan: ${tokens.scope ?? SCOPES.join(" ")}`);
    clearTimeout(giveUp);
    server.close();
    server.closeAllConnections();
  } catch (err) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("Gagal. Lihat terminal.");
    console.error("\nGAGAL:", err instanceof Error ? err.message : err);
    clearTimeout(giveUp);
    server.close();
    server.closeAllConnections();
    process.exitCode = 1;
  }
});

// Tanpa balasan Google skrip akan menunggu selamanya; menyerah setelah 5 menit.
const giveUp = setTimeout(() => {
  console.error("\nWaktu habis (5 menit) menunggu persetujuan Google. Jalankan ulang skrip.");
  process.exit(1);
}, 5 * 60 * 1000);

server.listen(PORT, "127.0.0.1", () => {
  console.log("Buka alamat ini di browser, masuk sebagai AKUN ORGANISASI pemilik berkas, lalu setujui:\n");
  console.log(url);
  console.log(`\nMenunggu balasan Google di ${REDIRECT} ...`);
});
