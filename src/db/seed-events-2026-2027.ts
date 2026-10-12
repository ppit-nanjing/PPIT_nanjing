/**
 * Seed acara Kabinet PPIT Nanjing 2026/2027 — dari "Timeline Kabinet 2026-2027"
 * + slide RKC PPIT Nanjing 2026 (proker per divisi).
 *
 * Jalankan: npx tsx --env-file=.env src/db/seed-events-2026-2027.ts
 *
 * SIFAT SKRIP: INSERT-ONLY untuk acara.
 * - Acara dicocokkan lewat SLUG tetap. Kalau slug-nya sudah ada, acara TIDAK
 *   disentuh sama sekali — tanggal, deskripsi, status, dan sampul yang diisi
 *   pengurus lewat console tidak boleh tertimpa (beda dengan seed WIF yang
 *   memang mendefinisikan "bentuk form" acaranya).
 * - Yang selalu dipastikan ada: baris Divisi Penanggung Jawab
 *   (event_responsible_departments) — di-insert kalau belum ada, tidak pernah
 *   menghapus baris yang sudah ditambahkan pengurus.
 * - Semua acara baru dibuat `draft` (tidak tampil publik). Tanggal dikosongkan
 *   kecuali yang sudah pasti (NYALA 5 Des 2026 dari slide RKC); pengurus mengisi
 *   tanggal sisanya lewat console.
 *
 * Cakupan: hanya acara publik/kepanitiaan. Rapat internal (RUC/RKC/RKE,
 * rekrutmen, transisi, evaluasi kabinet) dan proker konten/online sengaja TIDAK
 * dibuat di sini. "[Acara 4/7/8]" di timeline belum punya nama — dilewati.
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import { departments, eventResponsibleDepartments, events } from "./schema";

type SeedEvent = {
  slug: string;
  title: string;
  description: string;
  // Nama departemen di `departments.name` (harus persis; dicek tepat 1 baris).
  pj: string[];
  // Kolom timestamp TANPA zona — Date.UTC dipakai supaya jam dindingnya sama
  // di mesin mana pun (pola yang sama dengan seed-wif-2026).
  startAt?: Date;
  endAt?: Date;
};

// Urutan mengikuti timeline periode (Jun 2026 → Jul 2027). Minggu mengikuti
// penomoran file aslinya (Minggu 1 = 07-13 Juni 2026).
const EVENTS: SeedEvent[] = [
  {
    slug: "welpar-2026",
    title: "Welpar — Welcoming Party",
    description: [
      "Acara bonding pengurus PPIT Nanjing untuk menyambut kabinet/panitia baru (internal kabinet).",
      "",
      "Rencana: Minggu 15 (Sep 2026) — tanggal pasti menyusul.",
    ].join("\n"),
    pj: ["Badan Pengurus Harian"],
  },
  {
    slug: "food-challenge-2026",
    title: "45 RMB Food Challenge",
    description: [
      "Kompetisi hunting makanan unik/lokal di Nanjing dengan budget 45 RMB per tim, lalu presentasi ke juri. Hasil rekomendasi diposting ke Instagram.",
      "",
      "Rencana: Minggu 23 (Nov 2026) — tanggal pasti menyusul.",
    ].join("\n"),
    pj: ["Divisi Kultura"],
  },
  {
    slug: "nyala-2026",
    title: "NYALA (Navigate Your LinkedIn and Lead Ahead)",
    description: [
      "Workshop interaktif LinkedIn: dasar & struktur profil, serta cara meningkatkan peluang kerja lewat platform ini. Target mahasiswa tahun akhir, sekitar 60 peserta.",
      "",
      "Rencana: sekitar 5 Desember 2026 (dari slide RKC; jam tentatif 13:00 CST).",
    ].join("\n"),
    pj: ["Divisi Akademia"],
    // Satu-satunya acara dengan tanggal konkret di sumber. "Sekitar 5 Des" →
    // disimpan apa adanya; jam belum dikonfirmasi.
    startAt: new Date(Date.UTC(2026, 11, 5, 13, 0, 0)),
  },
  {
    slug: "nusantara-hunt-2026",
    title: "Nusantara Hunt",
    description: [
      "Lomba checkpoint budaya di 百家湖 (Baijiahu): tim mengikuti referensi foto, menjawab kuis budaya, dan mengumpulkan stempel \"passport budaya\".",
      "",
      "Rencana: Minggu 29 (Des 2026) — tanggal pasti menyusul.",
    ].join("\n"),
    pj: ["Divisi Kultura"],
  },
  {
    slug: "champions-2027",
    title: "Champions — Acara Olahraga",
    description: [
      "Acara olahraga PPIT Nanjing (per catatan RKC: dikelola Divisi Pemberdayaan Sosial).",
      "",
      "Rencana: Minggu 41 (Mar 2027) — tanggal pasti menyusul.",
    ].join("\n"),
    pj: ["Divisi Pemberdayaan Sosial"],
  },
  {
    slug: "fun-run-2027",
    title: "Nanjing Community Fun Run",
    description: [
      "Community Fun Run & Walk 3 km non-kompetitif di Mochouhu dengan checkpoint interaktif. Pembagian pace Runner & Jogger; ada participant kit dan HTM ¥5–10.",
      "",
      "Rencana: April 2027 (Minggu 44) — tanggal pasti menyusul.",
    ].join("\n"),
    pj: ["Divisi Pemberdayaan Sosial"],
  },
  {
    slug: "pemilu-2027",
    title: "Pemilu — Pemilihan Umum Ketua PPIT Nanjing",
    description: [
      "Pemilihan Ketua PPIT Nanjing periode berikutnya (ditangani BPH). Formulir pendaftaran calon tersedia di menu Formulir → Pemilu.",
      "",
      "Rencana: Minggu 44–54 (Apr–Jun 2027).",
    ].join("\n"),
    pj: ["Badan Pengurus Harian"],
  },
  {
    slug: "wonders-2027",
    title: "Wonders — Festival Budaya Indonesia",
    description: [
      "Festival budaya Indonesia: cultural booth, games, makanan Indonesia, dan pertunjukan budaya. Terbuka untuk mahasiswa Indonesia maupun internasional.",
      "",
      "Rencana: Minggu 47 (Mei 2027) — tanggal pasti menyusul.",
    ].join("\n"),
    pj: ["Badan Pengurus Harian"],
  },
  {
    slug: "sketch-the-heritage-2027",
    title: "Sketch the Heritage",
    description: [
      "Mini kompetisi sketching & fotografi: menyusuri Nanjing Museum lalu lanjut sketsa di Xuanwu Lake. Gratis.",
      "",
      "Rencana: Minggu 50 (Mei 2027) — tanggal pasti menyusul.",
    ].join("\n"),
    pj: ["Divisi Kultura"],
  },
  {
    slug: "farewell-2027",
    title: "Farewell Party",
    description: [
      "Acara perpisahan pengurus kabinet (internal kabinet).",
      "",
      "Rencana: Minggu 51 (Mei–Jun 2027) — tanggal pasti menyusul.",
    ].join("\n"),
    pj: ["Badan Pengurus Harian"],
  },
  {
    slug: "skr-2027",
    title: "SKR — Simposium Kongres",
    description: [
      "Simposium Kongres; PPIT Nanjing menjadi tuan rumah periode ini. Persiapan panjang lintas divisi.",
      "",
      "Rencana: Minggu 56 (Jul 2027) — cek ulang tanggalnya ke panitia pusat.",
    ].join("\n"),
    pj: ["Badan Pengurus Harian"],
  },
];

// Acara yang SUDAH ada di sistem — hanya dipastikan baris Divisi PJ-nya.
// Jangan sentuh kolom lain: pengurus sudah mengisi datanya.
const EXISTING_PJ: { slug: string; pj: string[] }[] = [
  { slug: "sosialisasi-ds4m", pj: ["Divisi Hubungan Masyarakat"] },
  { slug: "wif-2026", pj: ["Badan Pengurus Harian"] },
  { slug: "fun-hike-pinyx-2026", pj: ["Divisi Pemberdayaan Sosial"] },
  { slug: "nanjing-diaries-2026", pj: ["Divisi Akademia"] },
];

async function departmentIdByName(name: string): Promise<string> {
  const rows = await db.select({ id: departments.id }).from(departments).where(eq(departments.name, name));
  if (rows.length !== 1) {
    // Jangan diam-diam melewati: baris PJ yang gagal ditulis membuat acaranya
    // tidak terlihat oleh divisi yang seharusnya mengurusnya.
    throw new Error(`Departemen "${name}" harus persis 1 baris, ketemu ${rows.length}.`);
  }
  return rows[0].id;
}

async function ensurePjRows(eventId: string, pjNames: string[], summary: { pjBaru: number; pjAda: number }) {
  for (const name of pjNames) {
    const departmentId = await departmentIdByName(name);
    // Insert idempoten per (event, departemen); baris yang sudah ada — termasuk
    // yang ditambahkan pengurus lewat console — tidak pernah dihapus/diubah.
    const inserted = await db
      .insert(eventResponsibleDepartments)
      .values({ eventId, departmentId })
      .onConflictDoNothing()
      .returning({ eventId: eventResponsibleDepartments.eventId });
    if (inserted.length > 0) summary.pjBaru++;
    else summary.pjAda++;
  }
}

async function main() {
  const summary = { dibuat: 0, dilewati: 0, pjBaru: 0, pjAda: 0 };

  for (const e of EVENTS) {
    const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.slug, e.slug));
    let eventId: string;
    if (existing) {
      eventId = existing.id;
      summary.dilewati++;
      console.log(`Dilewati (sudah ada): ${e.title}`);
    } else {
      const [created] = await db
        .insert(events)
        .values({
          title: e.title,
          slug: e.slug,
          description: e.description,
          startAt: e.startAt ?? null,
          endAt: e.endAt ?? null,
          status: "draft",
        })
        .returning({ id: events.id });
      eventId = created.id;
      summary.dibuat++;
      console.log(`Dibuat sebagai DRAFT: ${e.title}`);
    }
    await ensurePjRows(eventId, e.pj, summary);
  }

  for (const e of EXISTING_PJ) {
    const [existing] = await db.select({ id: events.id, title: events.title }).from(events).where(eq(events.slug, e.slug));
    if (!existing) {
      throw new Error(`Acara existing tidak ditemukan (slug ${e.slug}) — cek database target.`);
    }
    await ensurePjRows(existing.id, e.pj, summary);
    console.log(`Divisi PJ dipastikan: ${existing.title} → ${e.pj.join(", ")}`);
  }

  console.log("");
  console.log(
    `Selesai. Acara baru: ${summary.dibuat}, dilewati: ${summary.dilewati}. ` +
      `Baris PJ baru: ${summary.pjBaru}, sudah ada: ${summary.pjAda}.`,
  );
  console.log("Tanggal acara selain NYALA sengaja kosong — isi lewat /console/events saat sudah pasti.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
