/**
 * Salinan UJI COBA acara "Fun Hike with PINYX" (`fun-hike-pinyx-2026`, tetap
 * draft) khusus buat admin menguji alur pendaftaran end-to-end (login + 10
 * pertanyaan kustom + halaman tiket) TANPA menyentuh acara aslinya atau data
 * pendaftarnya. Sama seperti seed-wif-uat.ts.
 *
 * Jalankan  : npx tsx --env-file=.env src/db/seed-fun-hike-2026-uat.ts
 * Hapus lagi: npx tsx --env-file=.env src/db/seed-fun-hike-2026-uat.ts --remove
 *
 * IDEMPOTEN — dijalankan ulang tidak menggandakan; acara dicocokkan lewat slug
 * tetap `fun-hike-pinyx-2026-uat`. Label pertanyaan lama (lihat
 * OBSOLETE_LABELS) dihapus eksplisit supaya form uji tidak menampilkan
 * pertanyaan ganda peninggalan draf sebelumnya.
 *
 * Bedanya dengan acara asli:
 *  - status `draft` — BUKAN dipublikasikan ke publik. Sengaja dibiarkan draft
 *    supaya TIDAK muncul di /events atau bisa dijangkau pengunjung umum;
 *    hanya BPH Kabinet & panitia acara aslinya (event_committee di atas) yang
 *    bisa membukanya, lewat gerbang "preview acara belum tayang" di
 *    src/app/events/[slug]/{page,register,scan,committee}.tsx. WAJIB skrip
 *    itu SUDAH di-deploy ke produksi sebelum menjalankan seed ini - kalau
 *    belum, halamannya 404 untuk semua orang termasuk penguji.
 *  - judul + deskripsi diberi label "[UJI COBA]" yang keras
 *  - TANPA capacity / registrationDeadline (jangan sampai penguji kehabisan
 *    kuota atau ketutup gara-gara batas tanggal acara asli)
 *  - TANPA sertifikat peserta (tidak relevan buat uji coba)
 *
 * requiresBiodata & requiresSensus SENGAJA disamakan dengan acara asli (false
 * keduanya) — justru itu yang mau diverifikasi: pendaftar TIDAK diminta isi
 * biodata/sensus dulu, cukup login + jawab 10 pertanyaan di bawah (termasuk
 * "Nama Lengkap" sebagai pertanyaan kustom sendiri, BUKAN otomatis dari nama
 * akun - lihat catatan panjang di seed-fun-hike-2026.ts perihal tiga
 * pernyataan tanggung jawab yang wajib disetujui satu-satu).
 *
 * QUESTIONS di bawah WAJIB disamakan persis dengan seed-fun-hike-2026.ts -
 * tujuan UAT ini justru menguji form yang akan dipakai peserta sungguhan.
 *
 * Setelah admin selesai menguji: jalankan dengan `--remove`.
 */
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { events, eventQuestions } from "./schema";

const SLUG = "fun-hike-pinyx-2026-uat";

const QUESTIONS: { label: string; type: "text" | "radio"; options?: string; required: boolean }[] = [
  { label: "Nama Lengkap", type: "text", required: true },
  { label: "Asal Kota di Tiongkok", type: "text", required: true },
  { label: "Asal Universitas/Kampus", type: "text", required: true },
  { label: "WeChat ID", type: "text", required: true },
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

const OBSOLETE_LABELS = [
  "Asal kota (di China)",
  "Asal kampus",
  "Any medical conditions?",
  "Emergency contact",
  "I understand that I am responsible for bringing my own drinking water, taking care of my personal belongings, and ensuring my own safety by staying cautious throughout the hike.",
];

const DESCRIPTION = [
  "⚠️ INI HALAMAN UJI COBA — bukan pendaftaran Fun Hike yang sebenarnya. Dibuat",
  "untuk admin menguji alur pendaftaran (10 pertanyaan kustom, tanpa gerbang",
  "sensus/biodata). Kalau kamu bukan admin yang sedang diminta menguji,",
  "abaikan halaman ini.",
  "",
  "———",
  "",
  "Libur rebahan aja? Ayo hiking bareng!",
  "",
  "Isi Golden Week dengan jalan-jalan, menikmati alam, dan seru-seruan bersama teman-teman Indonesia di Nanjing!",
  "",
  "Titik kumpul: Exit 1, MRT Jiang Wang Miao (蒋王庙)",
  "",
  "Jangan lupa bawa: air minum, sepatu nyaman, pakaian nyaman.",
].join("\n");

const CONFIRMATION_INFO = [
  "✅ Kalau kamu sampai di sini, alur pendaftaran + halaman tiket sudah jalan.",
  "Laporkan kendala (pertanyaan yang tidak muncul, error, teks yang salah) ke panitia.",
].join("\n");

// Disamakan dengan acara asli biar terasa realistis.
const startAt = new Date(Date.UTC(2026, 9, 7, 9, 0, 0)); // 7 Okt 2026, 09:00 CST
const endAt = new Date(Date.UTC(2026, 9, 7, 14, 0, 0));

async function remove() {
  const [existing] = await db.select().from(events).where(eq(events.slug, SLUG));
  if (!existing) {
    console.log(`Acara uji "${SLUG}" tidak ada — tidak ada yang dihapus.`);
    return;
  }
  // event_registrations punya onDelete: "cascade".
  await db.delete(events).where(eq(events.id, existing.id));
  console.log(`Acara uji "${SLUG}" (${existing.id}) dihapus beserta seluruh pendaftaran ujinya.`);
}

async function seed() {
  const [existing] = await db.select().from(events).where(eq(events.slug, SLUG));

  const values = {
    title: "[UJI COBA] Fun Hike with PINYX — Tes Pendaftaran",
    slug: SLUG,
    description: DESCRIPTION,
    category: "Uji Coba",
    location: "Purple Mountain (Zijin Shan)",
    startAt,
    endAt,
    requiresBiodata: false,
    requiresSensus: false,
    isPaid: false,
    confirmationInfo: CONFIRMATION_INFO,
    certificateForParticipants: false,
    // Draft, bukan published - lihat catatan panjang di atas berkas ini.
    status: "draft" as const,
  };

  let eventId: string;
  if (existing) {
    await db.update(events).set(values).where(eq(events.id, existing.id));
    eventId = existing.id;
    console.log(`Acara uji diperbarui (draft, preview only): ${values.title}`);
  } else {
    const [created] = await db.insert(events).values(values).returning({ id: events.id });
    eventId = created.id;
    console.log(`Acara uji dibuat (draft, preview only): ${values.title}`);
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
  console.log(`URL (preview only, draft) : /events/${SLUG}`);
  console.log(`Konsol acara              : /console/events/${eventId}  (roster + export CSV + ubah status)`);
  console.log("");
  console.log("Catatan buat penguji:");
  console.log("  - Cuma BPH Kabinet & panitia acara aslinya yang bisa membuka link di atas (draft + gerbang preview).");
  console.log("  - Butuh login akun portal dulu (event ini tidak requiresSensus/requiresBiodata).");
  console.log("  - Isi 10 pertanyaan (termasuk 3 pernyataan tanggung jawab terpisah), submit, lalu cek halaman tiket muncul benar.");
  console.log("  - Selesai uji: jalankan skrip ini dengan --remove.");
}

const main = process.argv.includes("--remove") ? remove : seed;
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
