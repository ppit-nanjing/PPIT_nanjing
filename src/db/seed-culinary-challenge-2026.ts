/**
 * Membuat acara "Nanjing Culinary Challenge 2026" sebagai DRAFT, lengkap dengan
 * pertanyaan pendaftaran, struktur kepanitiaan (SK 082/A/SK/PPITNJ/X/2026,
 * 21 Okt 2026), dan form evaluasi peserta (disalin dari Fun Hike).
 *
 * Jalankan: npx tsx --env-file=.env src/db/seed-culinary-challenge-2026.ts
 *
 * IDEMPOTEN - acara dicari lewat slug tetap, pertanyaan lewat label, divisi lewat
 * (eventId, name, parent), panitia lewat (eventId, userId), kredit lewat
 * (eventId, displayName). Status acara tidak ditimpa kalau sudah diubah di console.
 *
 * Detail acara (jadwal, lokasi, kuota, gratis) hanya diisi saat acara DIBUAT;
 * acara yang sudah ada tidak ditimpa, supaya suntingan di /console/events tidak
 * hilang kalau skrip dijalankan ulang. Pertanyaan, evaluasi, dan panitia
 * disamakan ulang dengan isi skrip ini.
 *
 * YANG TIDAK DILAKUKAN SKRIP INI (belum ada datanya dari panitia): deskripsi
 * final, poster, QR grup peserta, dan jendela evaluasi panitia. Isi lewat
 * /console/events, lalu terbitkan.
 *
 * Pendaftaran: requiresSensus = true (pola Fun Hike). Yang sensusnya lengkap
 * hanya ditanya isian yang TIDAK ada di sensus; yang belum lengkap diarahkan
 * mengisi sensus dulu. Karena itu "nama", "asal kampus", dan "ID WeChat" dari
 * mockup panitia tidak dipasang sebagai pertanyaan - sudah tersedia dari
 * sensus (fullName / university / wechatId). Instagram tidak ada di sensus,
 * jadi tetap ditanya. Butir "Join group peserta" di mockup adalah langkah
 * SETELAH daftar, jadi masuk confirmationInfo (halaman tiket).
 *
 * Nama panitia dicocokkan ke akun lewat nama panjang di sensus. Tiga ejaan di
 * SK berbeda dari sensus (Airene/Airine, Armalia/Armelia, Devyln/Devlyn);
 * orangnya sama (akun & sensus unik), dan nama di bawah memakai ejaan sensus.
 */
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import {
  events,
  eventQuestions,
  eventEvaluationQuestions,
  eventDivisions,
  eventCommittee,
  eventCredits,
} from "./schema";

const SLUG = "nanjing-culinary-challenge-2026";
const SK = "SK 082/A/SK/PPITNJ/X/2026";

type Role = (typeof eventCommittee.role.enumValues)[number];

const QUESTIONS: { label: string; type: "text" | "radio"; options?: string; required: boolean }[] = [
  { label: "Nama Instagram", type: "text", required: true },
  { label: "Apakah kamu bersedia menjadi leader?", type: "radio", options: "Ya\nTidak", required: true },
  { label: 'Apakah kamu memiliki fitur "小荷包" yang bisa digunakan?', type: "radio", options: "Ya\nTidak", required: true },
];

// Disalin dari evaluasi peserta Fun Hike (333e0bc7...), urutan dan tipe sama.
// Satu-satunya perubahan: butir "lokasi dan rute hiking" -> "lokasi acara".
const EVAL_QUESTIONS: { label: string; type: string; options?: string; required: boolean }[] = [
  { label: "Secara keseluruhan, seberapa puas kamu dengan acara ini?", type: "stars", required: true },
  { label: "Bagaimana penilaianmu terhadap jalannya acara?", type: "stars", required: true },
  {
    label: "Bagaimana menurutmu lokasi acara yang dipilih?",
    type: "radio",
    options: "Sangat tidak sesuai\nTidak sesuai\nCukup\nSesuai\nSangat sesuai",
    required: true,
  },
  { label: "Ada saran atau masukan untuk acara ini?", type: "text", required: false },
  { label: "Jika acara ini diadakan kembali, apakah kamu tertarik untuk ikut?", type: "radio", options: "Ya\nTidak", required: true },
  { label: "Apa yang perlu diperbaiki untuk acara berikutnya?", type: "text", required: false },
];

// BPH - tanpa divisi. "Penanggung Jawab" = Steering Committee -> role supervisor
// (pola Nanjing Diaries / SKR / WIF). Sekretaris-Bendahara: enum tidak punya
// peran gabungan, jadi "sekretaris" + catatan.
const BPH: { userId: string; displayName: string; role: Role; roleLabel: string; note: string }[] = [
  { userId: "ae98eca5-30ea-4d7e-8554-da384ab66b0c", displayName: "Gwenny Ng", role: "supervisor", roleLabel: "Penanggung Jawab", note: `Penanggung Jawab (${SK})` },
  { userId: "b1b30003-c038-4548-ae11-fc72df437d49", displayName: "Shem William Oen", role: "supervisor", roleLabel: "Penanggung Jawab", note: `Penanggung Jawab (${SK})` },
  { userId: "9985ff7f-31e3-4c90-89f1-0619867399e2", displayName: "Florentcia Aileen", role: "ketua", roleLabel: "Ketua Pelaksana", note: `Ketua Pelaksana (${SK})` },
  { userId: "fd2b8b71-745a-44e1-b1af-bd8ca40907f7", displayName: "Clarissa Audrys Chandra", role: "sekretaris", roleLabel: "Sekretaris - Bendahara", note: `Sekretaris - Bendahara (${SK})` },
];

const STRUCTURE: { name: string; children: { name: string; members: { userId: string; displayName: string; role: Role }[] }[] }[] = [
  {
    name: "Divisi Umum",
    children: [
      {
        name: "Divisi Acara",
        members: [
          { userId: "30ebd235-d020-4ec6-a7e9-e3876fc2961b", displayName: "Airine Abanna Chan", role: "acara" }, // akun "Rin"
          { userId: "c35c3cb7-1a47-4095-860b-d48bcc35879c", displayName: "Dea Armelia Kitris Wirabhayu", role: "acara" },
          { userId: "07d9cdef-58ad-4bc1-b2dd-7bcffc769550", displayName: "Reynard Wijaya", role: "acara" }, // akun "Wijaya Reynard"
        ],
      },
      {
        name: "Divisi Hubungan Masyarakat",
        members: [
          { userId: "fa51e4af-fa14-44b8-9b82-8cc0a0f782a6", displayName: "Devlyn Lainardy", role: "humas" }, // akun "Devlynschool133"
          { userId: "d0950e52-1b3b-4ab5-9a42-527af761dd3a", displayName: "Shaun Aaron Huang", role: "humas" },
        ],
      },
      {
        name: "Divisi Dokumentasi",
        members: [
          { userId: "832af625-ecd7-4f9a-8dcf-d1defd66e231", displayName: "Darren Christopher Patte", role: "dokumentasi" }, // akun "Darren C. P."
        ],
      },
    ],
  },
];

async function upsertDivision(eventId: string, name: string, parentDivisionId: string | null, orderIndex: number): Promise<string> {
  const [found] = await db
    .select({ id: eventDivisions.id })
    .from(eventDivisions)
    .where(
      and(
        eq(eventDivisions.eventId, eventId),
        eq(eventDivisions.name, name),
        parentDivisionId ? eq(eventDivisions.parentDivisionId, parentDivisionId) : isNull(eventDivisions.parentDivisionId)
      )
    );
  if (found) {
    await db.update(eventDivisions).set({ orderIndex }).where(eq(eventDivisions.id, found.id));
    return found.id;
  }
  const [created] = await db.insert(eventDivisions).values({ eventId, parentDivisionId, name, orderIndex }).returning({ id: eventDivisions.id });
  return created.id;
}

async function main() {
  const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.slug, SLUG));
  let eventId: string;
  if (existing) {
    eventId = existing.id;
    console.log("Acara sudah ada, dipakai ulang.");
  } else {
    const [created] = await db
      .insert(events)
      .values({
        title: "Nanjing Culinary Challenge 2026",
        slug: SLUG,
        description: "Detail acara menyusul.",
        // Detail dari panitia (2026-10-21). Date.UTC supaya jam dinding CST
        // tersimpan apa adanya di kolom timestamp tanpa zona (pola
        // seed-fun-hike-2026.ts). Gratis; tanpa batas tanggal, hanya kuota 30.
        startAt: new Date(Date.UTC(2026, 10, 14, 16, 0, 0)),
        endAt: new Date(Date.UTC(2026, 10, 14, 19, 0, 0)),
        location: "南京义乌美食街 (Nanjing Yiwu Food Street), Tianyuan East Road No.388, dekat exit metro Longmiandadao",
        locationUrl: "https://surl.amap.com/iApQhsm1m5B0",
        capacity: 30,
        isPaid: false,
        requiresBiodata: false,
        requiresSensus: true,
        status: "draft",
        confirmationInfo: "Langkah berikutnya: join grup peserta Nanjing Culinary Challenge. Tautan / QR grup akan dibagikan panitia di halaman ini.",
      })
      .returning({ id: events.id });
    eventId = created.id;
    console.log("Acara dibuat sebagai DRAFT.");
  }

  let qBaru = 0;
  for (const [i, q] of QUESTIONS.entries()) {
    const [found] = await db
      .select({ id: eventQuestions.id })
      .from(eventQuestions)
      .where(and(eq(eventQuestions.eventId, eventId), eq(eventQuestions.label, q.label)));
    if (found) {
      await db.update(eventQuestions).set({ type: q.type, options: q.options ?? null, required: q.required, orderIndex: i }).where(eq(eventQuestions.id, found.id));
    } else {
      await db.insert(eventQuestions).values({ eventId, label: q.label, type: q.type, options: q.options ?? null, required: q.required, orderIndex: i });
      qBaru++;
    }
  }
  console.log(`Pertanyaan pendaftaran: ${qBaru} dibuat, ${QUESTIONS.length - qBaru} diperbarui.`);

  let eBaru = 0;
  for (const [i, q] of EVAL_QUESTIONS.entries()) {
    const [found] = await db
      .select({ id: eventEvaluationQuestions.id })
      .from(eventEvaluationQuestions)
      .where(and(eq(eventEvaluationQuestions.eventId, eventId), eq(eventEvaluationQuestions.audience, "peserta"), eq(eventEvaluationQuestions.label, q.label)));
    if (found) {
      await db
        .update(eventEvaluationQuestions)
        .set({ type: q.type, options: q.options ?? null, required: q.required, orderIndex: i + 1 })
        .where(eq(eventEvaluationQuestions.id, found.id));
    } else {
      await db
        .insert(eventEvaluationQuestions)
        .values({ eventId, audience: "peserta", label: q.label, type: q.type, options: q.options ?? null, required: q.required, orderIndex: i + 1 });
      eBaru++;
    }
  }
  console.log(`Evaluasi peserta: ${eBaru} dibuat, ${EVAL_QUESTIONS.length - eBaru} diperbarui.`);

  let panitiaBaru = 0;
  async function upsertCommittee(userId: string, role: Role, divisionId: string | null, note: string | null) {
    const [found] = await db
      .select({ id: eventCommittee.id })
      .from(eventCommittee)
      .where(and(eq(eventCommittee.eventId, eventId), eq(eventCommittee.userId, userId)));
    if (found) {
      await db.update(eventCommittee).set({ role, divisionId, note }).where(eq(eventCommittee.id, found.id));
    } else {
      await db.insert(eventCommittee).values({ eventId, userId, role, divisionId, note });
      panitiaBaru++;
    }
  }

  const credits: { displayName: string; roleLabel: string; userId: string }[] = [];
  for (const m of BPH) {
    await upsertCommittee(m.userId, m.role, null, m.note);
    credits.push({ displayName: m.displayName, roleLabel: m.roleLabel, userId: m.userId });
  }
  for (const [i, dept] of STRUCTURE.entries()) {
    const deptId = await upsertDivision(eventId, dept.name, null, i);
    for (const [j, sub] of dept.children.entries()) {
      const subId = await upsertDivision(eventId, sub.name, deptId, j);
      for (const m of sub.members) {
        await upsertCommittee(m.userId, m.role, subId, null);
        credits.push({ displayName: m.displayName, roleLabel: sub.name, userId: m.userId });
      }
    }
  }
  console.log(`event_committee: ${panitiaBaru} baru (total di SK: ${credits.length}).`);

  let kBaru = 0;
  for (const [i, c] of credits.entries()) {
    const [found] = await db
      .select({ id: eventCredits.id })
      .from(eventCredits)
      .where(and(eq(eventCredits.eventId, eventId), eq(eventCredits.displayName, c.displayName)));
    if (found) {
      await db.update(eventCredits).set({ roleLabel: c.roleLabel, userId: c.userId, orderIndex: i }).where(eq(eventCredits.id, found.id));
    } else {
      await db.insert(eventCredits).values({ eventId, displayName: c.displayName, roleLabel: c.roleLabel, userId: c.userId, orderIndex: i });
      kBaru++;
    }
  }
  console.log(`event_credits: ${kBaru} dibuat, ${credits.length - kBaru} diperbarui.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
