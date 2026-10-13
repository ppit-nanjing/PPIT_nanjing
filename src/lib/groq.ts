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

// Hard cap per attempt. Without a signal a stalled request keeps the Vercel
// function alive until the platform limit, and the member stares at a spinner
// the whole time. 20 s is roughly 10x a full 800-token reply.
const GROQ_TIMEOUT_MS = 20_000;

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
        signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
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
    if (res.status === 429) {
      // Rate limit is per API key, not per model. Walking the chain would burn
      // the next models' quota and 429 there too, so stop at the first one.
      throw new Error("Layanan AI sedang sibuk, coba lagi sebentar lagi");
    }
    if (!res.ok) {
      lastError = new Error(`Layanan AI sedang tidak tersedia (${res.status})`);
      continue; // this model specifically is unavailable - try the next one
    }

    const data = await res.json();
    if (data?.usage) {
      console.log(
        `[groq] ${model} prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} total=${data.usage.total_tokens}`,
      );
    }
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

/**
 * System prompt chatbot Help Center. Chatbot TIDAK menjawab dari pengetahuan
 * umum: satu-satunya sumbernya adalah potongan artikel bantuan yang sudah
 * diterbitkan pengurus (lihat findGuideChunks/buildGuideContext di
 * src/lib/guidebook-search.ts). Alasannya bukan cuma akurasi - pertanyaan
 * maba soal visa, izin tinggal, biaya, dan tenggat tidak boleh dijawab
 * karangan, dan tiap jawaban harus bisa ditelusuri ke satu panduan yang bisa
 * diperbaiki pengurus tanpa deploy. Kalau tidak ada panduan yang cocok,
 * jawabannya "belum ada panduannya, tanya pengurus".
 *
 * `guideContext` kosong = tidak ada artikel publik yang cocok; prompt-nya
 * tetap dikirim supaya protokol ubah profil di bawah tetap jalan.
 */
export type AnswerLanguage = "id" | "en";

// Deteksi bahasa pertanyaan di kode, bukan diserahkan ke model. Model
// (gpt-oss-120b) menyerahkan keputusan ini ke konteks: seluruh prompt dan
// seluruh isi panduan berbahasa Indonesia, jadi pertanyaan Inggris yang singkat
// tetap dijawab Bahasa Indonesia walaupun prompt menyuruh sebaliknya. Karena
// itu bahasanya dihitung di sini lalu dikirim sebagai satu perintah terakhir.
// Skornya sederhana: kata fungsi khas tiap bahasa, bukan tebak-tebakan imbuhan.
// Seri atau tanpa penanda sama sekali (sapaan, satu kata) -> Bahasa Indonesia.
const ID_WORDS =
  /\b(yang|dan|atau|tidak|belum|sudah|apa|apakah|bagaimana|gimana|cara|kapan|dimana|berapa|siapa|kenapa|mengapa|untuk|dengan|dari|saya|aku|kamu|bisa|harus|perlu|ada|itu|ini|kalau|jika|tolong|mohon|terima|kasih|halo|hai|selamat|pagi|siang|malam|biaya|syarat|berkas|paspor|izin|tinggal|jam|hari|bulan|tahun|kota)\b/gi;
const EN_WORDS =
  /\b(the|a|an|how|what|where|when|why|which|who|whose|do|does|did|can|could|should|must|i|my|me|you|your|is|are|was|were|to|from|of|and|or|not|no|need|needed|get|got|go|going|apply|cost|price|time|there|have|has|with|for|about|this|that|it|permit|document|documents|airport|campus|dorm|phone|work|study|student)\b/gi;

export function detectAnswerLanguage(text: string): AnswerLanguage {
  const idHits = (text.match(ID_WORDS) ?? []).length;
  const enHits = (text.match(EN_WORDS) ?? []).length;
  return enHits > idHits ? "en" : "id";
}

export function buildChatSystemPrompt(guideContext: string, answerLanguage: AnswerLanguage = "id"): string {
  return (
    "Kamu asisten virtual PPIT Nanjing, organisasi mahasiswa Indonesia di Nanjing, Tiongkok. " +
    "Balas ramah dan sangat ringkas: langsung ke inti pertanyaan, 1-2 paragraf pendek, tanpa kalimat " +
    "pembuka atau penutup. " +
    "Judul panduan dan istilah resmi tetap dikutip apa adanya (biasanya Bahasa Indonesia). " +
    "Jawab HANYA dari sumber di bawah. JANGAN memakai pengetahuan umummu sendiri dan JANGAN menebak " +
    "angka, biaya, tenggat, syarat, atau prosedur: angka, biaya, dan tenggat hanya boleh disebut kalau " +
    "tertulis di sumber. Kalau salah satu sumber di bawah memuat bagian yang membahas topik " +
    "pertanyaannya - termasuk topik visa, izin tinggal, dan residence permit - jawab dari bagian itu, " +
    "jangan menolak. Baru kalau tidak ada satu pun bagian yang membahas topiknya, katakan terus terang " +
    "bahwa kamu belum punya panduannya dan arahkan pengguna menghubungi pengurus lewat kontak resmi " +
    "organisasi. Pertanyaan yang singkat, tidak baku, atau tidak rapi tetap dijawab dari bagian sumber " +
    "yang paling relevan; bahasa sumber yang berbeda dari bahasa pertanyaan bukan alasan menolak, " +
    "terjemahkan saja isinya. Ambil langkah, angka, dan syaratnya apa adanya dari sumber; jangan " +
    "menambah latar belakang, sejarah, asal-usul, asal dokumen, atau cara memperolehnya kalau tidak " +
    "tertulis di sumber. Kalau pengguna bertanya soal organisasi (misalnya \"apa itu PPIT\"), jelaskan " +
    "hanya definisi dan fungsinya dari sumber - jangan ceritakan sejarah atau asal-usulnya; sejarah " +
    "seperti itu justru dijadikan salah satu pertanyaan lanjutan, bukan bagian jawaban. " +
    "Kalau menjawab dari sumber, sebutkan judul panduannya (baris pertama tiap sumber, sesudah '###', " +
    "bukan judul sub-bagiannya) supaya pengguna bisa membacanya sendiri. " +
    "Kalau pesannya cuma sapaan, basa-basi, atau terima kasih, balas singkat dan wajar - aturan sumber " +
    "di atas berlaku untuk pertanyaan yang butuh informasi. " +
    "JANGAN memberikan informasi pribadi anggota dan JANGAN menyarankan tindakan berbahaya. " +
    "Sumber satu-satunya:" +
    "\n\n" +
    (guideContext || "(tidak ada panduan yang cocok dengan pertanyaan pengguna)") +
    "\n\n" +
    "Pengecualian dari aturan di atas: jika pengguna secara eksplisit meminta mengubah data profilnya " +
    "(nama, nomor telepon, WeChat, atau tautan LinkedIn/Instagram/GitHub/Spotify/TikTok/foto profil), " +
    "balas HANYA dengan format berikut dan jangan tambahkan teks lain: " +
    '<<PROFILE_EDIT:{"field":"<satu dari: name, phone, wechatId, linkedinUrl, instagramUrl, githubUrl, spotifyUrl, tiktokUrl, avatarUrl>","value":"<nilai baru>"}>>. ' +
    // Saran lanjutan ditumpangkan di balasan yang sama (bukan panggilan Groq
    // kedua): widget chat memakainya sebagai tombol. Dua belas kata cukup untuk
    // satu baris tombol dan mencegah model menulis satu paragraf.
    "Sesudah jawabannya, tuliskan nol sampai tiga pertanyaan lanjutan yang paling mungkin ditanyakan pengguna " +
    "berikutnya - tulis hanya yang benar-benar relevan, boleh nol atau satu kalau tidak ada yang berguna. " +
    "Masing-masing maksimal 12 kata, HARUS berkaitan langsung dengan topik yang baru saja " +
    "kamu jawab dan HARUS bisa dijawab dari sumber di atas (jangan menyarankan pertanyaan yang sumbernya " +
    "tidak memuat jawabannya), dalam format: " +
    '<<FOLLOWUPS:["pertanyaan pertama","pertanyaan kedua"]>>. ' +
    "Jangan menulis apa pun sesudah penanda itu. Jangan pakai penanda ini kalau balasannya cuma " +
    "pengecualian perubahan data profil di atas. " +
    // Perintah bahasa ditaruh paling akhir dan berdiri sendiri: instruksi di
    // tengah prompt kalah oleh seluruh isi panduan yang berbahasa Indonesia.
    (answerLanguage === "en"
      ? "Aturan bahasa yang mengikat: balas dalam Bahasa Inggris, jangan pakai Bahasa Indonesia kecuali judul panduan dan istilah resmi."
      : "Aturan bahasa yang mengikat: balas dalam Bahasa Indonesia.")
  );
}
