import { and, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { helpArticles } from "@/db/schema";
import type { AnswerLanguage } from "./groq";

// Sumber jawaban chatbot Help Center (lihat buildChatSystemPrompt di
// src/lib/groq.ts). Chatbot tidak lagi boleh menjawab dari pengetahuan umum:
// jawabannya diambil dari artikel bantuan yang sudah diterbitkan pengurus
// (help_articles.is_public = true) - tabel yang sama yang dipakai pengurus
// untuk menulis panduan console, dan tempat guidebook maba akan ditulis nanti.
//
// Retrieval-nya leksikal (ILIKE per kata kunci + skor di JS), bukan embedding.
// Korpusnya puluhan artikel dan seluruhnya masih muat di konteks model, jadi
// pencarian vektor hanya menambah vendor (Groq tidak punya endpoint
// embeddings), biaya per artikel yang diubah, dan satu titik gagal baru -
// tanpa menambah recall yang berarti. Kalau korpusnya nanti membengkak sampai
// top-N potongan tidak lagi mewakili isinya, pertimbangkan pgvector saat itu,
// bukan sekarang.
//
// Yang diambil HANYA artikel publik: artikel console (SOP pengurus) tidak
// boleh bocor ke jawaban chatbot anggota.

/**
 * Gerbang tunggal artikel yang boleh dipakai menjawab: publik, sudah ditinjau
 * pengurus, dan belum kedaluwarsa. Topik guidebook yang belum ditinjau masih
 * draf, dan yang sudah lewat masa berlakunya bisa sudah salah - keduanya tidak
 * boleh dikutip ke maba. Dipakai retrieval di sini dan pembacaan potongan di
 * src/lib/guide-answer.ts (jalur cache), jadi satu definisi saja.
 */
export const RETRIEVABLE_ARTICLE = sql`${helpArticles.isPublic} = true and ${helpArticles.reviewedAt} is not null and (${helpArticles.expiresAt} is null or ${helpArticles.expiresAt} > now())`;

export type GuideChunk = {
  slug: string;
  section: string;
  title: string;
  content: string;
  // Terjemahan Inggris artikel (help_articles.title_en/section_en/content_en).
  // Null = belum diterjemahkan; pertanyaannya tetap dijawab dari teks Indonesia.
  titleEn: string | null;
  sectionEn: string | null;
  contentEn: string | null;
  // Indeks tempat lengkap artikel, dihitung dari teks penuh sebelum jendela
  // memotongnya (placeIndex di src/lib/chat-places.ts). Kosong untuk baris
  // kandidat mentah; rankArticles yang mengisinya.
  places?: string[];
  placesEn?: string[];
};

/** Satu baris kandidat dari DB - dipisah dari GuideChunk supaya skoring bisa diuji tanpa database. */
export type GuideRow = GuideChunk;

/** Batas potongan & panjang konteks: cukup untuk jawaban 1-3 paragraf, tetap murah per pesan. */
export const MAX_CHUNKS = 4;
/** Judul artikel dan judul bagian yang selalu ditulis di depan tiap potongan. */
const ARTICLE_HEADER_CHARS = 80;
/** Jatah indeks tempat (maks MAX_INDEX_ROWS baris, lihat chat-places.ts). */
const PLACE_INDEX_CHARS = 1600;
/**
 * Anggaran teks seluruh artikel dalam satu pertanyaan. Setiap artikel yang
 * dikutip dijamin dapat seluruh jendelanya (MAX_CHUNK_CHARS_TOTAL - jendela
 * utama plus jendela kedua), lalu sisanya dipakai indeks tempat.
 *
 * Dulu 7000: lebih kecil dari dua jendela penuh, jadi satu artikel bisa
 * menghabiskan seluruh anggaran, perulangannya berhenti, dan artikel peringkat
 * 2-4 - yang justru memuat jawabannya - tidak pernah masuk konteks padahal UI
 * tetap menyitirnya (14 dari 17 kegagalan pada uji 52 pertanyaan).
 *
 * Lalu MAX_CHUNK_CHARS saja per artikel: jendela keduanya dihitung tapi tidak
 * pernah muat, jadi baris jawaban yang cuma ada di jendela kedua (uraian "SIM
 * internasional tidak berlaku di Nanjing", denda "500 RMB per hari") tetap
 * hilang dari prompt - sama saja dengan tidak punya jendela kedua. Anggarannya
 * sekarang seukur jendela: 4 x MAX_CHUNK_CHARS_TOTAL + indeks tempat (sekitar
 * 16 KB, kurang lebih 12 ribu token). Prompt jadi sekitar 1.7x lebih panjang;
 * kalau biayanya suatu saat lebih penting daripada kasus yang hilang itu,
 * ubah satu baris ini - bukan memotong jendela kedua di tiga tempat berbeda.
 */
const MAX_CONTEXT_CHARS = MAX_CHUNKS * (MAX_CHUNK_CHARS_TOTAL + ARTICLE_HEADER_CHARS) + PLACE_INDEX_CHARS;

// Tanpa batas LIMIT: skoringnya di JS, dan LIMIT tanpa ORDER BY membuang kandidat
// secara acak - artikel terbaik bisa hilang sebelum sempat diskor. Korpusnya
// masih puluhan artikel; kalau nanti membengkak, ganti ke FTS dengan peringkat di
// DB (lihat rencana P1 di docs/Guidebook Maba.md), bukan menambah LIMIT lagi.

import { MAX_CHUNK_CHARS_TOTAL, SUFFIXES, buildCorpusVocabulary, correctQuestionTypo, escapedTerm, questionEntities, searchTerms, stemmedText, windowAroundTerms, type CorpusVocabulary } from "./guidebook-terms";
import { placeIndex } from "./chat-places";

/**
 * Pencocokan kata utuh, bukan substring: kata kunci "berapa" tidak boleh cocok
 * karena artikel memuat "beberapa", dan "bawa" bukan alasan karena ada "bawaan".
 * Query DB tetap ILIKE sebagai penyaring kasar (murah dan indeksnya sudah ada),
 * tapi kecocokan yang dihitung selalu lewat pola berbatas kata ini. Istilah
 * majemuk dari sinonim ("izin tinggal") dicocokkan sebagai frasa.
 *
 * Akhiran yang dibuang normalizeToken boleh ada lagi di korpus, karena kata
 * kunci pertanyaan dan kata di artikel jarang memakai imbuhan yang sama:
 * "bagaimana cara memperpanjang paspor?" jadi kata kunci "perpanjang" (awalan
 * "mem" dibuang searchTerms), sementara artikelnya berjudul "Perpanjangan
 * Paspor" dan isinya menulis "perpanjangan". Tanpa akhiran opsional ini tidak
 * ada satu pun pola berbatas kata yang cocok, dan topik yang sudah direview
 * dijawab "belum ada panduan".
 *
 * Awalan tidak ikut opsional: "masuk" bukan "termasuk" dan "kamar" bukan
 * "berkamar", sedangkan menoleransinya membuat kata umum mencocokkan artikel
 * yang cuma memuat turunannya - recall grup salah ketik di
 * src/db/eval-guidebook.ts turun begitu awalan ditoleransi.
 */
function termPattern(term: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapedTerm(term)}(?:${SUFFIXES.join("|")})?(?![\\p{L}\\p{N}])`, "u");
}

// Ambang relevansi - satu-satunya knob yang menukar recall dengan penolakan.
// Kecocokan kata utuh saja belum cukup: artikel transportasi juga memuat "kota",
// "kampus", "mahasiswa", dan "pakai", jadi pertanyaan tentang kota lain, asrama,
// atau cara bayar ikut terbawa. Yang dihitung adalah istilah berbeda setelah
// dinormalkan ("dipakai" dan "pakai" satu konsep, bukan dua), dan potongan lolos
// kalau salah satu:
// - MIN_MATCHED_TERMS konsep cocok, walau pertanyaannya panjang dan banyak kata
//   tambahan yang tidak ada di artikelnya ("berapa tarif metro dari bandara ke
//   pusat kota Nanjing?" -> metro, bandara, kota, tarif), atau
// - MIN_MATCHED_FOR_COVERAGE konsep cocok dan menutup MIN_COVERAGE_FOR_TWO dari
//   istilah pertanyaan, jalur pertanyaan pendek ("dari bandara Lukou ke kampus
//   naik apa ya?" -> bandara, kampus = 2/4; pertanyaan satu kata "asrama" atau
//   "Yikatong" lolos lewat cakupan 100%).
// Pertanyaan yang hanya menyerempet satu-dua kata umum berhenti di sini dan
// dijawab dengan penolakan tetap, bukan oleh Groq. Topik yang belum direview
// (profil-ppit-nanjing, tempat-tinggal-asrama-dan-kos) tetap ditolak sampai
// artikelnya direview - setelah itu artikel yang benar menang sendiri lewat
// skor, bukan lewat ambang ini.
const MIN_MATCHED_TERMS = 3;
const MIN_MATCHED_FOR_COVERAGE = 2;
const MIN_COVERAGE_FOR_TWO = 0.5;

/** Skor satu artikel dalam satu bahasa, sebelum digabung dengan versi bahasa lainnya. */
type ViewScore = { score: number; matched: Set<string>; entityHit: boolean };

/**
 * Skor sederhana: judul paling menentukan, lalu bagian, lalu isi (dibatasi 3
 * hitungan supaya artikel panjang tidak menang hanya karena panjang).
 * Kecocokan substring tidak dihitung sama sekali; kandidat yang hanya cocok
 * sebagai potongan kata dibuang, dan yang di bawah ambang relevansi juga.
 *
 * Dua sisi dibandingkan dalam bentuk yang sama: kata kunci dari searchTerms
 * sudah lewat normalizeToken, jadi teks artikelnya juga lewat stemmedText
 * sebelum dicocokkan. Tanpa itu imbuhan korpus memutus kecocokan kata utuh -
 * pertanyaan "bagaimana cara memperpanjang paspor?" jadi kata kunci
 * "perpanjang", sementara artikelnya menulis judul "Perpanjangan Paspor" dan
 * isinya "perpanjangan", sehingga pola berbatas kata tidak pernah cocok dan
 * topik yang ada di korpus dijawab "belum ada panduan".
 */
export function rankArticles(terms: string[], rows: GuideRow[], entityTerms: string[] = []): GuideChunk[] {
  const termRes = terms.map((term) => ({ stem: stemmedText(term), re: termPattern(term) }));
  const entityRes = entityTerms.map(termPattern);

  const mark = (title: string, section: string, content: string): ViewScore => {
    const lowTitle = title.toLowerCase();
    const lowSection = section.toLowerCase();
    const lowContent = content.toLowerCase();
    let score = 0;
    const matchedStems = new Set<string>();
    for (const { stem, re } of termRes) {
      let hit = false;
      if (re.test(lowTitle)) {
        score += 4;
        hit = true;
      }
      if (re.test(lowSection)) {
        score += 2;
        hit = true;
      }
      const hits = lowContent.split(re).length - 1;
      if (hits > 0) {
        score += Math.min(hits, 3);
        hit = true;
      }
      if (hit) matchedStems.add(stem);
    }
    // Nama entitas ("ppit", "nanjing") tidak masuk kata kunci karena muncul di
    // hampir semua artikel. Judul dan bagian tetap dinilai: di situ namanya
    // memang menunjukkan topik artikelnya.
    let entityHit = false;
    for (const re of entityRes) {
      if (re.test(lowTitle)) {
        score += 4;
        entityHit = true;
      }
      if (re.test(lowSection)) {
        score += 2;
        entityHit = true;
      }
    }
    return { score, matched: matchedStems, entityHit };
  };

  const scored = rows.map((row) => {
    // Pertanyaan Inggris tidak pernah cocok dengan judul/isi Indonesia ("worship"
    // vs "tempat ibadah"), jadi judul, bagian, dan isi dinilai dua kali: versi
    // Indonesia dan versi Inggris. Kata kunci yang cocok dihitung gabungan dari
    // kedua versi - satu artikel memang satu dokumen dua bahasa, dan istilah
    // sinonimnya ikut dua bahasa ("passport" ada di teks Inggris, "paspor" di
    // teks Indonesia, keduanya menjawab pertanyaan yang sama). Skornya tetap
    // maksimum salah satu versi supaya kata yang muncul di dua bahasa tidak
    // dihitung dobel. Artikel tanpa terjemahan hanya punya versi Indonesia, jadi
    // perilakunya seperti semula.
    const idMark = mark(row.title, row.section, row.content ?? "");
    const enMark = mark(row.titleEn ?? "", row.sectionEn ?? "", row.contentEn ?? "");
    const score = Math.max(idMark.score, enMark.score);
    const entityHit = idMark.entityHit || enMark.entityHit;
    const matched = new Set([...idMark.matched, ...enMark.matched]).size;
    // Pertanyaan pendek ("cuaca", "biaya kos") tidak mungkin mencocokkan 3
    // kata kunci, jadi ambangnya disesuaikan jumlah kata kuncinya sendiri:
    // semua kata kunci harus cocok. Aturan 3-kata dan coverage tetap berlaku
    // untuk pertanyaan panjang.
    const minTerms = Math.min(MIN_MATCHED_TERMS, terms.length);
    const relevant =
      terms.length > 0
        ? matched >= minTerms ||
          (matched >= MIN_MATCHED_FOR_COVERAGE && matched / terms.length >= MIN_COVERAGE_FOR_TWO)
        : entityHit;
    return { row, score, relevant };
  });

  return scored
    .filter((s) => s.relevant && s.score > 0)
    .sort((a, b) => b.score - a.score || a.row.title.localeCompare(b.row.title))
    .slice(0, MAX_CHUNKS)
    .map((s) => ({
      ...s.row,
      content: windowAroundTerms(s.row.content, terms),
      contentEn: s.row.contentEn === null ? null : windowAroundTerms(s.row.contentEn, terms),
      places: placeIndex(s.row.content),
      placesEn: s.row.contentEn === null ? undefined : placeIndex(s.row.contentEn),
    }));
}

/**
 * Kandidat dari DB: artikel yang sudah ditandai publik dan memuat minimal satu kata kunci.
 *
 * Salah ketik ditangani dengan mengulang seluruh pencarian sekali memakai
 * pertanyaan yang kata-katanya sudah dibetulkan - bukan dengan menyunting daftar
 * kata kunci, supaya sinonim, batang kata, dan batas jumlah kata kunci berlaku
 * sama seperti pertanyaan yang diketik benar. Hasil koreksi hanya dipakai kalau
 * benar-benar mengembalikan potongan; kalau tidak menolong, jawabannya tetap
 * seperti sebelum ada koreksi.
 */
export async function findGuideChunks(question: string): Promise<GuideChunk[]> {
  return retrieve(question, false);
}

async function retrieve(question: string, correctedOnce: boolean): Promise<GuideChunk[]> {
  const terms = searchTerms(question);
  const entities = questionEntities(question);
  if (terms.length === 0) return findEntityChunks(question);

  const rows = await candidateRows(terms, entities);
  const chunks = rankArticles(terms, rows, entities);
  if (correctedOnce) return chunks;
  const missing = terms.some((term) => {
    const re = termPattern(term);
    return !rows.some((row) => re.test(rowText(row)));
  });
  if (!missing) return chunks;

  const fixed = await correctedQuestion(question);
  if (fixed === undefined) return chunks;
  const retried = await retrieve(fixed, true);
  return retried.length > 0 ? retried : chunks;
}

/** Pertanyaan dengan kata yang salah ketik dibetulkan, atau undefined kalau kosakatanya tidak menolong. */
async function correctedQuestion(question: string): Promise<string | undefined> {
  return correctQuestionTypo(question, await loadCorpusVocabulary());
}

/** Kolom teks satu baris kandidat, bahasa Indonesia dan Inggris. */
function rowText(row: Omit<GuideRow, "content"> & { content: string | null }): string {
  return [row.title, row.section, row.content ?? "", row.titleEn ?? "", row.sectionEn ?? "", row.contentEn ?? ""].join("\n");
}

/** Kandidat dari DB: artikel publik & sudah ditinjau yang memuat minimal satu kata kunci atau entitas. */
async function candidateRows(terms: string[], entities: string[]): Promise<GuideRow[]> {
  const matches: SQL[] = [];
  for (const term of terms) {
    const pattern = `%${term}%`;
    matches.push(ilike(helpArticles.title, pattern));
    matches.push(ilike(helpArticles.section, pattern));
    matches.push(ilike(helpArticles.content, pattern));
    // Pertanyaan Inggris ("where do I worship", "shipping boxes") hanya cocok
    // kalau kolom terjemahannya ikut disaring - di versi Indonesia kata itu tidak
    // ada. Kandidatnya tetap disaring ulang oleh rankArticles.
    matches.push(ilike(helpArticles.titleEn, pattern));
    matches.push(ilike(helpArticles.sectionEn, pattern));
    matches.push(ilike(helpArticles.contentEn, pattern));
  }
  // Entitas tetap jadi kandidat walau ada kata kunci lain: "apa bedanya PPIT
  // dan PPIT Nanjing" hanya menyisakan kata "beda" sebagai kata kunci, padahal
  // topiknya jelas. Isi artikel tidak dicocokkan untuk entitas - "nanjing" ada
  // di hampir semua topik.
  for (const entity of entities) {
    const pattern = `%${entity}%`;
    matches.push(ilike(helpArticles.title, pattern));
    matches.push(ilike(helpArticles.section, pattern));
    matches.push(ilike(helpArticles.titleEn, pattern));
    matches.push(ilike(helpArticles.sectionEn, pattern));
  }

  const rows = await db
    .select({
      slug: helpArticles.slug,
      section: helpArticles.section,
      title: helpArticles.title,
      content: helpArticles.content,
      titleEn: helpArticles.titleEn,
      sectionEn: helpArticles.sectionEn,
      contentEn: helpArticles.contentEn,
    })
    .from(helpArticles)
    .where(and(RETRIEVABLE_ARTICLE, or(...matches)));

  return rows.map((row) => ({ ...row, content: row.content ?? "" }));
}

/**
 * Kosakata korpus untuk koreksi salah ketik. Satu query penuh tabel, dan itu
 * memang disengaja: korpusnya puluhan artikel (±200 KB) sementara koreksi baru
 * berguna kalau tahu kata mana yang benar-benar ada di artikel. Panggilannya
 * sendiri sudah dijaga - hanya jalan kalau ada kata kunci yang tidak muncul di
 * kandidat mana pun.
 */
async function loadCorpusVocabulary(): Promise<CorpusVocabulary> {
  const rows = await db
    .select({
      slug: helpArticles.slug,
      section: helpArticles.section,
      title: helpArticles.title,
      content: helpArticles.content,
      titleEn: helpArticles.titleEn,
      sectionEn: helpArticles.sectionEn,
      contentEn: helpArticles.contentEn,
    })
    .from(helpArticles)
    .where(RETRIEVABLE_ARTICLE);
  return buildCorpusVocabulary(rows.map(rowText));
}

/**
 * Cadangan untuk pertanyaan yang seluruh katanya kata fungsi ("apa itu PPIT",
 * "where is nanjing at?"). Hanya judul dan bagian yang dicocokkan: kalau isi
 * artikel ikut dicari, "nanjing" ada di hampir semua artikel guidebook dan
 * peringkatnya jadi tidak berarti.
 */
async function findEntityChunks(question: string): Promise<GuideChunk[]> {
  const entities = questionEntities(question);
  if (entities.length === 0) return [];

  const matches: SQL[] = [];
  for (const entity of entities) {
    matches.push(ilike(helpArticles.title, `%${entity}%`));
    matches.push(ilike(helpArticles.section, `%${entity}%`));
    matches.push(ilike(helpArticles.titleEn, `%${entity}%`));
    matches.push(ilike(helpArticles.sectionEn, `%${entity}%`));
  }

  const rows = await db
    .select({
      slug: helpArticles.slug,
      section: helpArticles.section,
      title: helpArticles.title,
      content: helpArticles.content,
      titleEn: helpArticles.titleEn,
      sectionEn: helpArticles.sectionEn,
      contentEn: helpArticles.contentEn,
    })
    .from(helpArticles)
    .where(and(RETRIEVABLE_ARTICLE, or(...matches)));

  return rankArticles(
    [],
    rows.map((row) => ({ ...row, content: row.content ?? "" })),
    entities,
  );
}

/** Judul bagian yang menandai entri di luar kota pada artikel yang dikelompokkan per wilayah. */
const OUTSIDE_BLOCK = /^##\s+.*(?:luar|outside|郊区)/i;

/**
 * Bagian "di luar kota" didorong ke belakang supaya konteks dimulai dari entri
 * dalam kota - jawaban default untuk pertanyaan tanpa kata "luar kota". Hanya
 * mengubah urutan, tidak membuang bagian mana pun: pertanyaan lanjutan soal
 * masjid luar kota tetap terjawab dari konteks yang sama. Kalau potongan cuma
 * memuat satu kelompok, urutannya apa adanya.
 */
function inCityFirst(body: string): string {
  const blocks = body.split(/(?=^##\s)/m);
  if (blocks.length < 2) return body;
  const city = blocks.filter((block) => !OUTSIDE_BLOCK.test(block));
  const outside = blocks.filter((block) => OUTSIDE_BLOCK.test(block));
  return [...city, ...outside].join("");
}

/**
 * Blok sumber untuk system prompt. Potongan dipotong per artikel dan total
 * supaya biaya per pesan stabil; judul bagian ikut ditulis karena model diminta
 * menyebutkan panduan mana yang dipakainya.
 *
 * Pertanyaan Inggris memakai kolom terjemahannya (title_en/section_en/
 * content_en) supaya modelnya menjawab dari teks Inggris, bukan menerjemahkan
 * teks Indonesia dulu; artikel yang belum diterjemahkan tetap dipakai apa adanya.
 *
 * Batas per artikelnya MAX_CHUNK_CHARS_TOTAL, bukan MAX_CHUNK_CHARS: satu artikel
 * bisa mengirim dua jendela (windowAroundTerms), dan potongan di sini tidak boleh
 * membuang jendela keduanya. Biayanya tetap terkendali karena totalnya dibatasi
 * MAX_CONTEXT_CHARS, dan jatahnya dibagi rata ke semua artikel yang dikutip -
 * urutan "siapa cepat dia dapat" pernah membuang artikel peringkat belakang
 * tanpa jejak (lihat MAX_CONTEXT_CHARS).
 */
export function buildGuideContext(chunks: GuideChunk[], lang: AnswerLanguage = "id"): string {
  const en = lang === "en";
  const perArticle = Math.floor((MAX_CONTEXT_CHARS - PLACE_INDEX_CHARS) / Math.max(chunks.length, 1));
  const parts: string[] = [];
  const extras: string[] = [];
  let used = 0;
  for (const chunk of chunks) {
    const text = ((en ? chunk.contentEn ?? chunk.content : chunk.content) ?? "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, MAX_CHUNK_CHARS_TOTAL);
    const ordered = inCityFirst(text);
    const section = en ? chunk.sectionEn ?? chunk.section : chunk.section;
    const title = en ? chunk.titleEn ?? chunk.title : chunk.title;
    // Daftar tempat lengkap artikel, di luar jendela teks: pertanyaan "ada
    // masjid apa saja?" tidak boleh dijawab dari dua baris yang kebetulan muat.
    const places = (en ? chunk.placesEn ?? chunk.places : chunk.places) ?? [];
    const index = places.length
      ? `## ${en ? "Place index in this article" : "Indeks tempat di artikel ini"}\n${places.join("\n")}`
      : "";
    const header = `### ${section} - ${title}\n`;
    const body = ordered.slice(0, Math.max(perArticle - header.length, 0));
    parts.push(`${header}${body}`);
    // Jendela utamanya sudah pasti ikut; sisa teks artikel (indeks tempat lebih
    // dulu daripada jendela kedua) hanya kalau anggarannya masih tersisa.
    extras.push([index, ordered.slice(body.length)].filter(Boolean).join("\n\n"));
    used += header.length + body.length + (parts.length > 1 ? 2 : 0);
  }
  let room = MAX_CONTEXT_CHARS - used;
  for (let i = 0; i < extras.length && room > 0; i += 1) {
    const take = extras[i].slice(0, room);
    const cut = take.lastIndexOf("\n");
    if (cut <= 0) continue;
    parts[i] += `\n\n${take.slice(0, cut)}`;
    room -= cut + 2;
  }
  return parts.join("\n\n");
}
