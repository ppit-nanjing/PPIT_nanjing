/**
 * Salinan UJI COBA acara WIF 2026 khusus buat divisi Akademik menguji alur
 * pendaftaran end-to-end (biodata + kategori tarif + gerbang pembayaran + tiket)
 * TANPA menyentuh acara WIF asli (`wif-2026`, tetap draft) atau data
 * pendaftarnya.
 *
 * Jalankan  : npx tsx --env-file=.env src/db/seed-wif-uat.ts
 * Hapus lagi: npx tsx --env-file=.env src/db/seed-wif-uat.ts --remove
 *
 * IDEMPOTEN — dijalankan ulang tidak menggandakan; acara dicocokkan lewat slug
 * tetap `wif-uat`.
 *
 * Bedanya dengan seed-wif-2026.ts:
 *  - status `published` (biar formnya benar-benar bisa dibuka & diisi peserta uji)
 *  - judul + instruksi diberi label "[UJI COBA]" yang keras supaya pengunjung
 *    biasa tidak salah mengira ini pendaftaran WIF sungguhan
 *  - TIDAK membuat pohon divisi kepanitiaan (tidak relevan buat uji pendaftaran)
 *  - instruksi bayar tegas: JANGAN transfer uang beneran, cukup unggah gambar apa
 *    pun sebagai bukti
 *
 * Setelah divisi Akademik selesai: jalankan dengan `--remove` (menghapus acara
 * uji + seluruh pendaftaran ujinya lewat cascade), atau ubah statusnya ke
 * `draft` lewat /console/events kalau mau menyimpan datanya dulu.
 */
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { events, eventFeeOptions } from "./schema";

const SLUG = "wif-uat";

const FEE_OPTIONS: { label: string; amountCny: number }[] = [
  { label: "Freshmen", amountCny: 15 },
  { label: "Non-freshmen", amountCny: 25 },
];

// Deskripsi = "broadcast message" acara: teks yang muncul di halaman acara.
// Isinya menyalin caption Google Form WIF asli supaya uji coba terasa nyata,
// dengan spanduk UJI COBA ditaruh paling atas.
const DESCRIPTION = [
  "⚠️ INI HALAMAN UJI COBA — bukan pendaftaran WIF yang sebenarnya. Dibuat untuk",
  "divisi Akademik menguji alur pendaftaran. Kalau kamu bukan panitia yang",
  "sedang diminta menguji, abaikan halaman ini.",
  "",
  "———",
  "",
  "Freshman, your Nanjing journey begins! 🚀",
  "",
  "PPIT Nanjing hadir dengan WIF 2026 untuk maba 2026/2027 ✨",
  "Ayo kumpul rame-rame, kenalan temen baru, main game seru & banyak kejutan!",
  "Keseruan menunggu kamu, yuk daftar sekarang‼️",
  "",
  "📅 Sabtu, 26 Sep 2026",
  "🕐 13.00–18.00 CST",
  "📍 Novotel Hotel (Daminglu Station Line 3)",
].join("\n");

const AGENDA = [
  "13.00 - Registrasi & check-in",
  "13.30 - Pembukaan",
  "14.00 - Ice breaking & games",
  "16.00 - Sharing session",
  "17.00 - Ramah tamah",
  "18.00 - Penutup",
].join("\n");

const PAYMENT_INSTRUCTIONS = [
  "⚠️ JANGAN transfer uang sungguhan. Ini simulasi.",
  "Untuk menguji gerbang pembayaran, cukup unggah screenshot / gambar apa saja",
  "sebagai \"bukti transfer\", lalu bendahara acara (atau admin) menandainya",
  "terverifikasi di /console — setelah itu QR check-in muncul otomatis di",
  "halaman tiket.",
].join("\n");

const CONFIRMATION_INFO = [
  "✅ Kalau kamu sampai di sini, alur pendaftaran + halaman tiket sudah jalan.",
  "Laporkan kendala (langkah yang membingungkan, error, teks yang salah) ke",
  "divisi Akademik.",
].join("\n");

// Samakan dengan WIF asli biar terasa realistis. Kolom timestamp tanpa zona
// waktu — Date.UTC dipakai supaya angkanya tidak bergeser ikut zona mesin.
const startAt = new Date(Date.UTC(2026, 8, 26, 13, 0, 0)); // 26 Sep 2026, 13:00 CST
const endAt = new Date(Date.UTC(2026, 8, 26, 18, 0, 0));

async function remove() {
  const [existing] = await db.select().from(events).where(eq(events.slug, SLUG));
  if (!existing) {
    console.log(`Acara uji "${SLUG}" tidak ada — tidak ada yang dihapus.`);
    return;
  }
  // event_registrations & event_fee_options punya onDelete: "cascade".
  await db.delete(events).where(eq(events.id, existing.id));
  console.log(`Acara uji "${SLUG}" (${existing.id}) dihapus beserta seluruh pendaftaran ujinya.`);
}

async function seed() {
  const [existing] = await db.select().from(events).where(eq(events.slug, SLUG));

  const values = {
    title: "[UJI COBA] WIF 2026 — Tes Pendaftaran",
    slug: SLUG,
    description: DESCRIPTION,
    category: "Uji Coba",
    location: "Novotel Hotel (Daminglu Station Line 3)",
    agenda: AGENDA,
    // Warna halaman senada poster WIF (krem / lavender / pink).
    themeBg: "#fff6e5",
    themeAccent: "#d4c4e5",
    themeAccent2: "#fdcbd8",
    startAt,
    endAt,
    requiresBiodata: true,
    isPaid: true,
    paymentInstructions: PAYMENT_INSTRUCTIONS,
    confirmationInfo: CONFIRMATION_INFO,
    // Sertifikat tidak relevan buat uji coba.
    certificateForParticipants: false,
    status: "published" as const,
  };

  let eventId: string;
  if (existing) {
    await db.update(events).set(values).where(eq(events.id, existing.id));
    eventId = existing.id;
    console.log(`Acara uji diperbarui & dipublikasikan: ${values.title}`);
  } else {
    const [created] = await db.insert(events).values(values).returning({ id: events.id });
    eventId = created.id;
    console.log(`Acara uji dibuat & dipublikasikan: ${values.title}`);
  }

  let baru = 0;
  for (const [i, opt] of FEE_OPTIONS.entries()) {
    const [found] = await db
      .select({ id: eventFeeOptions.id })
      .from(eventFeeOptions)
      .where(and(eq(eventFeeOptions.eventId, eventId), eq(eventFeeOptions.label, opt.label)));
    if (found) {
      await db.update(eventFeeOptions).set({ amountCny: opt.amountCny, orderIndex: i }).where(eq(eventFeeOptions.id, found.id));
    } else {
      await db.insert(eventFeeOptions).values({ eventId, label: opt.label, amountCny: opt.amountCny, orderIndex: i });
      baru++;
    }
  }
  console.log(`Kategori tarif: ${baru} dibuat, ${FEE_OPTIONS.length - baru} diperbarui.`);

  console.log("");
  console.log(`URL publik  : /events/${SLUG}`);
  console.log(`Konsol acara: /console/events/${eventId}  (roster + export CSV + verifikasi bayar + ubah status)`);
  console.log("");
  console.log("Catatan buat penguji:");
  console.log("  - Butuh login akun portal dulu.");
  console.log("  - Yang sudah isi sensus lengkap: biodata terisi otomatis (read-only).");
  console.log("  - Yang belum: biodata diisi manual + unggah 1 berkas bukti mahasiswa.");
  console.log("  - Gerbang bayar: unggah gambar APA SAJA sebagai bukti, jangan bayar beneran.");
  console.log("  - Selesai uji: jalankan skrip ini dengan --remove.");
}

const main = process.argv.includes("--remove") ? remove : seed;
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
