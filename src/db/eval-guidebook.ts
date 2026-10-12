// Evaluasi offline retrieval guidebook maba (docs/guidebook-golden.json).
// Tanpa LLM dan tanpa tulis ke database: satu-satunya panggilan luar adalah
// findGuideChunks, jadi hasilnya bisa dibandingkan antar perubahan retrieval.
//
// Tiga kelompok dinilai terpisah karena retrieval hanya boleh menyentuh topik
// yang sudah direview (findGuideChunks menyaring is_public + reviewed_at +
// belum kedaluwarsa):
// - recall@4 atas pertanyaan yang topiknya sudah direview. Ambang 0,80: empat
//   potongan (MAX_CHUNKS) adalah konteks maksimum yang benar-benar dikirim ke
//   model, jadi angka ini mengukur retrieval yang terpakai. Target rencana
//   (0,85) adalah sasaran setelah sinonim dan korpusnya dirawat, bukan gerbang
//   push. Selama baru satu topik yang direview, angka ini memang hanya mewakili
//   topik itu; daftarnya ikut tumbuh sendiri begitu topik lain direview.
// - pending_review: topiknya ada di korpus tapi belum direview. Wajib nol
//   potongan - inilah gerbang yang menahan materi visa/biaya yang belum
//   diverifikasi keluar dari jawaban. Setelah topiknya direview, hapus tanda
//   ini; kalau lupa, grupnya langsung melaporkan BOCOR dan keluar kode 1.
// - must_refuse: di luar korpus sama sekali. Wajib nol potongan juga; satu
//   potongan saja sudah cukup membuat bot menjawab dari guidebook padahal
//   topiknya tidak ada di sana.
// Keluar dengan kode 1 kalau recall@4 di bawah ambang atau ada satu saja
// pertanyaan pending_review / must_refuse yang menghasilkan potongan.
//
// Jalankan: npx tsx --env-file=.env.local src/db/eval-guidebook.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findGuideChunks } from "@/lib/guidebook-search";

const GOLDEN_PATH = join(process.cwd(), "docs", "guidebook-golden.json");
const RECALL_TARGET = 0.8;
const TOP_N = 4;

type GoldenCase = {
  question: string;
  expected_slug: string | null;
  must_refuse: boolean;
  pending_review: boolean;
};

function loadGolden(): GoldenCase[] {
  const parsed: unknown = JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${GOLDEN_PATH} harus berisi array pertanyaan yang tidak kosong`);
  }
  return parsed.map((entry, index) => {
    const item = entry as Partial<GoldenCase>;
    if (typeof item.question !== "string" || typeof item.must_refuse !== "boolean") {
      throw new Error(`Entri #${index + 1} tidak punya "question" dan "must_refuse"`);
    }
    if (item.must_refuse && item.pending_review) {
      throw new Error(`Entri #${index + 1} tidak bisa must_refuse sekaligus pending_review`);
    }
    if (!item.must_refuse && typeof item.expected_slug !== "string") {
      throw new Error(`Entri #${index + 1} wajib punya "expected_slug" karena tidak must_refuse`);
    }
    return {
      question: item.question,
      expected_slug: item.expected_slug ?? null,
      must_refuse: item.must_refuse,
      pending_review: item.pending_review === true,
    };
  });
}

/** Judul + slug unik urut peringkat - dipakai melaporkan apa yang keliru diambil sistem. */
function describe(chunks: { slug: string; title: string; section: string }[]): string {
  if (chunks.length === 0) return "(nol potongan)";
  return [...new Set(chunks.map((chunk) => `${chunk.title} (${chunk.section}) [${chunk.slug}]`))].join(" | ");
}

async function main() {
  const golden = loadGolden();
  const reviewed = golden.filter((item) => !item.must_refuse && !item.pending_review);
  const pending = golden.filter((item) => item.pending_review);
  const refusals = golden.filter((item) => item.must_refuse);

  let hits = 0;
  const misses: string[] = [];
  for (const item of reviewed) {
    const chunks = await findGuideChunks(item.question);
    const top = chunks.slice(0, TOP_N);
    if (top.some((chunk) => chunk.slug === item.expected_slug)) {
      hits += 1;
      continue;
    }
    misses.push(`  - ${item.question}\n      harap: ${item.expected_slug}\n      dapat: ${describe(top)}`);
  }

  console.log(`Total pertanyaan : ${golden.length}`);
  console.log(`  topik direview : ${reviewed.length}`);
  console.log(`  pending review : ${pending.length}`);
  console.log(`  harus menolak  : ${refusals.length}`);

  const recall = reviewed.length > 0 ? hits / reviewed.length : 0;
  console.log(`\nRecall@${TOP_N} (topik direview): ${hits}/${reviewed.length} = ${recall.toFixed(3)} (ambang ${RECALL_TARGET.toFixed(2)})`);
  if (misses.length > 0) {
    console.log(`Gagal recall (${misses.length}):`);
    console.log(misses.join("\n"));
  }

  const pendingLeaks: string[] = [];
  const pendingSources = new Set<string>();
  // Tanda pending_review diisi tangan: hapus begitu topiknya direview di DB,
  // kalau tidak grup ini langsung melaporkan BOCOR padahal isinya sudah sah.
  console.log(`\nPending review (${pending.length} pertanyaan, wajib nol potongan; tanda pending_review di docs/guidebook-golden.json diisi tangan dan wajib dihapus begitu topiknya direview):`);
  for (const item of pending) {
    const chunks = await findGuideChunks(item.question);
    if (chunks.length > 0) pendingLeaks.push(item.question);
    for (const chunk of chunks) pendingSources.add(chunk.slug);
    console.log(`  [${chunks.length === 0 ? "OK" : "BOCOR"}] ${item.question} -> ${describe(chunks)}`);
  }
  if (pendingSources.size > 0) {
    console.log(`  Ringkasan: ${pendingLeaks.length} pertanyaan dijawab potongan dari ${[...pendingSources].join(", ")}.`);
  }

  const refusalLeaks: string[] = [];
  console.log(`\nHarus menolak (${refusals.length} pertanyaan, wajib nol potongan):`);
  for (const item of refusals) {
    const chunks = await findGuideChunks(item.question);
    if (chunks.length > 0) refusalLeaks.push(item.question);
    console.log(`  [${chunks.length === 0 ? "OK" : "BOCOR"}] ${item.question} -> ${describe(chunks)}`);
  }

  const failures: string[] = [];
  if (recall < RECALL_TARGET) failures.push(`recall@${TOP_N} ${recall.toFixed(3)} < ${RECALL_TARGET}`);
  if (pendingLeaks.length > 0) failures.push(`${pendingLeaks.length} pertanyaan pending_review masih mengambil potongan`);
  if (refusalLeaks.length > 0) failures.push(`${refusalLeaks.length} pertanyaan must_refuse masih mengambil potongan`);

  if (failures.length > 0) {
    console.log(`\nGAGAL: ${failures.join("; ")}`);
    process.exit(1);
  }
  console.log(`\nLULUS: recall@${TOP_N} >= ${RECALL_TARGET}, pending_review dan must_refuse semuanya nol potongan.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
