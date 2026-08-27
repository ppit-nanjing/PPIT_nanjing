/**
 * Membuat acara WIF 2026 (Welcoming Indonesian Freshman) sebagai DRAFT beserta
 * seluruh pohon divisi kepanitiaannya.
 *
 * Jalankan: npx tsx --env-file=.env src/db/seed-wif-2026.ts
 *
 * IDEMPOTEN — dijalankan ulang tidak menggandakan apa pun; acara dicari lewat
 * slug tetap `wif-2026`, dan tiap divisi dicocokkan lewat nama + induknya lalu
 * di-update, bukan disisipkan lagi. Aman dijalankan lagi setelah migrasi akun ke
 * Neon baru.
 *
 * YANG TIDAK DILAKUKAN SKRIP INI:
 *
 * 1. TIDAK menugaskan orang. Struktur kepanitiaan yang dikirim pengurus dipakai
 *    sebagai BENTUK-nya saja (berapa divisi, berapa kuota tiap divisi), bukan
 *    sebagai perintah memasukkan nama-nama di dalamnya. Penugasan dilakukan
 *    sendiri lewat /console/events/[id] setelah orangnya punya akun.
 * 2. TIDAK membuat akun siapa pun.
 * 3. TIDAK menerbitkan sertifikat.
 * 4. TIDAK mempublikasikan acaranya — statusnya `draft`, jadi tidak muncul di
 *    /events, beranda, maupun pencarian, dan tombol daftarnya mati.
 *
 * Job description hanya diisi untuk tiga sub-tim Departemen Perlengkapan, satu-
 * satunya yang isinya benar-benar diketahui (dari slide job description yang
 * dikirim pengurus). Divisi lain sengaja dibiarkan KOSONG: mengarang jobdesc
 * untuk divisi orang lain akan tampak resmi padahal tidak pernah disepakati
 * siapa pun. Isi belakangan lewat console.
 */
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { events, eventDivisions, eventFeeOptions } from "./schema";

const SLUG = "wif-2026";

// Tarif masuk WIF: freshmen (S1 tahun pertama) vs bukan. Di-upsert lewat label
// supaya menjalankan ulang tidak menggandakan; nominalnya di-update kalau
// berubah, tapi kategori yang ditambah panitia lewat console tidak dihapus.
const FEE_OPTIONS: { label: string; amountCny: number }[] = [
  { label: "Freshmen", amountCny: 15 },
  { label: "Non-freshmen", amountCny: 25 },
];

const PAYMENT_INSTRUCTIONS = [
  "Bayar entrance fee sesuai kategori (Freshmen ¥15 / Non-freshmen ¥25) via Weixin Pay atau Alipay.",
  "WAJIB cantumkan nama lengkap kamu di kolom notes/catatan transfer.",
  "Unggah bukti transfer di halaman ini. Kalau ada kendala upload, hubungi panitia lewat WeChat.",
].join("\n");

// Kuota departemen = 1 (kursi Ketua Departemen); anggotanya dihitung di
// sub-timnya masing-masing. Halaman struktur menjumlahkan ke atas, jadi
// Dept. Perlengkapan terbaca 1 + 2 + 3 + 2 = 8 orang.
const STRUCTURE: {
  name: string;
  quota: number | null;
  jobDescription?: string;
  children: { name: string; quota: number | null; jobDescription?: string }[];
}[] = [
  {
    name: "Dept. EO",
    quota: 1,
    children: [
      { name: "Acara", quota: 5 },
      { name: "Humas", quota: 2 },
      { name: "Design & Media", quota: 6 },
    ],
  },
  {
    name: "Dept. Perlengkapan",
    quota: 1,
    children: [
      {
        name: "Konsumsi",
        quota: 2,
        jobDescription: [
          "Menyiapkan konsumsi saat acara.",
          "Memastikan jumlah konsumsi yang disiapkan mencukupi.",
        ].join("\n"),
      },
      {
        name: "Perlengkapan",
        quota: 3,
        jobDescription: [
          "Mendata semua perlengkapan yang diperlukan oleh setiap divisi.",
          "Mempersiapkan semua alat & bahan yang diperlukan untuk acara.",
        ].join("\n"),
      },
      {
        name: "Sound System",
        quota: 2,
        jobDescription: "Mempersiapkan sound system, peralatan yang dibutuhkan di belakang layar.",
      },
    ],
  },
  {
    name: "Dept. Keuangan",
    quota: 1,
    children: [
      { name: "Usaha Dana", quota: 2 },
      { name: "Sponsorship", quota: 2 },
    ],
  },
];

// Kolom start_at/end_at bertipe `timestamp` TANPA zona waktu, dan formulir admin
// mengisinya dari <input type="datetime-local"> — artinya yang tersimpan adalah
// jam dinding apa adanya, bukan momen absolut. Date.UTC dipakai supaya angka
// yang masuk tetap 13:00 di mana pun skrip ini dijalankan; kalau memakai
// new Date("2026-09-26T13:00:00") hasilnya bergeser mengikuti zona waktu mesin
// yang menjalankannya.
const startAt = new Date(Date.UTC(2026, 8, 26, 13, 0, 0)); // 26 Sep 2026, 13:00 CST
const endAt = new Date(Date.UTC(2026, 8, 26, 18, 0, 0)); //   26 Sep 2026, 18:00 CST

async function main() {
  const [existing] = await db.select().from(events).where(eq(events.slug, SLUG));

  const eventValues = {
    title: "WIF 2026 (Welcoming Indonesian Freshman)",
    slug: SLUG,
    location: "Novotel Hotel (Daminglu Station Line 3)",
    startAt,
    endAt,
    // Form pendaftaran WIF: biodata lengkap peserta + entrance fee bertingkat.
    requiresBiodata: true,
    isPaid: true,
    paymentInstructions: PAYMENT_INSTRUCTIONS,
    // Sengaja draft. Pengurus yang memutuskan kapan tampil ke publik.
    status: "draft" as const,
  };

  let eventId: string;
  if (existing) {
    // Deskripsi, kapasitas, sampul, dan status TIDAK ditimpa: kalau sudah
    // disunting lewat console, menjalankan skrip ini lagi tidak boleh
    // membatalkan suntingan itu. requiresBiodata/isPaid/instruksi bayar ikut
    // di-set karena itu bagian dari "bentuk form WIF" yang skrip ini definisikan.
    await db
      .update(events)
      .set({
        title: eventValues.title,
        location: eventValues.location,
        startAt,
        endAt,
        requiresBiodata: true,
        isPaid: true,
        paymentInstructions: PAYMENT_INSTRUCTIONS,
      })
      .where(eq(events.id, existing.id));
    eventId = existing.id;
    console.log(`Acara sudah ada, diperbarui: ${eventValues.title}`);
  } else {
    const [created] = await db.insert(events).values(eventValues).returning({ id: events.id });
    eventId = created.id;
    console.log(`Acara dibuat sebagai DRAFT: ${eventValues.title}`);
  }

  // Kategori tarif (upsert per label).
  let tarifBaru = 0;
  for (const [i, opt] of FEE_OPTIONS.entries()) {
    const [found] = await db
      .select({ id: eventFeeOptions.id })
      .from(eventFeeOptions)
      .where(and(eq(eventFeeOptions.eventId, eventId), eq(eventFeeOptions.label, opt.label)));
    if (found) {
      await db
        .update(eventFeeOptions)
        .set({ amountCny: opt.amountCny, orderIndex: i })
        .where(eq(eventFeeOptions.id, found.id));
    } else {
      await db.insert(eventFeeOptions).values({ eventId, label: opt.label, amountCny: opt.amountCny, orderIndex: i });
      tarifBaru++;
    }
  }
  console.log(`Kategori tarif: ${tarifBaru} dibuat, ${FEE_OPTIONS.length - tarifBaru} diperbarui.`);

  let dibuat = 0;
  let diperbarui = 0;

  async function upsertDivision(
    name: string,
    parentDivisionId: string | null,
    quota: number | null,
    jobDescription: string | undefined,
    orderIndex: number
  ): Promise<string> {
    const [found] = await db
      .select({ id: eventDivisions.id })
      .from(eventDivisions)
      .where(
        and(
          eq(eventDivisions.eventId, eventId),
          eq(eventDivisions.name, name),
          // Nama sub-tim bisa kembar antar departemen ("Perlengkapan" ada
          // sebagai departemen DAN sebagai sub-tim di bawahnya), jadi induknya
          // ikut jadi pembeda - tanpa ini keduanya saling menimpa.
          parentDivisionId ? eq(eventDivisions.parentDivisionId, parentDivisionId) : isNull(eventDivisions.parentDivisionId)
        )
      );

    if (found) {
      await db
        .update(eventDivisions)
        .set({ quota, jobDescription: jobDescription ?? null, orderIndex })
        .where(eq(eventDivisions.id, found.id));
      diperbarui++;
      return found.id;
    }

    const [created] = await db
      .insert(eventDivisions)
      .values({ eventId, parentDivisionId, name, quota, jobDescription: jobDescription ?? null, orderIndex })
      .returning({ id: eventDivisions.id });
    dibuat++;
    return created.id;
  }

  for (const [i, dept] of STRUCTURE.entries()) {
    const deptId = await upsertDivision(dept.name, null, dept.quota, dept.jobDescription, i);
    for (const [j, sub] of dept.children.entries()) {
      await upsertDivision(sub.name, deptId, sub.quota, sub.jobDescription, j);
    }
  }

  const totalKursi = STRUCTURE.reduce(
    (sum, d) => sum + (d.quota ?? 0) + d.children.reduce((s, c) => s + (c.quota ?? 0), 0),
    0
  );

  console.log(`Divisi: ${dibuat} dibuat, ${diperbarui} diperbarui.`);
  console.log(`Total kursi berdivisi: ${totalKursi} (BPH + SC tidak termasuk - mereka tanpa divisi).`);
  console.log("");
  console.log("Langkah berikutnya, semuanya lewat /console/events:");
  console.log("  1. BPH + SC ditugaskan TANPA divisi (Ketua Pelaksana, Wakil, Bendahara,");
  console.log("     Sekretaris, Supervisory Committee) - peran mereka berdiri sendiri.");
  console.log("  2. Ketua tiap departemen ditugaskan ke divisi departemennya, peran 'ketua'.");
  console.log("  3. Anggota ditugaskan ke sub-timnya, peran 'anggota'.");
  console.log("  4. Job description Dept. EO & Keuangan masih kosong - isi kalau sudah ada.");
  console.log("  5. Acaranya masih DRAFT. Ubah ke 'published' saat siap tampil.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
