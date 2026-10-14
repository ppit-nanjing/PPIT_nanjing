import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiQueryLog, aiUsage, guideAnswers, guideChunks, guideMeta, helpArticles } from "@/db/schema";
import { buildChatSystemPrompt, detectAnswerLanguage, type AnswerLanguage, type GroqMessage } from "./groq";
import { assistantChat } from "./assistant";
import { buildGuideContext, findGuideChunks, RETRIEVABLE_ARTICLE, type GuideChunk } from "./guidebook-search";
import { questionEntities, searchTerms } from "./guidebook-terms";
import { GUIDE_FAQ, GUIDE_STARTER_QUESTIONS } from "./guidebook-faq";

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

const DEGRADED_HEADER: Record<string, string> = {
  kuota_harian: "Kuota tanya AI hari ini sudah habis (15 pertanyaan sehari). Ini panduan yang paling relevan:",
  ai_nonaktif: "Asisten AI sedang dimatikan sementara oleh pengurus. Ini panduan yang paling relevan:",
};

const DEGRADED_HEADER_DEFAULT = "Asisten AI sedang tidak bisa dipakai. Ini panduan yang paling relevan:";

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

// Batas token keluaran jawaban. Dinaikkan dari 400 waktu penanda saran
// lanjutan masuk: penanda itu ikut dihitung, dan kalau jawabannya kepotong di
// tengah, penandanya hilang sehingga saran jatuh ke daftar FAQ. Angka ini
// dipakai jalur jawaban biasa maupun prewarm supaya cache tidak terisi
// jawaban yang lebih pendek dari jalur live.
const ANSWER_MAX_TOKENS = 540;

export type GuideAnswer = {
  reply: string;
  citations: { title: string; slug: string | null; pageFrom: number | null; pageTo: number | null }[];
  // Pertanyaan lanjutan yang bisa diklik di widget chat: dari model kalau ada,
  // kalau tidak dari daftar FAQ yang topiknya ikut terambil.
  followUps: string[];
  cacheHit: boolean;
  degraded: boolean;
  degradedReason: string | null;
  // Baris ai_query_log jawaban ini. Widget chat memakainya sebagai id pesan
  // waktu pengguna menekan suka/tidak suka.
  logId: string;
};

type ChunkRow = {
  id: string;
  slug: string;
  title: string;
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
// panjang jawaban, atau aturan saran lanjutan otomatis membatalkan cache lama
// (jawaban yang tersimpan sebelum perubahan tetap berperilaku lama). Naikkan
// angka ini setiap kali bentuk jawaban berubah - setara menaikkan corpus_version
// lewat ingest, tapi tanpa butuh akses database.
const ANSWER_FORMAT_VERSION = 3;

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

function citationsFrom(chunks: ChunkRow[]): GuideAnswer["citations"] {
  const bySlug = new Map<string, GuideAnswer["citations"][number]>();
  for (const chunk of chunks) {
    const existing = bySlug.get(chunk.slug);
    if (!existing) {
      bySlug.set(chunk.slug, {
        title: chunk.title,
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
 * Pisahkan penanda pertanyaan lanjutan dari teks jawaban. Teks mentah - penanda
 * ikut di dalamnya - yang disimpan di cache, dan cache hit dibaca lewat fungsi
 * yang sama, jadi saran tidak hilang pada jawaban yang datang dari cache.
 */
function parseAnswer(raw: string): { reply: string; followUps: string[] } {
  const match = raw.match(FOLLOWUPS_MARKER);
  if (!match) return { reply: raw.trim(), followUps: [] };
  const reply = raw.replace(FOLLOWUPS_MARKER, "").trim();
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
function fallbackFollowUps(slugs: (string | null)[], question: string): string[] {
  const topics = new Set(slugs.filter((slug): slug is string => slug !== null));
  const asked = normalizeQuestion(question);
  const out: string[] = [];
  for (const faq of GUIDE_FAQ) {
    if (!topics.has(faq.topic)) continue;
    if (normalizeQuestion(faq.question) === asked || out.includes(faq.question)) continue;
    out.push(faq.question);
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

/** Satu paragraf pendek per topik, cukup untuk jawaban cadangan tanpa LLM. */
function excerpt(text: string, max = 220): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}

function retrievalReply(reason: string, chunks: ChunkRow[]): string {
  const header = DEGRADED_HEADER[reason] ?? DEGRADED_HEADER_DEFAULT;
  const seen = new Set<string>();
  const blocks: string[] = [];
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
  const chunks = await loadChunks({ slugs: articles.map((a) => a.slug) });
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
      reply: GREETING_REPLY[detectAnswerLanguage(question)],
      citations: [],
      // Sapaan tidak butuh tombol saran: teksnya sudah menyebut topik yang bisa
      // ditanya. Tombol saran cuma buat jawaban/refusal yang memang butuh arah.
      followUps: [],
      cacheHit: false,
      degraded: false,
      degradedReason: null,
      logId,
    };
  };

  if (searchTerms(question).length === 0 && questionEntities(question).length === 0) {
    return isSmallTalk(question) ? greet() : refuse(REFUSAL_NO_KEYWORDS);
  }

  const retrieved = await retrieve(question);
  if (!retrieved) return refuse(REFUSAL_NO_CHUNKS);

  const { articles, chunks } = retrieved;
  const chunkIds = chunks.map((c) => c.id);
  const citations = citationsFrom(chunks);
  const redacted = redactQuestion(question);
  const hash = answerCacheKey(redacted);
  const { corpusVersion, aiEnabled } = await loadMeta();

  // Cache hit tidak memakan kuota. Sitasinya tetap dibaca dari baris potongan,
  // jadi artikel yang sudah disembunyikan, dibatalkan tinjauannya, atau
  // kedaluwarsa tidak ikut terbit lewat cache walau corpus_version tidak naik.
  const cached = await findCachedAnswer(hash, corpusVersion);
  const cachedChunks = cached && cached.chunkIds.length > 0
    ? await loadChunks({ ids: cached.chunkIds })
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
    const cachedCitations = citationsFrom(cachedChunks);
    const parsed = parseAnswer(cached.answer);
    return {
      reply: parsed.reply,
      citations: cachedCitations,
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
    return {
      reply: retrievalReply(reason, chunks),
      citations,
      followUps: fallbackFollowUps(articles.map((a) => a.slug), question),
      cacheHit: false,
      degraded: true,
      degradedReason: reason,
      logId,
    };
  };

  if (!aiEnabled) return degraded("ai_nonaktif", false);
  if (!(await consumeQuota(input.userId))) return degraded("kuota_harian", false);

  const messages: GroqMessage[] = [
    { role: "system", content: buildChatSystemPrompt(buildGuideContext(articles), detectAnswerLanguage(question)) },
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
  const redacted = redactQuestion(normalized);
  const hash = answerCacheKey(redacted);
  const { corpusVersion, aiEnabled } = await loadMeta();

  if (await findCachedAnswer(hash, corpusVersion)) return "cached";
  if (!aiEnabled) return "skipped";

  try {
    const reply = await assistantChat(
      [
        { role: "system", content: buildChatSystemPrompt(buildGuideContext(articles), detectAnswerLanguage(normalized)) },
        { role: "user", content: normalized },
      ],
      { temperature: 0.5, maxTokens: ANSWER_MAX_TOKENS },
    );
    const parsed = parseAnswer(reply);
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
