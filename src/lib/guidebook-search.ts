import { and, eq, ilike, or, type SQL } from "drizzle-orm";
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

import { questionEntities, searchTerms } from "./guidebook-terms";

/**
 * Skor sederhana: judul paling menentukan, lalu bagian, lalu isi (dibatasi 3
 * hitungan supaya artikel panjang tidak menang hanya karena panjang).
 * Query DB sudah menjamin minimal satu istilah cocok, jadi tidak ada
 * penapisan ulang di sini.
 */
export function rankArticles(terms: string[], rows: GuideRow[], entityTerms: string[] = []): GuideChunk[] {
  const scored = rows.map((row) => {
    const title = row.title.toLowerCase();
    const section = row.section.toLowerCase();
    const content = (row.content ?? "").toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 4;
      if (section.includes(term)) score += 2;
      const hits = content.split(term).length - 1;
      if (hits > 0) score += Math.min(hits, 3);
    }
    // Nama entitas ("ppit", "nanjing") tidak masuk kata kunci karena muncul di
    // hampir semua artikel. Judul dan bagian tetap dinilai: di situ namanya
    // memang menunjukkan topik artikelnya.
    for (const term of entityTerms) {
      if (title.includes(term)) score += 4;
      if (section.includes(term)) score += 2;
    }
    return { row, score };
  });

  return scored
    .filter((s) => s.score > 0)
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
    .where(and(eq(helpArticles.isPublic, true), or(...matches)));

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
    .where(and(eq(helpArticles.isPublic, true), or(...matches)));

  return rankArticles(
    entities,
    rows.map((row) => ({ ...row, content: row.content ?? "" })),
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
