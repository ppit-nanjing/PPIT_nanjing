/**
 * ONE-OFF campaign. NOT part of `npm run db:seed`. Run manually, once.
 *
 * Nudges every non-cancelled WIF 2026 registrant to (1) finish their /sensus
 * census and (2) join the WIF WeChat group. Two channels:
 *   - in-app notification (the bell) -> ALL registrants
 *   - email (Gmail SMTP) -> only registrants who are `emailSubscribed` AND whose
 *     census isn't complete (the 1 complete person gets only the group reminder
 *     in-app; no "complete your census" email).
 *
 * Message adapts per person: census incomplete -> both asks; census complete ->
 * only the WeChat-group ask.
 *
 * SAFE:
 *   - Dry-run by default. `--apply` to send.
 *   - Idempotent: a marker notification row (relatedEntityType "sensus_reminder"
 *     + relatedEntityId = the WIF event id) means "already processed" -> skipped
 *     on re-run. The marker IS the in-app notification.
 *   - Email is throttled (default 15s between sends) for deliverability.
 *   - Email failures are logged and skipped, never abort the batch.
 *
 * Usage:
 *   npx tsx --env-file=.env src/db/notify-wif-sensus-group.ts             # dry run
 *   npx tsx --env-file=.env src/db/notify-wif-sensus-group.ts --apply
 *   npx tsx --env-file=.env src/db/notify-wif-sensus-group.ts --apply --delay 20
 */
import { put } from "@vercel/blob";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "./index";
import { events, eventRegistrations, notifications, sensusProfiles, users } from "./schema";
import { sendEmail } from "../lib/email";

const APPLY = process.argv.includes("--apply");
const delayArg = process.argv.indexOf("--delay");
const DELAY_MS = (delayArg > -1 ? Number(process.argv[delayArg + 1]) || 15 : 15) * 1000;

const MARKER_TYPE = "sensus_reminder";
const SENSUS_URL = "https://ppit-nanjing.vercel.app/sensus";
const TICKET_URL = "https://ppit-nanjing.vercel.app/events/wif-2026/ticket";
const SUBJECT = "Dua langkah setelah daftar WIF 2026";

const A = "#3f5c43";
const INK = "#20221d";
const MUT = "#5f6258";
const LINE = "#e6e8e0";
const BG = "#f2f3ef";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function hostQrPng(sourceUrl: string, key: string): Promise<string> {
  const buf = Buffer.from(await (await fetch(sourceUrl)).arrayBuffer());
  const png = await sharp(buf).resize(360, 360, { fit: "inside" }).png({ compressionLevel: 9 }).toBuffer();
  const blob = await put(`email-assets/${key}.png`, png, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "image/png",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

// Logo mark: public/logo.svg is a single-color silhouette (fill is swapped by
// CSS mask on the site itself), so for the email we recolor the path to the
// brand red (the same red as the site's "meihua" theme) before rasterizing.
// Hosted the same way as the QR PNGs - a stable, overwritable public URL.
const LOGO_RED = "#9a2f4a";

export async function hostLogoPng(): Promise<string> {
  const svgPath = join(process.cwd(), "public", "logo.svg");
  const svg = readFileSync(svgPath, "utf8").replace(/fill:#000000/g, `fill:${LOGO_RED}`);
  const png = await sharp(Buffer.from(svg))
    .resize(240, 240, { fit: "inside" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const blob = await put("email-assets/ppit-logo.png", png, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "image/png",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

// ---- message builders -------------------------------------------------------

function inAppBody(needsSensus: boolean): { title: string; body: string } {
  if (needsSensus) {
    return {
      title: "WIF 2026: lengkapi sensus + masuk grup WeChat",
      body:
        "Dua langkah sebelum 26 Sep. (1) Lengkapi sensusmu di /sensus (~5 menit; data pendaftaran WIF sudah terisi otomatis). " +
        "(2) Masuk grup WeChat WIF: add Gwen (rhpxzz) atau Athaya (athayamzzra) dan kirim screenshot QR tiketmu untuk verifikasi.",
    };
  }
  return {
    title: "WIF 2026: pastikan kamu sudah di grup WeChat",
    body:
      "Sensusmu sudah lengkap - terima kasih. Tinggal pastikan kamu masuk grup WeChat WIF 2026: add Gwen (rhpxzz) atau " +
      "Athaya (athayamzzra) dan kirim screenshot QR tiketmu untuk verifikasi. Semua info acara lewat grup ini.",
  };
}

export function emailText(name: string): string {
  return [
    `Halo ${name},`,
    ``,
    `Kamu sudah terdaftar di WIF 2026 (Sabtu, 26 September). Dua langkah singkat sebelum hari-H:`,
    ``,
    `LANGKAH 1 - Lengkapi sensus PPIT Nanjing (sekitar 5 menit)`,
    `Data dari formulir pendaftaran WIF (paspor, kampus, jurusan, KTM) sudah kami pindahkan ke profil sensusmu. Tinggal lengkapi sisanya: nama Mandarin, jenjang studi, sumber dana, tahun lulus, kontak darurat, alamat di Tiongkok.`,
    `Lengkapi di: ${SENSUS_URL}`,
    `Selama belum lengkap, keanggotaanmu tercatat "Tamu" dan datanya belum bisa direkap ke PPI Tiongkok Pusat.`,
    ``,
    `LANGKAH 2 - Masuk grup WeChat WIF 2026 (wajib)`,
    `Semua info & pengumuman acara lewat grup ini. Scan QR (di email versi HTML) atau add WeChat ID Humas:`,
    `  Gwen    -> rhpxzz`,
    `  Athaya  -> athayamzzra`,
    `Saat menambahkan, sertakan screenshot QR / token tiket masuk kamu (${TICKET_URL}) untuk verifikasi panitia.`,
    ``,
    `Ada kendala? Balas email ini.`,
    ``,
    `Salam hangat,`,
    `Panitia PPIT Nanjing`,
    ``,
    `--`,
    `Email ini mungkin masuk folder Spam / Promosi. Tandai "Bukan spam" agar email berikutnya masuk kotak masuk.`,
  ].join("\n");
}

export function emailHtml(name: string, gwenQr: string, athayaQr: string, logoUrl: string): string {
  const qrCell = (src: string, n: string, id: string) =>
    `<td width="50%" align="center" style="padding:6px;">` +
    `<img src="${src}" width="150" height="150" alt="QR WeChat ${n}" style="display:block;width:150px;height:150px;border:1px solid ${LINE};border-radius:10px;">` +
    `<p style="margin:7px 0 0;font-size:13px;color:${INK};font-weight:600;">${n}</p>` +
    `<p style="margin:1px 0 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:${MUT};">${id}</p></td>`;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <tr><td style="height:4px;background:${A};line-height:4px;font-size:4px;">&nbsp;</td></tr>
  <tr><td style="padding:28px 32px 0;text-align:center;"><img src="${logoUrl}" width="56" height="56" alt="PPIT Nanjing" style="display:inline-block;width:56px;height:56px;"></td></tr>
  <tr><td style="padding:14px 32px 0;text-align:center;"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.12em;color:${A};text-transform:uppercase;">PPIT Nanjing</p></td></tr>
  <tr><td style="padding:10px 32px 0;">
    <h1 style="margin:0;font-size:23px;line-height:1.3;color:${INK};font-weight:700;">Dua langkah setelah daftar WIF 2026</h1>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.65;color:${MUT};">Halo <strong style="color:${INK};">${name}</strong>, kamu sudah terdaftar di WIF 2026 &mdash; Sabtu, 26 September. Selesaikan dua hal singkat ini sebelum hari-H.</p>
  </td></tr>
  <tr><td style="padding:22px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="padding:18px 18px 4px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:26px;height:26px;background:${A};border-radius:999px;color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:26px;">1</td>
        <td style="padding-left:10px;font-size:15px;font-weight:700;color:${INK};">Lengkapi sensus PPIT Nanjing</td></tr></table></td></tr>
      <tr><td style="padding:8px 18px 4px;font-size:14px;line-height:1.6;color:${MUT};">Data dari formulir pendaftaran WIF (paspor, kampus, jurusan, KTM) <strong style="color:${INK};">sudah kami pindahkan</strong> ke profil sensusmu. Tinggal ~5 menit: nama Mandarin, jenjang studi, sumber dana, tahun lulus, kontak darurat, alamat di Tiongkok.</td></tr>
      <tr><td style="padding:14px 18px 18px;">
        <a href="${SENSUS_URL}" style="display:inline-block;background:${A};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:9px;">Lengkapi Sensus &rarr;</a>
        <p style="margin:12px 0 0;font-size:12.5px;line-height:1.5;color:${MUT};">Selama belum lengkap, keanggotaanmu tercatat &ldquo;Tamu&rdquo; dan datanya belum bisa direkap ke PPI Tiongkok Pusat.</p></td></tr>
    </table></td></tr>
  <tr><td style="padding:14px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="padding:18px 18px 4px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:26px;height:26px;background:${A};border-radius:999px;color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:26px;">2</td>
        <td style="padding-left:10px;font-size:15px;font-weight:700;color:${INK};">Masuk grup WeChat WIF 2026 &nbsp;<span style="font-size:11px;font-weight:700;color:${A};border:1px solid ${A};border-radius:4px;padding:1px 5px;">WAJIB</span></td></tr></table></td></tr>
      <tr><td style="padding:8px 18px 6px;font-size:14px;line-height:1.6;color:${MUT};">Semua info &amp; pengumuman acara lewat grup ini. Scan QR atau add WeChat ID salah satu Humas:</td></tr>
      <tr><td style="padding:6px 12px 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${qrCell(gwenQr, "Gwen", "rhpxzz")}
        ${qrCell(athayaQr, "Athaya", "athayamzzra")}
      </tr></table></td></tr>
      <tr><td style="padding:10px 18px 18px;font-size:12.5px;line-height:1.55;color:${MUT};">Saat menambahkan, sertakan <strong style="color:${INK};">screenshot QR / token tiket masuk</strong> kamu (dari <a href="${TICKET_URL}" style="color:${A};">halaman tiket</a>) untuk verifikasi panitia.</td></tr>
    </table></td></tr>
  <tr><td style="padding:22px 32px 0;font-size:14px;line-height:1.6;color:${MUT};">
    <p style="margin:0;">Ada kendala? Cukup balas email ini.</p>
    <p style="margin:14px 0 0;color:${INK};">Salam hangat,<br>Panitia PPIT Nanjing</p></td></tr>
  <tr><td style="padding:20px 32px 26px;"><p style="margin:18px 0 0;border-top:1px solid ${LINE};padding-top:14px;font-size:12px;line-height:1.5;color:#9a9c92;">Email ini mungkin masuk folder <strong>Spam</strong> atau <strong>Promosi</strong>. Tandai &ldquo;Bukan spam&rdquo; agar email berikutnya masuk kotak masuk.</p></td></tr>
</table></td></tr></table></body></html>`;
}

// ---- main ------------------------------------------------------------------

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN (public store) not set - needed to host the QR PNGs.");
    process.exit(1);
  }
  console.log(`mode: ${APPLY ? `APPLY (email delay ${DELAY_MS / 1000}s)` : "DRY RUN (no writes / no email)"}\n`);

  const [wif] = await db.select().from(events).where(eq(events.slug, "wif-2026"));
  if (!wif) throw new Error("wif-2026 not found");

  const regs = await db
    .select({ userId: eventRegistrations.userId })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, wif.id), ne(eventRegistrations.status, "cancelled")));
  const userIds = [...new Set(regs.map((r) => r.userId))];

  const accts = await db
    .select({ id: users.id, name: users.name, email: users.email, sub: users.emailSubscribed })
    .from(users)
    .where(inArray(users.id, userIds));
  const sps = await db
    .select({ uid: sensusProfiles.userId, cs: sensusProfiles.completionStatus })
    .from(sensusProfiles)
    .where(inArray(sensusProfiles.userId, userIds));
  const completeById = new Map(sps.map((s) => [s.uid, s.cs === "complete"]));
  const already = await db
    .select({ uid: notifications.userId })
    .from(notifications)
    .where(and(eq(notifications.relatedEntityType, MARKER_TYPE), eq(notifications.relatedEntityId, wif.id)));
  const done = new Set(already.map((a) => a.uid));

  const gwenQr = await hostQrPng(wif.confirmationContactQr1Url!, "wif-2026-wechat-gwen");
  const athayaQr = await hostQrPng(wif.confirmationContactQr2Url!, "wif-2026-wechat-athaya");
  const logoUrl = await hostLogoPng();
  console.log(`QR hosted:\n  ${gwenQr}\n  ${athayaQr}\nLogo hosted:\n  ${logoUrl}\n`);

  const targets = accts
    .filter((a) => !done.has(a.id))
    .map((a) => {
      const complete = completeById.get(a.id) === true;
      const emailable = !complete && a.sub === true && !!a.email && /@/.test(a.email);
      return { ...a, complete, emailable };
    });

  console.log(`WIF registrants: ${accts.length} (${done.size} already notified, skipped)`);
  console.log(`To notify (in-app): ${targets.length}`);
  console.log(`To email: ${targets.filter((t) => t.emailable).length}`);
  console.log(`  (census complete: ${targets.filter((t) => t.complete).length} - in-app group reminder only, no email)\n`);

  let notified = 0;
  let emailed = 0;
  let emailFailed = 0;

  for (const t of targets) {
    const { title, body } = inAppBody(!t.complete);
    const line = `${t.name ?? "?"} <${t.email ?? "-"}>  census:${t.complete ? "complete" : "incomplete"}  email:${t.emailable ? "yes" : "no"}`;

    if (!APPLY) {
      console.log(`  would notify  ${line}`);
      notified++;
      if (t.emailable) emailed++;
      continue;
    }

    // 1. in-app notification (also the idempotency marker)
    await db.insert(notifications).values({
      userId: t.id,
      title,
      body,
      relatedEntityType: MARKER_TYPE,
      relatedEntityId: wif.id,
    });
    notified++;

    // 2. email (supplementary; incomplete + subscribed only)
    if (t.emailable) {
      const res = await sendEmail({
        to: t.email!,
        subject: SUBJECT,
        html: emailHtml(t.name || "teman PPIT", gwenQr, athayaQr, logoUrl),
        text: emailText(t.name || "teman PPIT"),
      });
      if (res.ok) {
        emailed++;
        console.log(`  ✓ notif + email  ${line}`);
      } else {
        emailFailed++;
        console.log(`  ⚠ notif ok, EMAIL FAILED (${res.reason})  ${line}`);
      }
      await sleep(DELAY_MS);
    } else {
      console.log(`  ✓ notif          ${line}`);
    }
  }

  console.log(
    `\n${APPLY ? "SENT" : "WOULD SEND"}: ${notified} in-app, ${emailed} email` +
      (emailFailed ? `, ${emailFailed} email FAILED (re-run to retry any without a marker, or handle manually)` : ""),
  );
  console.log(APPLY ? "\nDONE." : "\nDRY RUN - no writes, no email. Re-run with --apply.");
}

// Guard so this file can be imported (e.g. by a one-off test-send script that
// reuses hostLogoPng/emailHtml) without triggering the real campaign run.
if (process.argv[1] && /notify-wif-sensus-group\.ts$/.test(process.argv[1])) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
