// Evaluasi offline retrieval guidebook maba (docs/guidebook-golden.json).
// Tanpa LLM dan tanpa tulis ke database: panggilan luarnya cuma findGuideChunks,
// jadi hasilnya bisa dibandingkan antar perubahan retrieval.
//
// Empat kelompok dinilai terpisah karena retrieval hanya boleh menyentuh topik
// yang sudah direview (findGuideChunks menyaring is_public + reviewed_at +
// belum kedaluwarsa):
// - recall@4 atas pertanyaan yang topiknya sudah direview. Ambang 0,80: empat
//   potongan (MAX_CHUNKS) adalah konteks maksimum yang benar-benar dikirim ke
//   model, jadi angka ini mengukur retrieval yang terpakai. Target rencana
//   (0,85) adalah sasaran setelah sinonim dan korpusnya dirawat, bukan gerbang
//   push. Selama baru satu topik yang direview, angka ini memang hanya mewakili
//   topik itu; daftarnya ikut tumbuh sendiri begitu topik lain direview.
// - baris fakta sampai ke konteks model: pertanyaan yang jawabannya ada di
//   korpus, tapi artikelnya bukan peringkat pertama. Wajib semuanya. Retrieval
//   bisa benar dan jawabannya tetap tidak ada di konteks kalau penyusunan
//   konteksnya yang memotong - dulu begitu, dan yang terlihat di layar cuma
//   penolakan "sumber belum memuat". Lihat CONTEXT_FACTS di bawah.
// - pending_review: topiknya ada di korpus tapi belum direview. Wajib nol
//   potongan - inilah gerbang yang menahan materi visa/biaya yang belum
//   diverifikasi keluar dari jawaban. Setelah topiknya direview, hapus tanda
//   ini; kalau lupa, grupnya langsung melaporkan BOCOR dan keluar kode 1.
// - must_refuse: di luar korpus sama sekali. Wajib nol potongan juga; satu
//   potongan saja sudah cukup membuat bot menjawab dari guidebook padahal
//   topiknya tidak ada di sana.
// Keluar dengan kode 1 kalau recall@4 di bawah ambang atau ada satu saja
// pertanyaan pending_review / must_refuse / baris fakta yang gagal.
//
// Jalankan: npx tsx --env-file=.env.local src/db/eval-guidebook.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildGuideContext, findGuideChunks } from "@/lib/guidebook-search";
import { detectAnswerLanguage, type AnswerLanguage } from "@/lib/groq";

const GOLDEN_PATH = join(process.cwd(), "docs", "guidebook-golden.json");
const RECALL_TARGET = 0.8;
// Ambang grup salah ketik. Angkanya bukan "sebagus mungkin": koreksi kata hanya
// boleh menambah, tidak boleh mengurangi - pertanyaan yang tadinya terjawab
// tidak boleh jadi ditolak hanya karena satu huruf tertukar.
const TYPO_RECALL_TARGET = 0.95;
const TOP_N = 4;

/**
 * Pertanyaan yang faktanya ada di korpus, tapi artikel jawabannya tidak selalu
 * jadi peringkat pertama. Yang diuji di sini bukan retrieval, melainkan teks
 * yang benar-benar dikirim ke model setelah semua artikel peringkat disusun
 * buildGuideContext. Dulu tiap artikel dipotong sampai MAX_CHUNK_CHARS_TOTAL
 * (3600) sementara anggaran totalnya 7000, jadi artikel peringkat 2-4 hilang
 * dari konteks - model menjawab "sumber belum memuat" untuk fakta yang ada,
 * sementara UI tetap menyitasi artikelnya. Potongan `fact` diambil dari baris
 * `src` supaya teksnya bisa dicek langsung di dokumennya (baris yang menjawab
 * pertanyaannya, bukan ringkasan yang ditulis ulang).
 */
const CONTEXT_FACTS: { question: string; src: string }[] = [
  { question: "Kalau saya mendarat tengah malam, di mana SIM sementara harus diambil?", src: "docs/guidebook/transportasi-dari-bandara-ke-kampus.md:33" },
  { question: "Apa istilah dan contoh aplikasi sepeda sewa yang dipakai orang lokal?", src: "docs/guidebook/bahasa-mandarin-sehari-hari.md:78" },
  { question: "Apa arti angka seperti 2分钟 di papan kedatangan halte bus?", src: "docs/guidebook/bahasa-mandarin-sehari-hari.md:82" },
  { question: "Kapan saya perlu memakai koin metro 地铁币?", src: "docs/guidebook/transportasi-dalam-kota.md:94" },
  { question: "Kapan kartu mahasiswa saya bisa diambil dan di ruangan mana?", src: "docs/guidebook/dokumen-dan-berkas-awal-datang.md:45" },
  { question: "Berapa harga asuransi kesehatan mahasiswa di NJU?", src: "docs/guidebook/biaya-hidup-bulan-pertama.md:49" },
  // Tiga kasus dari baterai uji 52 pertanyaan yang barisnya tidak ikut konteks:
  // alamat perpustakaan ada di artikel wisata yang judulnya bahasa Inggris, izin
  // menyetir internasional dan denda overstay ada di dua bagian terpisah artikel
  // visa. Ketiganya pertanyaan yang benar-benar ditanyakan maba.
  { question: "Alamat Perpustakaan Nanjing di mana, dan keluar exit berapa dari stasiun metronya?", src: "docs/guidebook/spot-wisata-dan-rekreasi.md:69" },
  { question: "Saya punya SIM internasional, bisa tidak dipakai untuk menyetir di Nanjing?", src: "docs/guidebook/visa-dan-izin-tinggal.md:173" },
  { question: "denda klo residence permit sya udh lewat msa brlaku brp ya?", src: "docs/guidebook/visa-dan-izin-tinggal.md:151" },
];

/**
 * Bahasa jawaban dihitung dari pertanyaannya, bukan dari namanya. Pertanyaan
 * Indonesia yang menulis istilah Inggris apa adanya ("residence permit",
 * "apply") pernah dihitung sebagai pertanyaan Inggris dan dijawab Inggris,
 * termasuk yang salah ketik berat seperti baris pertama di bawah ini - baris itu
 * disalin dari log pertanyaan asli.
 */
const LANGUAGE_CASES: { question: string; expect: AnswerLanguage }[] = [
  { question: "denda klo residence permit sya udh lewat msa brlaku brp ya?", expect: "id" },
  { question: "Kalau izin tinggal saya sudah lewat tanggal berlakunya, dendanya berapa?", expect: "id" },
  { question: "Saya punya SIM internasional, bisa tidak dipakai untuk menyetir di Nanjing?", expect: "id" },
  { question: "According to the NJU guide, what does a residence permit application usually cost?", expect: "en" },
  { question: "which mosques are outside nanjing city?", expect: "en" },
];

/** Baris `src` ("docs/guidebook/a.md:78") dipotong di 40 karakter pertama. */
function factLine(src: string): string {
  const at = src.lastIndexOf(":");
  const line = Number(src.slice(at + 1));
  const text = readFileSync(src.slice(0, at), "utf8").split("\n")[line - 1];
  if (!text || !text.trim()) throw new Error(`Baris kosong di ${src}`);
  return text.trim().slice(0, 40);
}

type GoldenCase = {
  question: string;
  expected_slug: string | null;
  must_refuse: boolean;
  pending_review: boolean;
};

/**
 * Varian salah ketik deterministik: dua huruf bersebelahan di kata terpanjang
 * (minimal 5 huruf) ditukar. Pertanyaan yang tidak punya kata sepanjang itu
 * dilewati, jadi korpus pertanyaan pendek tidak dipaksa ikut grup ini.
 */
function typoVariant(question: string): string | undefined {
  const parts = question.split(/(\s+)/);
  const index = parts.reduce((best, part, at) => {
    if (!/^[A-Za-z]{5,}$/.test(part)) return best;
    return best === -1 || part.length > parts[best].length ? at : best;
  }, -1);
  if (index === -1) return undefined;
  const letters = parts[index].split("");
  const swap = letters.findIndex((char, at) => at < letters.length - 1 && char !== letters[at + 1]);
  if (swap === -1) return undefined;
  [letters[swap], letters[swap + 1]] = [letters[swap + 1], letters[swap]];
  parts[index] = letters.join("");
  return parts.join("");
}

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

  // Grup salah ketik: pertanyaan golden yang sama, tapi dua huruf bersebelahan
  // di kata terpanjangnya tertukar. Bukan untuk mengukur koreksi kata secara
  // umum - varian ini mewakili kelas salah ketik yang paling sering muncul, dan
  // gerbangnya adalah recall@4 plus jumlah pertanyaan yang jadi ditolak.
  const typos = reviewed
    .map((item) => ({ item, typo: typoVariant(item.question) }))
    .filter((entry): entry is { item: GoldenCase; typo: string } => entry.typo !== undefined);
  let typoHits = 0;
  let typoRefusals = 0;
  const typoMisses: string[] = [];
  for (const { item, typo } of typos) {
    const chunks = await findGuideChunks(typo);
    if (chunks.length === 0) typoRefusals += 1;
    const top = chunks.slice(0, TOP_N);
    if (top.some((chunk) => chunk.slug === item.expected_slug)) typoHits += 1;
    else typoMisses.push(`  - ${typo}\n      harap: ${item.expected_slug}\n      dapat: ${describe(top)}`);
  }
  const typoRecall = typos.length > 0 ? typoHits / typos.length : 0;
  console.log(`\nRecall@${TOP_N} (pertanyaan di atas dengan satu salah ketik): ${typoHits}/${typos.length} = ${typoRecall.toFixed(3)} (ambang ${TYPO_RECALL_TARGET.toFixed(2)}, ditolak ${typoRefusals})`);
  if (typoMisses.length > 0) {
    console.log(`Gagal recall salah ketik (${typoMisses.length}):`);
    console.log(typoMisses.join("\n"));
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

  const contextMisses: string[] = [];
  console.log(`\nBaris fakta sampai ke konteks model (${CONTEXT_FACTS.length} pertanyaan, wajib semuanya):`);
  for (const item of CONTEXT_FACTS) {
    const fact = factLine(item.src);
    const chunks = await findGuideChunks(item.question);
    const context = buildGuideContext(chunks, "id");
    const ok = chunks.length > 0 && context.includes(fact);
    if (!ok) contextMisses.push(`  - ${item.question}\n      baris: ${fact}\n      peringkat: ${describe(chunks)}\n      konteks: ${context.length} karakter`);
    console.log(`  [${ok ? "OK" : "HILANG"}] ${item.question} -> ${fact}`);
  }

  // Tidak memanggil model dan tidak menyentuh retrieval: cuma daftar kata di
  // src/lib/groq.ts. Kalau daftar itu diubah, kasusnya kelihatan di sini, bukan
  // lewat keluhan "chatbotku dijawab Inggris".
  const languageMisses: string[] = [];
  console.log(`\nBahasa jawaban (${LANGUAGE_CASES.length} pertanyaan, wajib semuanya):`);
  for (const item of LANGUAGE_CASES) {
    const got = detectAnswerLanguage(item.question);
    if (got !== item.expect) languageMisses.push(`  - ${item.question} -> ${got} (harusnya ${item.expect})`);
    console.log(`  [${got === item.expect ? "OK" : "SALAH"}] ${got} <- ${item.question}`);
  }

  const failures: string[] = [];
  if (contextMisses.length > 0) {
    console.log(`\nGagal konteks (${contextMisses.length}):`);
    console.log(contextMisses.join("\n"));
  }
  if (recall < RECALL_TARGET) failures.push(`recall@${TOP_N} ${recall.toFixed(3)} < ${RECALL_TARGET}`);
  if (typoRecall < TYPO_RECALL_TARGET) failures.push(`recall@${TOP_N} salah ketik ${typoRecall.toFixed(3)} < ${TYPO_RECALL_TARGET}`);
  if (pendingLeaks.length > 0) failures.push(`${pendingLeaks.length} pertanyaan pending_review masih mengambil potongan`);
  if (refusalLeaks.length > 0) failures.push(`${refusalLeaks.length} pertanyaan must_refuse masih mengambil potongan`);
  if (contextMisses.length > 0) failures.push(`${contextMisses.length} baris fakta tidak sampai ke konteks model`);
  if (languageMisses.length > 0) failures.push(`${languageMisses.length} bahasa jawaban tidak sesuai`);

  if (failures.length > 0) {
    console.log(`\nGAGAL: ${failures.join("; ")}`);
    process.exit(1);
  }
  console.log(`\nLULUS: recall@${TOP_N} >= ${RECALL_TARGET}, pending_review dan must_refuse semuanya nol potongan, baris fakta sampai ke konteks, bahasa jawaban sesuai.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
