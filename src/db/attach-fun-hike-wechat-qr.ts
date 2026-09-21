/**
 * One-off: unggah screenshot QR grup WeChat "Fun Hike with PINYX" ke Blob
 * (folder `events`, sama seperti upload lewat ImageUploadCropper di
 * /console/events/[id]) dan tempel ke confirmationContactQr1Url + tulis
 * confirmationInfo acaranya.
 *
 * Jalankan sekali: npx tsx --env-file=.env src/db/attach-fun-hike-wechat-qr.ts <path-ke-gambar>
 *
 * IDEMPOTEN dari sisi DB (selalu overwrite kolomnya ke nilai final di bawah),
 * TAPI tiap dijalankan mengunggah blob baru (addRandomSuffix) - blob lama jadi
 * yatim. Jangan dijalankan berulang tanpa perlu.
 */
import { readFile } from "node:fs/promises";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { events } from "./schema";

const SLUG = "fun-hike-pinyx-2026";

const CONFIRMATION_INFO = [
  "Masuk grup WeChat 【PPIT】 Fun Hike with Pinyx — add salah satu:",
  "WeChat ID: dustinwjy2",
  "WeChat ID: gladyseunicee",
].join("\n");

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error("Usage: npx tsx --env-file=.env src/db/attach-fun-hike-wechat-qr.ts <path-ke-gambar>");
    process.exit(1);
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN tidak ada di .env");

  const [event] = await db.select().from(events).where(eq(events.slug, SLUG));
  if (!event) throw new Error(`Acara dengan slug "${SLUG}" tidak ditemukan - jalankan seed-fun-hike-2026.ts dulu.`);

  const fileBuffer = await readFile(imagePath);
  const safeName = "fun-hike-wechat-group-qr.jpg";
  const key = `events/${Date.now()}-${safeName}`;

  const blob = await put(key, fileBuffer, {
    access: "public",
    addRandomSuffix: true,
    token,
    contentType: "image/jpeg",
  });

  await db
    .update(events)
    .set({ confirmationContactQr1Url: blob.url, confirmationInfo: CONFIRMATION_INFO })
    .where(eq(events.id, event.id));

  console.log(`QR grup diunggah: ${blob.url}`);
  console.log("confirmationInfo diset:");
  console.log(CONFIRMATION_INFO);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
