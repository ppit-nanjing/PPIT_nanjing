import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiQueryLog, aiUsage, guideAnswers, guideChunks, guideMeta, helpArticles } from "@/db/schema";
import { buildChatSystemPrompt, detectAnswerLanguage, type AnswerLanguage, type GroqMessage } from "./groq";
import { assistantChat } from "./assistant";
import { buildGuideContext, findGuideChunks, RETRIEVABLE_ARTICLE, type GuideChunk } from "./guidebook-search";
import { excerpt, orderByRank, questionEntities, searchTerms } from "./guidebook-terms";
import { GUIDE_FAQ, GUIDE_STARTER_QUESTIONS } from "./guidebook-faq";
import { placeButtons, type ChatPlace } from "./chat-places";

// Jalur jawaban guidebook maba (docs/Guidebook Maba.md, bagian "AI answer path",
// "Token and quota budget", dan "Edge cases"). Bukan Server Action: dipakai
// Server Action chat (src/app/actions/ai.ts) dan script prewarm
// (scripts/prewarm-guide.ts), jadi tidak ada "use server" di sini.
//
// Urutannya: kata kunci -> potongan -> cache jawaban -> kuota harian -> Groq.
// Aturan yang mengikat:
// - sitasi selalu dari baris guide_chunks di DB, bukan dari teks model;
// - tidak ada potongan = tidak ada panggilan LLM, jawabannya tetap (soft refusal);
// - jawaban hasil degradasi/refusal tidak pernah ditulis ke cache;
// - cache hit tidak memakan kuota;
// - pertanyaan mentah tidak pernah disimpan, hanya bentuk tersunting.

export const DAILY_QUESTION_LIMIT = 15;

// Rencana: pertanyaan lebih dari 500 karakter dipotong untuk retrieval, sisanya
// diabaikan. Batas yang sama dipakai untuk hash cache supaya pertanyaan panjang
// tidak jadi kunci baru hanya karena ekornya berbeda.
const MAX_QUESTION_CHARS = 500;

// Asia/Shanghai = UTC+8 tanpa DST, jadi offsetnya tetap. Tanggalnya dihitung di
// sini, bukan dari zona waktu server, supaya kuota tidak reset di jam aneh.
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

const REFUSAL_NO_KEYWORDS =
  "Pertanyaannya belum cukup jelas. Coba tulis dengan kata yang lebih spesifik, " +
  "atau lihat daftar topik panduan di /guidebook.";
const REFUSAL_NO_CHUNKS =
  "Belum ada panduan yang cocok dengan pertanyaan itu. Coba pakai kata lain, " +
  "atau lihat daftar topik panduan di /guidebook.";

// Teks cadangan versi Inggris. Jalur jawaban ini tidak memanggil LLM, jadi
// bahasanya tidak bisa ikut menyesuaikan seperti jawaban model - pertanyaan
// Inggris harus dapat teks Inggris juga.
const REFUSAL_NO_KEYWORDS_EN =
  "That question is not specific enough yet. Try again with more concrete words, " +
  "or browse the guide topics at /guidebook.";
const REFUSAL_NO_CHUNKS_EN =
  "No guide matches that question yet. Try other words, " +
  "or browse the guide topics at /guidebook.";

const DEGRADED_HEADER: Record<string, string> = {
  kuota_harian: "Kuota tanya AI hari ini sudah habis (15 pertanyaan sehari). Ini panduan yang paling relevan:",
  ai_nonaktif: "Asisten AI sedang dimatikan sementara oleh pengurus. Ini panduan yang paling relevan:",
};

const DEGRADED_HEADER_DEFAULT = "Asisten AI sedang tidak bisa dipakai. Ini panduan yang paling relevan:";

const DEGRADED_HEADER_EN: Record<string, string> = {
  kuota_harian: "Today's AI quota is used up (15 questions a day). Here is the most relevant guide:",
  ai_nonaktif: "The AI assistant is temporarily switched off by the committee. Here is the most relevant guide:",
};

const DEGRADED_HEADER_DEFAULT_EN = "The AI assistant is unavailable right now. Here is the most relevant guide:";

// Sapaan murni ("hi", "halo kak", "makasih") tidak punya kata kunci, jadi dulu
// jatuh ke refusal "pertanyaan belum jelas". Balasannya kini ramah dan tetap
// tanpa panggilan LLM/kuota: pertanyaan pembuka di GUIDE_STARTER_QUESTIONS jadi
// tombol lanjutannya, semua sudah pasti bisa dijawab retrieval.
const GREETING_TOKENS = new Set([
  "halo", "hai", "haii", "hallo", "hello", "helo", "hi", "hey", "hei",
  "pagi", "siang", "sore", "malam", "selamat",
  "assalamualaikum", "assalamu'alaikum", "salam", "salamnya", "kenal", "kenalan",
  "thanks", "thank", "thankyou", "makasih", "makasi", "terima", "terimakasih", "trims",
  "kak", "bang", "min", "mbak", "mas",
]);

const GREETING_REPLY: Record<AnswerLanguage, string> = {
  id: "Halo! Ada yang bisa saya bantu seputar PPIT Nanjing? Kamu bisa tanya kegiatan, cara bergabung, transportasi, visa, atau kehidupan mahasiswa Indonesia di Nanjing.",
  en: "Hi! How can I help with PPIT Nanjing? You can ask about events, how to join, transport, visas, or student life in Nanjing.",
};

// True hanya kalau seluruh pesan adalah sapaan/terima kasih - kalau ada satu
// kata isi pun ("halo, mau tanya visa"), retrieval yang jalan, bukan ini.
function isSmallTalk(question: string): boolean {
  return normalizeQuestion(question).split(/\s+/).some((t) => GREETING_TOKENS.has(t));
}

// Penanda profil di system prompt (lihat buildChatSystemPrompt). Jawaban yang
// memuatnya bergantung pada data satu pengguna, jadi jangan pernah masuk cache:
// pengguna lain yang menanyakan kalimat sama akan menerima usulan edit itu.
const PROFILE_EDIT_MARKER = "<<PROFILE_EDIT:";

// Batas token keluaran jawaban. Naik 400 -> 540 waktu penanda saran lanjutan
// masuk, lalu 540 -> 700 setelah pertanyaan "masjid di Nanjing di mana saja?"
// berhenti tepat di tengah penandanya: jawaban berupa daftar alamat (tiga
// masjid, jalur bus, exit metro) kehabisan ruang sebelum JSON-nya ditutup, jadi
// tombol sarannya hilang. Angka ini dipakai jalur jawaban biasa maupun prewarm
// supaya cache tidak terisi jawaban yang lebih pendek dari jalur live.

const ANSWER_MAX_TOKENS = 700;

// Batas jumlah kartu tempat di bawah jawaban: sebanyak tempat yang disebut
// jawaban, selama satu artikel memuatnya (indeks tempat satu artikel ±12 baris).
const MAX_PLACES = 12;

export type GuideAnswer = {
  reply: string;
  citations: { title: string; slug: string | null; pageFrom: number | null; pageTo: number | null }[];
  // Pertanyaan lanjutan yang bisa diklik di widget chat: dari model kalau ada,
  // kalau tidak dari daftar FAQ yang topiknya ikut terambil.
  followUps: string[];
  // Baris ai_query_log jawaban ini. Widget chat memakainya sebagai id pesan
  // waktu pengguna menekan suka/tidak suka.
  logId: string;
  // Tombol tempat: hanya tempat yang jawabannya sebut, urut kemunculan di
  // teks jawaban, tautannya dibaca dari baris korpusnya (src/lib/chat-places.ts).
  places: ChatPlace[];
  cacheHit: boolean;
  degraded: boolean;
  degradedReason: string | null;
};

type ChunkRow = {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  ordinal: number;
  pageFrom: number | null;
  pageTo: number | null;
  text: string;
};

function normalizeQuestion(question: string): string {
  return (question ?? "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION_CHARS);
}

/**
 * Pertanyaan yang disimpan/di-hash tidak boleh memuat data pribadi (aturan repo:
 * jangan pernah mengirim data pribadi ke penyedia AI, dan teks mentahnya tidak
 * pernah disimpan). Email, nomor telepon, dan deretan angka panjang (NIM,
 * nomor paspor) diganti penanda sebelum masuk question_hash/question_redacted.
 */
function redactQuestion(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "[nomor]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUESTION_CHARS);
}

// Hash dihitung dari bentuk yang sudah disunting, bukan teks mentah: hash nomor
// telepon bisa dipecah balik lewat brute force. Efek sampingnya pertanyaan yang
// bedanya cuma angka berbagi satu jawaban cache, dan itu jawaban umum, bukan
// data pribadi siapa pun.
function questionHash(redacted: string): string {
  return createHash("sha256").update(redacted).digest("hex");
}

// Kunci cache jawaban. Versi formatnya ikut di-hash supaya perubahan prompt,
// panjang jawaban, aturan saran lanjutan, atau teks sumber yang dikirim ke model
// otomatis membatalkan cache lama (jawaban yang tersimpan sebelum perubahan tetap
// berperilaku lama). Naikkan angka ini setiap kali bentuk jawaban berubah -
// setara menaikkan corpus_version lewat ingest, tapi tanpa butuh akses database.
// 7 -> 8: batas panjang jawaban berubah dari "1-2 paragraf" jadi jumlah kata, jadi
// jawaban panjang yang sudah tersimpan tidak boleh dipakai lagi. 8 -> 9: prompt
// mewajibkan tautan tempat disalin apa adanya (lihat buildChatSystemPrompt); aturan
// itu dicabut di 9 -> 10 karena jawaban panjang berhenti di tengah url. Sejak 10
// tombol tempat dibaca dari nama tempat di dalam jawaban, bukan dari tautannya di
// teks jawaban. 10 -> 11: cara retrieval memotong teks artikel berubah - dulu satu
// blok 1.800 karakter yang dipotong di tengah baris, sekarang baris utuh di sekitar
// baris terbaik (windowAroundTerms di src/lib/guidebook-terms.ts). Jawaban lama
// dihitung dari teks yang terpotong di tengah, jadi tidak boleh dipakai lagi.
// 11 -> 12: prompt tidak lagi menuliskan tempat sebagai daftar - nama dan alamatnya
// tampil sebagai kartu di bawah jawaban - dan retrieval mengurutkan entri dalam kota
// lebih dulu (inCityFirst di src/lib/guidebook-search.ts). Jawaban lama berbentuk
// daftar per tempat, jadi dibuang dari cache.
// 12 -> 13: konteks tiap artikel bertambah blok "Indeks tempat di artikel ini"
// (placeIndex di src/lib/chat-places.ts), jadi model menerima daftar tempat yang
// lengkap dan jumlah di jawaban bisa dicek ke sana. Teks konteks berubah lagi,
// jadi jawaban lama yang menyebut "ada dua" tidak boleh dipakai.
// 13 -> 14: aturan satu tempat ditambahkan - kartu tidak menggantikan jawaban
// alamat/rute untuk pertanyaan tentang satu tempat, jadi model tidak lagi
// menolak pertanyaan yang tempatnya justru ada di sumber.
// 14 -> 15: aturan baru melarang jawaban tempat berbentuk daftar markdown, jadi
// jawaban lama yang mendaftar 8 masjid keluar kota sebagai butir (nama di daftar,
// nama lagi di kartu) tidak boleh dipakai.
// 15 -> 16: baris indeks tempat (placeIndex) sekarang membawa penanda bagiannya
// ([dalam kota] / [luar kota]), jadi konteks berubah lagi dan jawaban lama yang
// menukar masjid dalam kota dengan masjid luar kota tidak boleh dipakai.
// 16 -> 17: penolakan dipersempit ke hal yang ditanyakan, bukan topiknya - dulu
// pertanyaan perpanjangan visa dijawab dengan tujuh langkah sampai Residence
// Permit, sekarang cukup dua kalimat plus tawaran topik terdekat. Aturan hanzi
// juga melarang model menulis pinyinnya sendiri, karena renderer
// (annotateHanziPinyin) sudah menambahkannya.
// 17 -> 18: retrieval mencocokkan kata kunci beserta akhiran yang dibuang
// normalizeToken (termPattern di src/lib/guidebook-search.ts), jadi susunan
// konteksnya bergeser - pertanyaan perpanjangan visa kini mengirim dokumen
// berkas awal datang sebelum kerja/magang, dan pertanyaan paspor akhirnya
// menemukan topiknya. Jawaban lama yang disusun dari konteks lain tidak boleh
// dipakai lagi.
// 18 -> 19: retrieval mengirim jendela kedua untuk artikel panjang
// (windowAroundTerms di src/lib/guidebook-terms.ts), jadi konteks yang dilihat
// model memuat fakta yang dulu jatuh di luar jendela - dan batas per artikelnya
// naik ke MAX_CHUNK_CHARS_TOTAL. Jawaban cache lama disusun dari konteks yang
// tidak memuat bagian itu ("sumber belum memuat besaran denda") dan tidak boleh
// dipakai lagi untuk pertanyaan yang sama.
// 19 -> 20: aturan pemilihan jendela kedua berubah - varian satu kata kunci di
// baris yang sama tidak lagi mengalahkan judul bagian yang memuat dua kata kunci
// berbeda (windowAroundTerms di src/lib/guidebook-terms.ts), jadi artikel panjang
// mengirim jendela yang berbeda dari yang dilihat model saat versi 19. Jawaban
// yang tersimpan dari konteks v19 - mulai dari jawaban 住宿登记 yang bilang batas
// jamnya belum ada di sumber - tidak boleh dipakai lagi untuk pertanyaan yang sama.
// 20 -> 21: artikel tempat ibadah kehilangan satu masjid dalam kota (汉西门
// dihapus dari docs/guidebook/tempat-ibadah-di-nanjing.md), jadi konteksnya
// berubah - jawaban masjid yang tersimpan menyebut empat masjid dan tidak boleh
// dipakai lagi.
const ANSWER_FORMAT_VERSION = 21;

function answerCacheKey(redacted: string): string {
  return questionHash(`${redacted}\u0000v${ANSWER_FORMAT_VERSION}`);
}

function shanghaiDay(): string {
  return new Date(Date.now() + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** Kunci cache = hash pertanyaan + corpus_version (lihat guidebook-index.ts). */
async function loadMeta(): Promise<{ corpusVersion: number; aiEnabled: boolean }> {
  const [row] = await db
    .select({ corpusVersion: guideMeta.corpusVersion, aiEnabled: guideMeta.aiEnabled })
    .from(guideMeta)
    .limit(1);
  return { corpusVersion: row?.corpusVersion ?? 1, aiEnabled: row?.aiEnabled ?? true };
}

/**
 * Potongan yang boleh dikutip. Gerbangnya sama dengan findGuideChunks
 * (RETRIEVABLE_ARTICLE, definisinya di sana) karena jalur cache membaca baris
 * potongan langsung dari id yang tersimpan: tanpa gerbang di sini, topik yang
 * baru disembunyikan atau kedaluwarsa masih ikut terbit lewat cache selama
 * corpus_version belum naik.
 */
async function loadChunks(scope: { slugs: string[] } | { ids: string[] }): Promise<ChunkRow[]> {
  const scopeWhere = "ids" in scope
    ? inArray(guideChunks.id, scope.ids)
    : inArray(helpArticles.slug, scope.slugs);
  return db
    .select({
      id: guideChunks.id,
      slug: helpArticles.slug,
      title: helpArticles.title,
      titleEn: helpArticles.titleEn,
      ordinal: guideChunks.ordinal,
      pageFrom: guideChunks.pageFrom,
      pageTo: guideChunks.pageTo,
      text: guideChunks.text,
    })
    .from(guideChunks)
    .innerJoin(helpArticles, eq(guideChunks.articleId, helpArticles.id))
    .where(sql`${scopeWhere} and ${RETRIEVABLE_ARTICLE}`)
    .orderBy(helpArticles.sortOrder, guideChunks.ordinal);
}

function citationsFrom(chunks: ChunkRow[], lang: AnswerLanguage = "id"): GuideAnswer["citations"] {
  const bySlug = new Map<string, GuideAnswer["citations"][number]>();
  for (const chunk of chunks) {
    const existing = bySlug.get(chunk.slug);
    if (!existing) {
      bySlug.set(chunk.slug, {
        // Judul sitasi mengikuti bahasa jawabannya: pertanyaan Inggris tidak
        // dikutipkan ke judul Indonesia selama terjemahannya ada.
        title: lang === "en" ? chunk.titleEn ?? chunk.title : chunk.title,
        slug: chunk.slug,
        pageFrom: chunk.pageFrom,
        pageTo: chunk.pageTo,
      });
      continue;
    }
    if (chunk.pageFrom !== null && (existing.pageFrom === null || chunk.pageFrom < existing.pageFrom)) {
      existing.pageFrom = chunk.pageFrom;
    }
    if (chunk.pageTo !== null && (existing.pageTo === null || chunk.pageTo > existing.pageTo)) {
      existing.pageTo = chunk.pageTo;
    }
  }
  return [...bySlug.values()];
}

// Penanda pertanyaan lanjutan, sama polanya dengan PROFILE_EDIT di
// buildChatSystemPrompt: satu balasan saja, jadi tiga baris saran tidak perlu
// panggilan Groq kedua (dan tidak memakan kuota harian).
const FOLLOWUPS_MARKER = /<<FOLLOWUPS:([\s\S]*?)>>/;
const MAX_FOLLOWUPS = 3;
const MAX_FOLLOWUP_CHARS = 160;

/**
 * Buang penanda yang kepotong batas token. Jawaban panjang berhenti tepat di
 * tengah `<<FOLLOWUPS:[...]>>`, jadi regex penutup di atas tidak cocok dan sisa
 * JSON-nya ikut tampil di gelembung jawaban ("...<<FOLLOWUPS:[\"Gereja Kristen").
 * Penanda PROFILE_EDIT yang utuh dibiarkan: Server Action yang membacanya.
 */
function stripPartialMarkers(text: string): string {
  const followUps = text.indexOf("<<FOLLOWUPS:");
  if (followUps !== -1) return text.slice(0, followUps).trim();
  const profile = text.indexOf(PROFILE_EDIT_MARKER);
  if (profile !== -1 && !text.slice(profile).includes(">>")) return text.slice(0, profile).trim();
  return text.trim();
}

/**
 * Pisahkan penanda pertanyaan lanjutan dari teks jawaban. Teks mentah - penanda
 * ikut di dalamnya - yang disimpan di cache, dan cache hit dibaca lewat fungsi
 * yang sama, jadi saran tidak hilang pada jawaban yang datang dari cache.
 */
function parseAnswer(raw: string): { reply: string; followUps: string[] } {
  const match = raw.match(FOLLOWUPS_MARKER);
  if (!match) return { reply: stripPartialMarkers(raw), followUps: [] };
  const reply = stripPartialMarkers(raw.replace(FOLLOWUPS_MARKER, ""));
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return { reply, followUps: [] };
  }
  if (!Array.isArray(parsed)) return { reply, followUps: [] };
  return {
    reply,
    followUps: parsed
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.replace(/\s+/g, " ").trim())
      .filter((q) => q.length > 0 && q.length <= MAX_FOLLOWUP_CHARS)
      .slice(0, MAX_FOLLOWUPS),
  };
}

/**
 * Saran cadangan waktu model tidak mengirim penanda: jalur degradasi, jawaban
 * refusal, atau penanda yang kepotong batas token. Pertanyaannya diambil dari
 * GUIDE_FAQ untuk topik yang sumbernya benar-benar terambil, bukan dikarang.
 * `slugs` diisi urutan relevansi hasil retrieval, jadi saran pertama datang
 * dari artikel yang paling relevan.
 */
function fallbackFollowUps(slugs: (string | null)[], question: string, lang: AnswerLanguage): string[] {
  const topics = new Set(slugs.filter((slug): slug is string => slug !== null));
  const asked = normalizeQuestion(question);
  const out: string[] = [];
  for (const faq of GUIDE_FAQ) {
    if (!topics.has(faq.topic)) continue;
    const candidate = (lang === "en" ? faq.questionEn : undefined) ?? faq.question;
    if (normalizeQuestion(candidate) === asked || out.includes(candidate)) continue;
    out.push(candidate);
    if (out.length === MAX_FOLLOWUPS) break;
  }
  return out;
}

/**
 * Pertanyaan lanjutan yang benar-benar bisa dijawab. Saran model dipakai hanya
 * kalau retrieval-nya mengembalikan potongan (kalau tidak, klik saran itu cuma
 * berakhir refusal). Jumlahnya mengikuti model: boleh nol, satu, dua, atau tiga
 * - tidak lagi dipaksa tiga dengan FAQ, supaya jawaban yang tidak butuh saran
 * tetap bersih.
 */
async function resolveFollowUps(modelFollowUps: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const q of modelFollowUps) {
    if (out.length === MAX_FOLLOWUPS) break;
    if (out.includes(q)) continue;
    if ((await retrieve(q)) !== null) out.push(q);
  }
  return out;
}

/** Tulis ulang penanda saran di jawaban mentah supaya cache menyimpan saran yang sudah lolos validasi. */
function withFollowUps(reply: string, followUps: string[]): string {
  const base = reply.replace(FOLLOWUPS_MARKER, "").trim();
  return followUps.length > 0 ? `${base}\n\n<<FOLLOWUPS:${JSON.stringify(followUps)}>>` : base;
}

function retrievalReply(reason: string, chunks: ChunkRow[], articles: GuideChunk[], lang: AnswerLanguage): string {
  const seen = new Set<string>();
  const blocks: string[] = [];
  // Teks potongan tersimpan dalam Bahasa Indonesia (guide_chunks dibangun dari
  // help_articles.content), jadi pertanyaan Inggris dijawab dari isi terjemahan
  // artikelnya - tanpa nomor halaman karena berkas Inggris tidak memuat penanda
  // halaman PDF-nya.
  if (lang === "en") {
    const header = DEGRADED_HEADER_EN[reason] ?? DEGRADED_HEADER_DEFAULT_EN;
    for (const article of articles) {
      if (seen.has(article.slug)) continue;
      seen.add(article.slug);
      const body = article.contentEn ?? article.content;
      if (!body) continue;
      blocks.push(`${article.titleEn ?? article.title}\n${excerpt(body)}\nRead: /help/${article.slug}`);
      if (blocks.length === 3) break;
    }
    return blocks.length > 0 ? `${header}\n\n${blocks.join("\n\n")}` : header;
  }
  const header = DEGRADED_HEADER[reason] ?? DEGRADED_HEADER_DEFAULT;
  for (const chunk of chunks) {
    if (seen.has(chunk.slug)) continue;
    seen.add(chunk.slug);
    const pages = chunk.pageFrom !== null || chunk.pageTo !== null
      ? ` (hal. ${chunk.pageFrom ?? "?"}${chunk.pageTo !== null && chunk.pageTo !== chunk.pageFrom ? `-${chunk.pageTo}` : ""})`
      : "";
    blocks.push(`${chunk.title}${pages}\n${excerpt(chunk.text)}\nBaca: /help/${chunk.slug}`);
    if (blocks.length === 3) break;
  }
  return `${header}\n\n${blocks.join("\n\n")}`;
}

function degradedReasonFromError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/sibuk/i.test(message) || message.includes("(429)")) return "groq_429";
  if (/timeout|abort/i.test(message)) return "groq_timeout";
  const status = message.match(/\((\d{3})\)/)?.[1];
  return status ? `groq_${status}` : "groq_error";
}

type LogInput = {
  userId: string | null;
  question: string;
  chunkIds: string[];
  cacheHit: boolean;
  usedLlm: boolean;
  degradedReason: string | null;
  latencyMs: number;
};

async function logQuery(input: LogInput): Promise<string> {
  const redacted = redactQuestion(input.question);
  const [row] = await db
    .insert(aiQueryLog)
    .values({
      userId: input.userId,
      questionHash: questionHash(redacted),
      questionRedacted: redacted,
      chunkIds: input.chunkIds,
      cacheHit: input.cacheHit,
      usedLlm: input.usedLlm,
      degradedReason: input.degradedReason,
      latencyMs: input.latencyMs,
    })
    .returning({ id: aiQueryLog.id });
  return row.id;
}

/**
 * Retrieval potongan yang boleh dikutip. null = soft refusal: pertanyaannya
 * tidak punya kata kunci, tidak ada artikel yang cocok, atau artikel yang cocok
 * belum punya potongan. Semuanya tanpa panggilan LLM.
 */
async function retrieve(question: string): Promise<{ articles: GuideChunk[]; chunks: ChunkRow[] } | null> {
  const articles = await findGuideChunks(question);
  if (articles.length === 0) return null;
  // Urutan potongan mengikuti skor retrieval, bukan sort_order artikel:
  // jawaban degradasi ("ini panduan yang paling relevan") dan daftar sitasinya
  // dibaca dari array ini, dan pemotongan tiga artikel di retrievalReply hanya
  // benar kalau yang terdepan memang yang paling relevan.
  const chunks = orderByRank(
    await loadChunks({ slugs: articles.map((a) => a.slug) }),
    articles.map((a) => a.slug),
    (chunk) => chunk.slug,
  );
  if (chunks.length === 0) return null;
  return { articles, chunks };
}

export async function askGuide(input: {
  userId: string;
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<GuideAnswer> {
  const started = Date.now();
  const question = normalizeQuestion(input.question);
  // Bahasa jawaban ditentukan dari pertanyaannya, bukan dari locale antarmuka:
  // maba yang menulis Inggris dapat jawaban Inggris, sitasi Inggris, dan teks
  // cadangan Inggris walau halamannya sedang dibuka dalam Bahasa Indonesia.
  const lang = detectAnswerLanguage(question);

  // Fixed refusal: tanpa kata kunci, jawabannya tidak dicari dan tidak di-cache.
  const refuse = async (reply: string): Promise<GuideAnswer> => {
    const logId = await logQuery({
      userId: input.userId,
      question,
      chunkIds: [],
      cacheHit: false,
      usedLlm: false,
      degradedReason: null,
      latencyMs: Date.now() - started,
    });
    return {
      reply,
      citations: [],
      followUps: GUIDE_STARTER_QUESTIONS,
      places: [],
      cacheHit: false,
      degraded: false,
      degradedReason: null,
      logId,
    };
  };

  const greet = async (): Promise<GuideAnswer> => {
    const logId = await logQuery({
      userId: input.userId,
      question,
      chunkIds: [],
      cacheHit: false,
      usedLlm: false,
      degradedReason: null,
      latencyMs: Date.now() - started,
    });
    return {
      reply: GREETING_REPLY[lang],
      citations: [],
      // Sapaan tidak butuh tombol saran: teksnya sudah menyebut topik yang bisa
      // ditanya. Tombol saran cuma buat jawaban/refusal yang memang butuh arah.
      followUps: [],
      places: [],
      cacheHit: false,
      degraded: false,
      degradedReason: null,
      logId,
    };
  };

  if (searchTerms(question).length === 0 && questionEntities(question).length === 0) {
    return isSmallTalk(question) ? greet() : refuse(lang === "en" ? REFUSAL_NO_KEYWORDS_EN : REFUSAL_NO_KEYWORDS);
  }

  const retrieved = await retrieve(question);
  if (!retrieved) return refuse(lang === "en" ? REFUSAL_NO_CHUNKS_EN : REFUSAL_NO_CHUNKS);

  const { articles, chunks } = retrieved;
  // Korpus tombol tempat: baris daftar tiap potongan yang ikut terambil. Tautan
  // tiap tempat dibaca dari sini, bukan dari teks jawaban, jadi model boleh
  // melepas atau menulis ulang tautannya tanpa membuat tombolnya hilang.
  const corpus = chunks.map((c) => c.text).join("\n\n");
  const chunkIds = chunks.map((c) => c.id);
  const citations = citationsFrom(chunks, lang);
  const redacted = redactQuestion(question);
  const hash = answerCacheKey(redacted);
  const { corpusVersion, aiEnabled } = await loadMeta();

  // Cache hit tidak memakan kuota. Sitasinya tetap dibaca dari baris potongan,
  // jadi artikel yang sudah disembunyikan, dibatalkan tinjauannya, atau
  // kedaluwarsa tidak ikut terbit lewat cache walau corpus_version tidak naik.
  const cached = await findCachedAnswer(hash, corpusVersion);
  // chunk_ids ditulis urut skor retrieval, dan loadChunks mengembalikannya urut
  // sort_order - jadi urutannya dipulihkan di sini supaya sitasi jawaban dari
  // cache tidak berbalik jadi urutan tampilan konsol.
  const cachedChunks = cached && cached.chunkIds.length > 0
    ? orderByRank(await loadChunks({ ids: cached.chunkIds }), cached.chunkIds, (chunk) => chunk.id)
    : [];
  if (cached && cachedChunks.length > 0) {
    await bumpHits(hash, corpusVersion);
    const logId = await logQuery({
      userId: input.userId,
      question,
      chunkIds: cached.chunkIds,
      cacheHit: true,
      usedLlm: false,
      degradedReason: null,
      latencyMs: Date.now() - started,
    });
    const cachedCitations = citationsFrom(cachedChunks, lang);
    const parsed = parseAnswer(cached.answer);
    return {
      reply: parsed.reply,
      citations: cachedCitations,
      places: placeButtons(corpus, parsed.reply, MAX_PLACES),
      followUps: parsed.followUps,
      cacheHit: true,
      degraded: false,
      degradedReason: null,
      logId,
    };
  }

  const degraded = async (reason: string, usedLlm: boolean): Promise<GuideAnswer> => {
    const logId = await logQuery({
      userId: input.userId,
      question,
      chunkIds,
      cacheHit: false,
      usedLlm,
      degradedReason: reason,
      latencyMs: Date.now() - started,
    });
    const reply = retrievalReply(reason, chunks, articles, lang);
    return {
      reply,
      citations,
      places: placeButtons(corpus, reply, MAX_PLACES),
      followUps: fallbackFollowUps(articles.map((a) => a.slug), question, lang),
      cacheHit: false,
      degraded: true,
      degradedReason: reason,
      logId,
    };
  };

  if (!aiEnabled) return degraded("ai_nonaktif", false);
  if (!(await consumeQuota(input.userId))) return degraded("kuota_harian", false);

  const messages: GroqMessage[] = [
    { role: "system", content: buildChatSystemPrompt(buildGuideContext(articles, lang), lang) },
    ...input.history,
  ];
  // Prewarm memanggil tanpa history, jadi pertanyaannya belum ada di messages.
  if (!input.history.some((m) => m.role === "user")) messages.push({ role: "user", content: question });

  let reply: string;
  try {
    reply = await assistantChat(messages, { temperature: 0.5, maxTokens: ANSWER_MAX_TOKENS });
  } catch (err) {
    return degraded(degradedReasonFromError(err), true);
  }

  const parsed = parseAnswer(reply);
  // Penanda pertanyaan lanjutan yang datang lebih dulu membuat parseAnswer
  // mengembalikan teks kosong. Jawaban kosong tidak boleh masuk cache: cache
  // hit membacanya kembali apa adanya, jadi satu balasan kosong akan bertahan
  // sampai versi korpus berubah. Pakai jawaban panduan dari potongan sumber.
  if (parsed.reply.length === 0) return degraded("jawaban_kosong", true);
  const followUps = await resolveFollowUps(parsed.followUps);
  if (!reply.includes(PROFILE_EDIT_MARKER)) {
    await writeCache(hash, corpusVersion, redacted, withFollowUps(parsed.reply, followUps), chunkIds);
  }
  const logId = await logQuery({
    userId: input.userId,
    question,
    chunkIds,
    cacheHit: false,
    usedLlm: true,
    degradedReason: null,
    latencyMs: Date.now() - started,
  });
  return {
    reply: parsed.reply,
    citations,
    places: placeButtons(corpus, parsed.reply, MAX_PLACES),
    followUps,
    cacheHit: false,
    degraded: false,
    degradedReason: null,
    logId,
  };
}

/**
 * Prewarm FAQ saat ingest. Jalur retrieval + cache yang sama, tanpa kuota dan
 * tanpa baris ai_usage: ini bukan pertanyaan pengguna. Lognya ditulis dengan
 * user_id null supaya tetap kelihatan di KPI.
 */
export async function warmCacheForQuestion(question: string): Promise<"cached" | "skipped" | "failed"> {
  const started = Date.now();
  const normalized = normalizeQuestion(question);
  const retrieved = searchTerms(normalized).length === 0 && questionEntities(normalized).length === 0
    ? null
    : await retrieve(normalized);

  if (!retrieved) {
    await logQuery({
      userId: null,
      question: normalized,
      chunkIds: [],
      cacheHit: false,
      usedLlm: false,
      degradedReason: null,
      latencyMs: Date.now() - started,
    });
    return "skipped";
  }

  const { articles, chunks } = retrieved;
  const chunkIds = chunks.map((c) => c.id);
  const lang = detectAnswerLanguage(normalized);
  const redacted = redactQuestion(normalized);
  const hash = answerCacheKey(redacted);
  const { corpusVersion, aiEnabled } = await loadMeta();

  if (await findCachedAnswer(hash, corpusVersion)) return "cached";
  if (!aiEnabled) return "skipped";

  try {
    const reply = await assistantChat(
      [
        {
          role: "system",
          content: buildChatSystemPrompt(buildGuideContext(articles, lang), lang),
        },
        { role: "user", content: normalized },
      ],
      { temperature: 0.5, maxTokens: ANSWER_MAX_TOKENS },
    );
    const parsed = parseAnswer(reply);
    if (parsed.reply.length === 0) throw new Error("Respons AI kosong");
    const followUps = await resolveFollowUps(parsed.followUps);
    await writeCache(hash, corpusVersion, redacted, withFollowUps(parsed.reply, followUps), chunkIds);
    await logQuery({
      userId: null,
      question: normalized,
      chunkIds,
      cacheHit: false,
      usedLlm: true,
      degradedReason: null,
      latencyMs: Date.now() - started,
    });
    return "cached";
  } catch (err) {
    await logQuery({
      userId: null,
      question: normalized,
      chunkIds,
      cacheHit: false,
      usedLlm: true,
      degradedReason: degradedReasonFromError(err),
      latencyMs: Date.now() - started,
    });
    return "failed";
  }
}

function findCachedAnswer(
  hash: string,
  corpusVersion: number,
): Promise<{ answer: string; chunkIds: string[] } | undefined> {
  return db
    .select({ answer: guideAnswers.answer, chunkIds: guideAnswers.chunkIds })
    .from(guideAnswers)
    .where(and(eq(guideAnswers.questionHash, hash), eq(guideAnswers.corpusVersion, corpusVersion)))
    .limit(1)
    .then((rows) => rows[0]);
}

function bumpHits(hash: string, corpusVersion: number): Promise<unknown> {
  return db
    .update(guideAnswers)
    .set({ hits: sql`${guideAnswers.hits} + 1` })
    .where(and(eq(guideAnswers.questionHash, hash), eq(guideAnswers.corpusVersion, corpusVersion)));
}

function writeCache(
  hash: string,
  corpusVersion: number,
  question: string,
  answer: string,
  chunkIds: string[],
): Promise<unknown> {
  return db
    .insert(guideAnswers)
    .values({ questionHash: hash, corpusVersion, question, answer, chunkIds, hits: 0 })
    .onConflictDoNothing();
}

/**
 * Kuota harian per pengguna. Satu statement insert+update: kalau count sudah di
 * batas, DO UPDATE-nya tidak jalan dan tidak ada baris yang kembali, jadi
 * jawaban degradasi kuota tidak ikut dihitung sebagai pertanyaan terjawab.
 */
async function consumeQuota(userId: string): Promise<boolean> {
  const rows = await db
    .insert(aiUsage)
    .values({ userId, day: shanghaiDay(), count: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day],
      set: { count: sql`${aiUsage.count} + 1` },
      setWhere: sql`${aiUsage.count} < ${DAILY_QUESTION_LIMIT}`,
    })
    .returning({ count: aiUsage.count });
  return rows.length > 0;
}
