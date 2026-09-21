/**
 * Membuat acara "Fun Hike with PINYX" (Golden Week, Purple Mountain) sebagai
 * DRAFT.
 *
 * Jalankan: npx tsx --env-file=.env src/db/seed-fun-hike-2026.ts
 *
 * IDEMPOTEN — dijalankan ulang tidak menggandakan apa pun; acara dicari lewat
 * slug tetap `fun-hike-pinyx-2026`, pertanyaan kustom dicocokkan lewat label
 * lalu di-update, bukan disisipkan lagi.
 *
 * YANG TIDAK DILAKUKAN SKRIP INI:
 * 1. TIDAK mempublikasikan acaranya — statusnya `draft`, jadi tidak muncul di
 *    /events, beranda, maupun pencarian, dan tombol daftarnya mati. Terbitkan
 *    lewat /console/events setelah ditinjau.
 * 2. TIDAK mengunggah gambar sampul (cover_image_url) atau QR apa pun — poster
 *    yang dibagikan panitia belum berupa file gambar, jadi kosong dulu.
 *
 * Catatan bentuk form:
 * - requiresBiodata = false (bukan requiresBiodata seperti WIF): poster tidak
 *   minta paspor / bukti mahasiswa, cuma nama (otomatis dari akun yang login),
 *   asal kota, asal kampus, WeChat ID, kondisi medis, kontak darurat, dan
 *   pernyataan tanggung jawab pribadi — jadi lima yang terakhir dipasang
 *   sebagai event_questions kustom, bukan blok biodata penuh.
 * - Tidak ada tipe "checkbox" di event_question_type (schema.ts) — pernyataan
 *   tanggung jawab pribadi dibuat sebagai radio wajib dengan SATU opsi
 *   ("I understand and agree"), yang secara fungsional memaksa persetujuan
 *   sebelum pendaftaran valid, sama seperti checkbox wajib centang.
 * - requiresSensus = false: acara sosial terbuka untuk "teman-teman Indonesia
 *   di Nanjing", bukan cuma yang sensusnya sudah lengkap.
 * - Gratis (isPaid = false), tanpa kategori tarif / struktur kepanitiaan.
 */
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { events, eventQuestions } from "./schema";

const SLUG = "fun-hike-pinyx-2026";

const QUESTIONS: { label: string; type: "text" | "radio"; options?: string; required: boolean }[] = [
  { label: "Asal kota (di China)", type: "text", required: true },
  { label: "Asal kampus", type: "text", required: true },
  { label: "WeChat ID", type: "text", required: true },
  { label: "Any medical conditions?", type: "radio", options: "Yes\nNo", required: true },
  { label: "Emergency contact", type: "text", required: true },
  {
    label:
      "I understand that I am responsible for bringing my own drinking water, taking care of my personal belongings, and ensuring my own safety by staying cautious throughout the hike.",
    type: "radio",
    options: "I understand and agree",
    required: true,
  },
];

const DESCRIPTION = [
  "Libur rebahan aja? Ayo hiking bareng!",
  "",
  "Isi Golden Week dengan jalan-jalan, menikmati alam, dan seru-seruan bersama teman-teman Indonesia di Nanjing!",
  "",
  "Titik kumpul: Exit 1, MRT Jiang Wang Miao (蒋王庙)",
  "",
  "Jangan lupa bawa: air minum, sepatu nyaman, pakaian nyaman.",
].join("\n");

// Kolom start_at/end_at/registration_deadline bertipe timestamp TANPA zona
// waktu; Date.UTC dipakai supaya jam dinding yang tersimpan tetap sama di
// mesin mana pun skrip ini dijalankan (lihat catatan yang sama di
// seed-wif-2026.ts).
const startAt = new Date(Date.UTC(2026, 9, 7, 9, 0, 0)); // 7 Okt 2026, 09:00 CST
const endAt = new Date(Date.UTC(2026, 9, 7, 14, 0, 0)); //  7 Okt 2026, 14:00 CST
// Keputusan panitia: pendaftaran ditutup begitu kapasitas (50) penuh, ATAU
// Senin 5 Okt 2026 - mana yang lebih dulu tercapai. Kapasitas dicek otomatis
// oleh sistem (events.capacity), ini cuma batas tanggalnya.
const registrationDeadline = new Date(Date.UTC(2026, 9, 5, 23, 59, 0)); // 5 Okt 2026, 23:59 CST

async function main() {
  const [existing] = await db.select().from(events).where(eq(events.slug, SLUG));

  const eventValues = {
    title: "Fun Hike with PINYX",
    slug: SLUG,
    description: DESCRIPTION,
    category: "Sosial",
    location: "Purple Mountain (Zijin Shan)",
    startAt,
    endAt,
    registrationDeadline,
    capacity: 50,
    isPaid: false,
    requiresBiodata: false,
    requiresSensus: false,
    status: "draft" as const,
  };

  let eventId: string;
  if (existing) {
    // Status TIDAK ditimpa: kalau sudah diubah lewat console (mis. sudah
    // dipublikasikan), menjalankan skrip ini lagi tidak boleh mengembalikannya
    // ke draft.
    await db
      .update(events)
      .set({
        title: eventValues.title,
        description: eventValues.description,
        category: eventValues.category,
        location: eventValues.location,
        startAt,
        endAt,
        registrationDeadline,
        capacity: eventValues.capacity,
        isPaid: eventValues.isPaid,
        requiresBiodata: eventValues.requiresBiodata,
        requiresSensus: eventValues.requiresSensus,
      })
      .where(eq(events.id, existing.id));
    eventId = existing.id;
    console.log(`Acara sudah ada, diperbarui: ${eventValues.title}`);
  } else {
    const [created] = await db.insert(events).values(eventValues).returning({ id: events.id });
    eventId = created.id;
    console.log(`Acara dibuat sebagai DRAFT: ${eventValues.title}`);
  }

  let qBaru = 0;
  for (const [i, q] of QUESTIONS.entries()) {
    const [found] = await db
      .select({ id: eventQuestions.id })
      .from(eventQuestions)
      .where(and(eq(eventQuestions.eventId, eventId), eq(eventQuestions.label, q.label)));
    if (found) {
      await db
        .update(eventQuestions)
        .set({ type: q.type, options: q.options ?? null, required: q.required, orderIndex: i })
        .where(eq(eventQuestions.id, found.id));
    } else {
      await db
        .insert(eventQuestions)
        .values({ eventId, label: q.label, type: q.type, options: q.options ?? null, required: q.required, orderIndex: i });
      qBaru++;
    }
  }
  console.log(`Pertanyaan: ${qBaru} dibuat, ${QUESTIONS.length - qBaru} diperbarui.`);

  console.log("");
  console.log("Langkah berikutnya, lewat /console/events:");
  console.log("  1. Unggah gambar sampul (poster) kalau sudah ada filenya.");
  console.log("  2. Tinjau isian di atas (lokasi/waktu/kapasitas/pertanyaan).");
  console.log("  3. Ubah status ke 'published' saat siap tampil ke publik.");
  console.log(`  4. Link pendaftaran otomatis: /events/${SLUG}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
