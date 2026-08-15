const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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
      model: opts.model ?? "llama-3.3-70b-versatile",
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

export const AI_CHAT_SYSTEM_PROMPT =
  "Kamu adalah asisten virtual PPIT Nanjing, organisasi mahasiswa Indonesia di Nanjing, Tiongkok. " +
  "Jawab pertanyaan pengguna secara ramah dan ringkas dalam Bahasa Indonesia tentang PPIT Nanjing: " +
  "kegiatan, cara bergabung, beasiswa, komunitas, dan kehidupan mahasiswa Indonesia di Nanjing. " +
  "Gunakan informasi umum yang wajar; jika kamu tidak tahu detail spesifik, arahkan pengguna untuk " +
  "menghubungi pengurus melalui kontak resmi organisasi. JANGAN memberikan informasi pribadi anggota, " +
  "JANGAN menyarankan tindakan berbahaya, dan JANGAN berpura-pura bisa mengubah data pengguna. " +
  "Balas dalam 1-3 paragraf pendek.";
