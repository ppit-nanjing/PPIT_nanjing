/**
 * Membuat acara "Fun Hike with PINYX" (Golden Week, Purple Mountain) sebagai
 * DRAFT.
 *
 * Jalankan: npx tsx --env-file=.env src/db/seed-fun-hike-2026.ts
 *
 * IDEMPOTEN — dijalankan ulang tidak menggandakan apa pun; acara dicari lewat
 * slug tetap `fun-hike-pinyx-2026`, pertanyaan kustom dicocokkan lewat label
 * lalu di-update, bukan disisipkan lagi. Label lama yang sudah tidak dipakai
 * (lihat OBSOLETE_LABELS) dihapus eksplisit supaya form tidak menampilkan
 * pertanyaan ganda peninggalan draf sebelumnya.
 *
 * YANG TIDAK DILAKUKAN SKRIP INI:
 * 1. TIDAK mempublikasikan acaranya — statusnya `draft`, jadi tidak muncul di
 *    /events, beranda, maupun pencarian, dan tombol daftarnya mati. Terbitkan
 *    lewat /console/events setelah ditinjau.
 * 2. TIDAK mengunggah gambar sampul (cover_image_url) atau QR apa pun — poster
 *    yang dibagikan panitia belum berupa file gambar, jadi kosong dulu.
 *
 * Catatan bentuk form (disamakan persis dengan mockup form pendaftaran yang
 * dibagikan panitia 2026-09-23):
 * - requiresBiodata = false (bukan requiresBiodata seperti WIF): tidak minta
 *   paspor / bukti mahasiswa. Semua pertanyaan di QUESTIONS, termasuk "Nama
 *   Lengkap" sendiri, dipasang sebagai event_questions kustom - BUKAN diambil
 *   otomatis dari nama akun, karena beberapa akun terdaftar dengan
 *   nama/username yang bukan nama panjang (mis. "Dustinwijaya2").
 * - Tidak ada tipe "checkbox" di event_question_type (schema.ts). Mockup
 *   punya TIGA pernyataan tanggung jawab terpisah yang WAJIB disetujui semua
 *   (bukan cuma satu dari tiga) - eventQuestionType "multiselect" hanya
 *   memvalidasi "minimal satu terisi" (lihat answersJson check di
 *   src/app/actions/events.ts), tidak "semua opsi terpilih", jadi tiap
 *   pernyataan dipasang sebagai radio wajib TERSENDIRI dengan SATU opsi
 *   ("Saya setuju") - orang harus mengklik ketiganya satu-satu, fungsinya
 *   sama seperti tiga checkbox wajib centang.
 * - Pertanyaan kondisi medis + kontak darurat sekarang dalam Bahasa Indonesia
 *   (mockup panitia), plus satu pertanyaan lanjutan opsional "Jika Ya, mohon
 *   jelaskan" yang cuma relevan kalau jawaban kondisi medisnya "Ya" - form
 *   tidak punya logika show/hide bersyarat, jadi field ini selalu tampil tapi
 *   TIDAK wajib.
 * - requiresSensus = true (sejak 2026-09-24, diputuskan panitia): hanya yang
 *   sensusnya lengkap boleh mendaftar. Konsekuensinya, "Asal Kota di
 *   Tiongkok", "Asal Universitas/Kampus", dan "WeChat ID" dihapus dari
 *   QUESTIONS (masuk OBSOLETE_LABELS) - itu semua sudah tersedia dari sensus
 *   (branch/university/wechatId), tidak perlu ditanya ulang di form.
 * - Gratis (isPaid = false), tanpa kategori tarif / struktur kepanitiaan.
 */
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { events, eventQuestions } from "./schema";

const SLUG = "fun-hike-pinyx-2026";

const QUESTIONS: { label: string; type: "text" | "radio"; options?: string; required: boolean }[] = [
  { label: "Nama Lengkap", type: "text", required: true },
  {
    label: "Apakah Anda memiliki kondisi medis yang perlu kami ketahui?",
    type: "radio",
    options: "Ya\nTidak",
    required: true,
  },
  { label: "Jika Ya, mohon jelaskan", type: "text", required: false },
  { label: "Kontak Darurat (Nama - Hubungan - Nomor Telepon)", type: "text", required: true },
  {
    label: "Saya bersedia membawa air minum atau minuman pribadi yang cukup selama kegiatan berlangsung.",
    type: "radio",
    options: "Saya setuju",
    required: true,
  },
  {
    label:
      "Saya bersedia menjaga barang-barang pribadi saya. Segala bentuk kehilangan atau kerusakan barang pribadi bukan merupakan tanggung jawab PPIT Nanjing.",
    type: "radio",
    options: "Saya setuju",
    required: true,
  },
  {
    label:
      "Saya bertanggung jawab atas keselamatan diri sendiri dengan selalu berhati-hati, mengikuti arahan panitia, dan menghindari tindakan atau bercanda yang dapat membahayakan diri sendiri maupun peserta lainnya selama kegiatan hiking berlangsung.",
    type: "radio",
    options: "Saya setuju",
    required: true,
  },
];

// Label lama yang digantikan/dihapus dari QUESTIONS - dihapus eksplisit
// supaya tidak menggandakan/meninggalkan pertanyaan di form.
const OBSOLETE_LABELS = [
  // Versi draf sebelum mockup resmi 2026-09-23.
  "Asal kota (di China)",
  "Asal kampus",
  "Any medical conditions?",
  "Emergency contact",
  "I understand that I am responsible for bringing my own drinking water, taking care of my personal belongings, and ensuring my own safety by staying cautious throughout the hike.",
  // requiresSensus diaktifkan 2026-09-24 - sudah tersedia dari sensus, tidak
  // perlu ditanya ulang di form pendaftaran.
  "Asal Kota di Tiongkok",
  "Asal Universitas/Kampus",
  "WeChat ID",
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
    requiresSensus: true,
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

  let qHapus = 0;
  for (const label of OBSOLETE_LABELS) {
    const deleted = await db
      .delete(eventQuestions)
      .where(and(eq(eventQuestions.eventId, eventId), eq(eventQuestions.label, label)))
      .returning({ id: eventQuestions.id });
    qHapus += deleted.length;
  }
  if (qHapus > 0) console.log(`Pertanyaan draf lama dihapus: ${qHapus}.`);

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
