import { and, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { helpArticles } from "@/db/schema";

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
};

/** Satu baris kandidat dari DB - dipisah dari GuideChunk supaya skoring bisa diuji tanpa database. */
export type GuideRow = GuideChunk;

/** Batas potongan & panjang konteks: cukup untuk jawaban 1-3 paragraf, tetap murah per pesan. */
export const MAX_CHUNKS = 4;
const MAX_CHUNK_CHARS = 1800;
const MAX_CONTEXT_CHARS = 7000;

// Tanpa batas LIMIT: skoringnya di JS, dan LIMIT tanpa ORDER BY membuang kandidat
// secara acak - artikel terbaik bisa hilang sebelum sempat diskor. Korpusnya
// masih puluhan artikel; kalau nanti membengkak, ganti ke FTS dengan peringkat di
// DB (lihat rencana P1 di docs/Guidebook Maba.md), bukan menambah LIMIT lagi.

import { questionEntities, searchTerms, stemmedText } from "./guidebook-terms";

/**
 * Pencocokan kata utuh, bukan substring: kata kunci "berapa" tidak boleh cocok
 * karena artikel memuat "beberapa", dan "bawa" bukan alasan karena ada "bawaan".
 * Query DB tetap ILIKE sebagai penyaring kasar (murah dan indeksnya sudah ada),
 * tapi kecocokan yang dihitung selalu lewat pola berbatas kata ini. Istilah
 * majemuk dari sinonim ("izin tinggal") dicocokkan sebagai frasa.
 */
function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u");
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

/**
 * Skor sederhana: judul paling menentukan, lalu bagian, lalu isi (dibatasi 3
 * hitungan supaya artikel panjang tidak menang hanya karena panjang).
 * Kecocokan substring tidak dihitung sama sekali; kandidat yang hanya cocok
 * sebagai potongan kata dibuang, dan yang di bawah ambang relevansi juga.
 */
export function rankArticles(terms: string[], rows: GuideRow[], entityTerms: string[] = []): GuideChunk[] {
  const termRes = terms.map((term) => ({ stem: stemmedText(term), re: termPattern(term) }));
  const entityRes = entityTerms.map(termPattern);
  const scored = rows.map((row) => {
    const title = row.title.toLowerCase();
    const section = row.section.toLowerCase();
    const content = (row.content ?? "").toLowerCase();
    let score = 0;
    const matchedStems = new Set<string>();
    for (const { stem, re } of termRes) {
      let hit = false;
      if (re.test(title)) {
        score += 4;
        hit = true;
      }
      if (re.test(section)) {
        score += 2;
        hit = true;
      }
      const hits = content.split(re).length - 1;
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
      if (re.test(title)) {
        score += 4;
        entityHit = true;
      }
      if (re.test(section)) {
        score += 2;
        entityHit = true;
      }
    }
    const matched = matchedStems.size;
    const relevant =
      terms.length > 0
        ? matched >= MIN_MATCHED_TERMS ||
          (matched >= MIN_MATCHED_FOR_COVERAGE && matched / terms.length >= MIN_COVERAGE_FOR_TWO)
        : entityHit;
    return { row, score, relevant };
  });

  return scored
    .filter((s) => s.relevant && s.score > 0)
    .sort((a, b) => b.score - a.score || a.row.title.localeCompare(b.row.title))
    .slice(0, MAX_CHUNKS)
    .map((s) => s.row);
}

/** Kandidat dari DB: artikel yang sudah ditandai publik dan memuat minimal satu kata kunci. */
export async function findGuideChunks(question: string): Promise<GuideChunk[]> {
  const terms = searchTerms(question);
  const entities = questionEntities(question);
  if (terms.length === 0) return findEntityChunks(question);

  const matches: SQL[] = [];
  for (const term of terms) {
    const pattern = `%${term}%`;
    matches.push(ilike(helpArticles.title, pattern));
    matches.push(ilike(helpArticles.section, pattern));
    matches.push(ilike(helpArticles.content, pattern));
  }
  // Entitas tetap jadi kandidat walau ada kata kunci lain: "apa bedanya PPIT
  // dan PPIT Nanjing" hanya menyisakan kata "beda" sebagai kata kunci, padahal
  // topiknya jelas. Isi artikel tidak dicocokkan untuk entitas - "nanjing" ada
  // di hampir semua topik.
  for (const entity of entities) {
    const pattern = `%${entity}%`;
    matches.push(ilike(helpArticles.title, pattern));
    matches.push(ilike(helpArticles.section, pattern));
  }

  const rows = await db
    .select({
      slug: helpArticles.slug,
      section: helpArticles.section,
      title: helpArticles.title,
      content: helpArticles.content,
    })
    .from(helpArticles)
    .where(and(RETRIEVABLE_ARTICLE, or(...matches)));

  return rankArticles(
    terms,
    rows.map((row) => ({ ...row, content: row.content ?? "" })),
    entities,
  );
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
  }

  const rows = await db
    .select({
      slug: helpArticles.slug,
      section: helpArticles.section,
      title: helpArticles.title,
      content: helpArticles.content,
    })
    .from(helpArticles)
    .where(and(RETRIEVABLE_ARTICLE, or(...matches)));

  return rankArticles(
    [],
    rows.map((row) => ({ ...row, content: row.content ?? "" })),
    entities,
  );
}

/**
 * Blok sumber untuk system prompt. Potongan dipotong per artikel dan total
 * supaya biaya per pesan stabil; judul bagian ikut ditulis karena model diminta
 * menyebutkan panduan mana yang dipakainya.
 */
export function buildGuideContext(chunks: GuideChunk[]): string {
  const parts: string[] = [];
  let used = 0;
  for (const chunk of chunks) {
    const body = (chunk.content ?? "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_CHUNK_CHARS);
    const part = `### ${chunk.section} - ${chunk.title}\n${body}`;
    if (used + part.length > MAX_CONTEXT_CHARS) break;
    parts.push(part);
    used += part.length;
  }
  return parts.join("\n\n");
}
