const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Groq retired llama-3.3-70b-versatile (confirmed via GET /openai/v1/models -
// 404 model_not_found as of 2026-08-28), which silently broke every AI feature
// on the site (AI Improve, help-center chat, content suggestions, and the new
// translateFields() below) since whatever day Groq pulled it - groqChat() only
// throws a generic "Layanan AI sedang tidak tersedia", so nothing surfaced this
// distinctly from a transient outage. Re-check /openai/v1/models if this 404s
// again; Groq's active lineup rotates.
const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";

export type GroqRole = "system" | "user" | "assistant";
export type GroqMessage = { role: GroqRole; content: string };

type GroqOptions = {
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

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? GROQ_DEFAULT_MODEL,
      messages,
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 800,
    }),
  });

  if (!res.ok) {
    throw new Error(`Layanan AI sedang tidak tersedia (${res.status})`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Respons AI tidak valid");
  }
  return content.trim();
}

export type ImproveContext = "event" | "news" | "gallery" | "feedback";

const SYSTEM_BY_CONTEXT: Record<ImproveContext, string> = {
  event:
    "Kamu adalah editor konten PPIT Nanjing, organisasi mahasiswa Indonesia di Nanjing, Tiongkok. Perbaiki teks deskripsi kegiatan berikut: perbaiki ejaan dan tata bahasa, buat lebih jelas dan menarik, dan bila cocok tambahkan satu emoji di awal. JANGAN mengubah fakta, tanggal, atau nama. Balas HANYA teks yang sudah diperbaiki, tanpa tanda kutip dan tanpa penjelasan.",
  news:
    "Kamu adalah editor berita PPIT Nanjing, organisasi mahasiswa Indonesia di Nanjing, Tiongkok. Perbaiki teks berita berikut: perbaiki ejaan dan tata bahasa, buat lebih enak dibaca, dan bila cocok tambahkan emoji yang pantas. JANGAN mengubah fakta. Balas HANYA teks yang sudah diperbaiki, tanpa tanda kutip dan tanpa penjelasan.",
  gallery:
    "Kamu adalah editor konten PPIT Nanjing. Perbaiki keterangan foto berikut menjadi singkat, jelas, dan natural. Boleh tambahkan emoji bila cocok. JANGAN mengubah fakta. Balas HANYA teks yang sudah diperbaiki, tanpa tanda kutip dan tanpa penjelasan.",
  feedback:
    "Kamu membantu menyunting masukan (feedback) pengguna PPIT Nanjing agar lebih jelas dan sopan. Perbaiki ejaan dan tata bahasa, perjelas maksud, tapi pertahankan nada asli pengirim dan JANGAN mengubah substansi keluhan/ide. Balas HANYA teks yang sudah diperbaiki, tanpa tanda kutip dan tanpa penjelasan.",
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
    "Kamu akan menerima satu objek JSON berisi teks Bahasa Indonesia. Terjemahkan NILAI setiap key ke Bahasa " +
    "Inggris yang natural dan ringkas, JANGAN ubah key apa pun. Nama diri (tempat, merek, institusi) yang " +
    "memang tidak lazim diterjemahkan boleh dibiarkan sama. JANGAN tambahkan key baru maupun penjelasan. " +
    "Balas HANYA objek JSON valid satu baris, tanpa markdown code fence.";

  let raw: string;
  try {
    raw = await groqChat(
      [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(Object.fromEntries(entries)) },
      ],
      { temperature: 0.3, maxTokens: 800 },
    );
  } catch {
    return {}; // Groq down/rate-limited - pemanggil fallback, jangan sampai gagalkan submit form
  }

  // Model kadang membungkus balasan dalam ```json ... ``` walau diminta tidak -
  // lucuti sebelum parse.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {}; // respons bukan JSON valid - fallback, bukan error
  }
  if (typeof parsed !== "object" || parsed === null) return {};

  const result: Record<string, string> = {};
  for (const [key] of entries) {
    const value = (parsed as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) result[key] = value.trim();
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
