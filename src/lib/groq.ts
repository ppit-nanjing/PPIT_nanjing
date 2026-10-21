import { DESCRIPTION_FONT_OPTIONS, DESCRIPTION_SIZE_OPTIONS } from "@/lib/event-description-style";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Groq retired llama-3.3-70b-versatile (confirmed via GET /openai/v1/models -
// 404 model_not_found as of 2026-08-28), which silently broke every AI feature
// on the site (AI Improve, help-center chat, content suggestions, and
// translateFields() below) since whatever day Groq pulled it - groqChat() only
// threw a generic "Layanan AI sedang tidak tersedia", indistinguishable from a
// transient outage.
//
// Fix: walk this chain in order instead of hardcoding one model. One entry
// being retired/rate-limited/momentarily down no longer takes out every AI
// feature at once - it just falls through to the next. Re-check
// GET /openai/v1/models if every entry starts 404ing; Groq's lineup rotates.
// This only covers a single retired/unavailable MODEL, not Groq's API being
// down entirely - that would need a second provider (OpenRouter/Gemini), not
// wired up yet.
const GROQ_MODEL_CHAIN = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

export type GroqRole = "system" | "user" | "assistant";
export type GroqMessage = { role: GroqRole; content: string };

type GroqOptions = {
  /** Pin an exact model, skipping the fallback chain entirely. No current caller does this. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

/**
 * Thin server-side wrapper around Groq's OpenAI-compatible chat endpoint.
 * The API key is read from GROQ_API_KEY (set in Vercel) and never reaches the client.
 */
export async function groqChat(messages: GroqMessage[], opts: GroqOptions = {}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY belum diatur di environment");
  }

  const candidates = opts.model ? [opts.model] : GROQ_MODEL_CHAIN;
  let lastError = new Error("Layanan AI sedang tidak tersedia");

  for (const model of candidates) {
    let res: Response;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.6,
          max_tokens: opts.maxTokens ?? 800,
        }),
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue; // network-level failure - try the next model
    }

    if (res.status === 401) {
      // Bad/expired API key - every model in the chain fails identically, so
      // stop now instead of burning N requests to learn that N times.
      throw new Error(`Layanan AI sedang tidak tersedia (${res.status})`);
    }
    if (!res.ok) {
      lastError = new Error(`Layanan AI sedang tidak tersedia (${res.status})`);
      continue; // this model specifically is unavailable - try the next one
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      lastError = new Error("Respons AI tidak valid");
      continue;
    }
    return content.trim();
  }

  throw lastError;
}

export type ImproveContext = "event" | "news" | "gallery" | "feedback";

// Groq itu LLM, jadi tanpa rambu ini "merapikan" sering berarti *menambah* pola
// tulisan AI. Ini subset lintas-bahasa dari skill stop-slop/humanizer - pola
// yang tetap kentara di Bahasa Indonesia. TIDAK dipakai untuk konteks `feedback`,
// di sana yang dijaga justru nada asli pengirim.
const ANTI_SLOP_ID =
  " Tulisannya harus wajar seperti ditulis orang, bukan AI: pakai kalimat aktif dan sebut pelakunya; " +
  "langsung ke inti tanpa pembuka basa-basi ('perlu diketahui', 'pada dasarnya', 'tak dapat dipungkiri'); " +
  "jangan pakai pola 'bukan sekadar X, melainkan Y' untuk menambah kesan; " +
  "jangan menumpuk tiga hal hanya supaya terdengar lengkap; " +
  "jangan menutup dengan kalimat satu baris yang cuma mengulang; " +
  "jangan melebih-lebihkan ('momen penting', 'membuktikan dedikasi', 'semangat membara'); " +
  "hindari tanda pisah (—) sebagai penyambung, pakai titik atau koma; variasikan panjang kalimat.";

const OUTPUT_RULE = " Balas HANYA teks yang sudah diperbaiki, tanpa tanda kutip dan tanpa penjelasan.";

const SYSTEM_BY_CONTEXT: Record<ImproveContext, string> = {
  event:
    "Kamu adalah editor konten PPIT Nanjing, organisasi mahasiswa Indonesia di Nanjing, Tiongkok. Perbaiki teks deskripsi kegiatan berikut: perbaiki ejaan dan tata bahasa, buat lebih jelas dan menarik, dan bila cocok tambahkan satu emoji di awal. JANGAN mengubah fakta, tanggal, atau nama." +
    ANTI_SLOP_ID +
    OUTPUT_RULE,
  news:
    "Kamu adalah editor berita PPIT Nanjing, organisasi mahasiswa Indonesia di Nanjing, Tiongkok. Perbaiki teks berita berikut: perbaiki ejaan dan tata bahasa, buat lebih enak dibaca, dan bila cocok tambahkan emoji yang pantas. JANGAN mengubah fakta." +
    ANTI_SLOP_ID +
    OUTPUT_RULE,
  gallery:
    "Kamu adalah editor konten PPIT Nanjing. Perbaiki keterangan foto berikut menjadi singkat, jelas, dan natural. Boleh tambahkan emoji bila cocok. JANGAN mengubah fakta." +
    ANTI_SLOP_ID +
    OUTPUT_RULE,
  feedback:
    "Kamu membantu menyunting masukan (feedback) pengguna PPIT Nanjing agar lebih jelas dan sopan. Perbaiki ejaan dan tata bahasa, perjelas maksud, tapi pertahankan nada asli pengirim dan JANGAN mengubah substansi keluhan/ide." +
    OUTPUT_RULE,
};

export async function improveIndonesianText(text: string, context: ImproveContext): Promise<string> {
  return groqChat(
    [
      { role: "system", content: SYSTEM_BY_CONTEXT[context] },
      { role: "user", content: text },
    ],
    { temperature: 0.4, maxTokens: 700 },
  );
}

// Deskripsi acara itu rich text (toolbar editor: tebal, miring, rata teks,
// font, ukuran), jadi "perbagus" boleh sekalian memakai toolbar itu. Model
// diberi HANYA subset HTML yang bisa dihasilkan toolbar; hasilnya tetap
// disanitasi sanitizeDescriptionHtml() oleh pemanggil, jadi prompt ini cuma
// mengarahkan, bukan penjaga keamanan.
const DESCRIPTION_HTML_RULES =
  "Format keluaran: HTML dengan HANYA elemen berikut. " +
  "<p> untuk tiap paragraf (boleh style=\"text-align:left|center|right|justify\"), <strong>, <em>, <br>, " +
  `<span style="font-size:${DESCRIPTION_SIZE_OPTIONS.map((s) => s.px).join("|")}"> dan ` +
  `<span style="font-family:var(--font-KEY)"> dengan KEY salah satu dari: ${DESCRIPTION_FONT_OPTIONS.map((f) => f.key).join(", ")}. ` +
  "Tidak ada tag lain, tidak ada class, tidak ada warna, tidak ada markdown. " +
  "Pakai format seperlunya supaya enak dibaca: judul pembuka boleh <strong>, lebih besar (24px), dan rata tengah, begitu juga kalimat penutup; rincian dan isi biasa dibiarkan rata kiri (jangan ditengahkan semua); " +
  "rincian penting seperti tanggal, jam, tempat, biaya, dan batas daftar diberi label <strong> (mis. <strong>Tanggal:</strong> ...) dan dipisah per baris atau paragraf; " +
  "penutup/ajakan boleh <em>. Teks isi biasa jangan diberi font atau ukuran, biarkan bawaan situs. " +
  "Pakai paling banyak SATU font dekoratif (serif/display), hanya untuk judul pembuka, dan jangan campur banyak font. " +
  "Jangan berlebihan: kalau teks pendek, cukup beberapa paragraf rapi dengan sedikit penekanan.";

const EVENT_DESCRIPTION_SYSTEM =
  "Kamu adalah editor konten PPIT Nanjing, organisasi mahasiswa Indonesia di Nanjing, Tiongkok. " +
  "Kamu menerima deskripsi kegiatan dalam bentuk HTML (atau teks biasa). Perbaiki ejaan dan tata bahasa, buat lebih jelas dan menarik, " +
  "dan atur tampilannya dengan format toolbar editor. Bila cocok tambahkan satu emoji di awal. " +
  "JANGAN mengubah atau menambah fakta, tanggal, jam, tempat, biaya, atau nama; jangan mengarang informasi yang tidak ada di teks." +
  ANTI_SLOP_ID +
  " " +
  DESCRIPTION_HTML_RULES +
  " Balas HANYA HTML-nya, tanpa code fence dan tanpa penjelasan.";

export async function improveEventDescriptionHtml(html: string): Promise<string> {
  // Anggaran token longgar: gpt-oss menghitung token "berpikir" ke max_tokens,
  // dan HTML lebih panjang dari teks polos - 700 memotong balasan di tengah.
  const raw = await groqChat(
    [
      { role: "system", content: EVENT_DESCRIPTION_SYSTEM },
      { role: "user", content: html },
    ],
    { temperature: 0.4, maxTokens: 3000 },
  );
  return raw.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
}

// Parse balasan Groq untuk translateFields: buang code fence, ambil hanya
// pasangan key->string yang valid. null = respons tidak bisa dipakai.
function parseTranslationReply(raw: string): Record<string, string> | null {
  // Model kadang membungkus balasan dalam ```json ... ``` walau diminta tidak -
  // lucuti sebelum parse.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) result[key] = value.trim();
  }
  return result;
}

/**
 * Terjemahkan satu atau lebih field teks Indonesia ke Inggris dalam SATU
 * panggilan Groq (bukan satu panggilan per field) - dipakai city-content.ts
 * untuk auto-isi kolom `*_en` (places, universities, districts, merchandise,
 * sponsors) saat admin submit form dalam Bahasa Indonesia.
 *
 * Kontrak: kirim hanya field yang MEMANG perlu diterjemahkan (field kosong
 * atau yang sudah diisi manual oleh admin harus difilter oleh pemanggil
 * SEBELUM masuk sini - fungsi ini tidak tahu mana yang "manual override").
 * Balikannya cuma berisi key yang berhasil diterjemahkan; key yang gagal
 * di-parse dari respons AI hilang dari objek balikan, bukan diisi string
 * kosong - pemanggil fallback ke null/teks sumber untuk key yang hilang.
 */
export async function translateFields(fields: Record<string, string>): Promise<Record<string, string>> {
  const entries = Object.entries(fields).filter(([, v]) => v.trim().length > 0);
  if (entries.length === 0) return {};

  const system =
    "Kamu penerjemah untuk situs publik PPIT Nanjing, organisasi mahasiswa Indonesia di Nanjing, Tiongkok. " +
    "Kamu akan menerima satu objek JSON. Untuk setiap key, deteksi dulu bahasa isinya: kalau SUDAH Bahasa " +
    "Inggris, kembalikan APA ADANYA verbatim - JANGAN diparafrase, dipoles, atau diubah gaya bahasanya sama " +
    "sekali. Kalau bahasa lain (biasanya Indonesia), terjemahkan ke Bahasa Inggris yang natural dan ringkas. " +
    "JANGAN ubah key apa pun. Nama diri (tempat, merek, institusi) yang memang tidak lazim diterjemahkan boleh " +
    "dibiarkan sama. JANGAN tambahkan key baru maupun penjelasan. Balas HANYA objek JSON valid satu baris, " +
    "tanpa markdown code fence.";

  // Maks 800 token per panggilan - pecah field jadi potongan kecil supaya JSON
  // tidak terpotong di tengah saat payload besar (mis. 8 field deskripsi
  // panjang). Kegagalan potongan mana pun = return {} seluruhnya (semantik
  // sama dengan sebelumnya: pemanggil fallback, bukan error).
  const result: Record<string, string> = {};
  const CHUNK_CHARS = 600;
  for (let offset = 0; offset < entries.length; ) {
    const chunk: Record<string, string> = {};
    let size = 0;
    while (offset < entries.length && size < CHUNK_CHARS) {
      const [key, value] = entries[offset];
      chunk[key] = value;
      size += key.length + value.length + 2;
      offset++;
    }

    let raw: string;
    try {
      raw = await groqChat(
        [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(chunk) },
        ],
        { temperature: 0.3, maxTokens: 800 },
      );
    } catch {
      return {}; // Groq down/rate-limited - pemanggil fallback, jangan sampai gagalkan submit form
    }

    const parsed = parseTranslationReply(raw);
    if (!parsed) return {}; // respons bukan JSON valid - fallback, bukan error

    for (const [key] of Object.entries(chunk)) {
      if (parsed[key]) result[key] = parsed[key];
    }
  }
  return result;
}

export const AI_CHAT_SYSTEM_PROMPT =
  "Kamu adalah asisten virtual PPIT Nanjing, organisasi mahasiswa Indonesia di Nanjing, Tiongkok. " +
  "Jawab pertanyaan pengguna secara ramah dan ringkas dalam Bahasa Indonesia tentang PPIT Nanjing: " +
  "kegiatan, cara bergabung, beasiswa, komunitas, dan kehidupan mahasiswa Indonesia di Nanjing. " +
  "Gunakan informasi umum yang wajar; jika kamu tidak tahu detail spesifik, arahkan pengguna untuk " +
  "menghubungi pengurus melalui kontak resmi organisasi. JANGAN memberikan informasi pribadi anggota " +
  "dan JANGAN menyarankan tindakan berbahaya. " +
  "Jika pengguna secara eksplisit meminta mengubah data profilnya (nama, nomor telepon, WeChat, " +
  "atau tautan LinkedIn/Instagram/GitHub/Spotify/TikTok/foto profil), balas HANYA dengan format " +
  "berikut dan jangan tambahkan teks lain: " +
  '<<PROFILE_EDIT:{"field":"<satu dari: name, phone, wechatId, linkedinUrl, instagramUrl, githubUrl, spotifyUrl, tiktokUrl, avatarUrl>","value":"<nilai baru>"}>>. ' +
  "Untuk permintaan lain, balas secara normal dalam 1-3 paragraf pendek.";
