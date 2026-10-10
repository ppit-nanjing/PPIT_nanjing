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

const MAX_TERMS = 10;

// Kata fungsi + istilah yang muncul di hampir semua artikel (nama organisasi,
// kota). Kata seperti "ppit"/"nanjing" kalau ikut dicari akan mencocokkan semua
// artikel dan membuat peringkat tidak berarti.
const STOPWORDS: Record<string, true> = {
  yang: true, dan: true, untuk: true, dengan: true, dari: true, pada: true, dalam: true, atau: true,
  kalau: true, jika: true, agar: true, supaya: true, ini: true, itu: true, ada: true, adalah: true,
  apa: true, apakah: true, bagaimana: true, gimana: true, dimana: true, kapan: true, siapa: true,
  mengapa: true, kenapa: true, bisa: true, boleh: true, harus: true, saya: true, aku: true, kamu: true,
  kami: true, kita: true, anda: true, nya: true, tidak: true, bukan: true, belum: true, sudah: true,
  juga: true, saja: true, mau: true, ingin: true, butuh: true, tolong: true, minta: true, tanya: true,
  cara: true, info: true, informasi: true, dong: true, ya: true, kah: true, sih: true, the: true,
  and: true, for: true, with: true, how: true, what: true, where: true, when: true, who: true, can: true,
  ppit: true, nanjing: true, tiongkok: true, china: true,
  // Sapaan dan terima kasih: kalau ikut dicari, "halo kak" jadi kata kunci dan
  // memaksa satu kueri DB yang pasti tidak ada hasilnya.
  halo: true, hai: true, hi: true, hello: true, kak: true, bang: true, min: true, pagi: true, siang: true,
  sore: true, malam: true, assalamualaikum: true, salam: true, kenal: true, terima: true, kasih: true,
  makasih: true, thanks: true, thank: true, banget: true,
};

// Imbuhan Indonesia yang paling sering membuat kata kunci pengguna tidak
// persis sama dengan kata di artikel ("membuka rekening" vs "buka rekening").
// Kosongkan awalan saja yang aman: mencocokkan lewat ILIKE bersifat substring,
// jadi sisa kata yang terlalu pendek justru menambah pencocokan palsu, bukan
// mengurangi yang benar. Kata aslinya tetap dicari juga (lihat searchTerms).
const PREFIXES = ["meng", "meny", "mem", "men", "me", "di", "ter", "ber"];
const SUFFIXES = ["nya", "kan", "an"];

function normalizeToken(token: string): string {
  let s = token;
  for (const suffix of SUFFIXES) {
    if (s.length - suffix.length >= 4 && s.endsWith(suffix)) {
      s = s.slice(0, -suffix.length);
      break;
    }
  }
  for (const prefix of PREFIXES) {
    if (s.length - prefix.length >= 4 && s.startsWith(prefix)) {
      s = s.slice(prefix.length);
      break;
    }
  }
  return s;
}

/**
 * Kata kunci dari pertanyaan pengguna: kata asli + bentuk tanpa imbuhan, tanpa
 * kata fungsi. Kosong = pertanyaan tidak punya kata yang bisa dicari (mis.
 * "halo"), dan pemanggil akan menjawab "tidak tahu" - bukan mencari ke korpus.
 */
export function searchTerms(question: string): string[] {
  const raw = (question ?? "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const terms = new Set<string>();
  for (const token of raw) {
    if (token.length < 3) continue;
    if (STOPWORDS[token] === true) continue;
    terms.add(token);
    const stem = normalizeToken(token);
    if (stem !== token && stem.length >= 3 && STOPWORDS[stem] !== true) terms.add(stem);
    if (terms.size >= MAX_TERMS) break;
  }
  return [...terms].slice(0, MAX_TERMS);
}

/**
 * Isi kolom `guide_chunks.text_stemmed`: seluruh kata potongan, dinormalkan.
 * Beda dengan searchTerms, di sini stopword TIDAK dibuang - kolom ini harus
 * tetap bisa dicocokkan untuk kata apa pun yang diketik pengguna, dan kata
 * fungsi baru dibuang di sisi pertanyaan. Duplikat dibiarkan; `to_tsvector`
 * yang meringkasnya jadi lexeme.
 */
export function stemmedText(text: string): string {
  const raw = (text ?? "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return raw.map(normalizeToken).join(" ");
}

/**
 * Skor sederhana: judul paling menentukan, lalu bagian, lalu isi (dibatasi 3
 * hitungan supaya artikel panjang tidak menang hanya karena panjang).
 * Query DB sudah menjamin minimal satu istilah cocok, jadi tidak ada
 * penapisan ulang di sini.
 */
export function rankArticles(terms: string[], rows: GuideRow[]): GuideChunk[] {
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
  if (terms.length === 0) return [];

  const matches: SQL[] = [];
  for (const term of terms) {
    const pattern = `%${term}%`;
    matches.push(ilike(helpArticles.title, pattern));
    matches.push(ilike(helpArticles.section, pattern));
    matches.push(ilike(helpArticles.content, pattern));
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
