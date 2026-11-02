// Penyaringan riwayat percakapan sebelum dikirim ke penyedia LLM. Dipisah dari
// src/lib/guide-answer.ts supaya bisa diuji tanpa menyambung database (berkas
// itu mengimpor src/db di tingkat modul). Tidak ada "use server": ini modul
// murni, dipakai Server Action chat dan jalur jawaban.
//
// Aturan yang dijaga di sini:
// - role hanya `user` dan `assistant`; klien tidak boleh menyelipkan `system`
//   yang akan menimpa system prompt;
// - isi non-string dibuang, tiap pesan dipotong, totalnya dibatasi;
// - email, nomor telepon, dan deretan angka panjang diredaksi supaya teks
//   mentah pengguna tidak pernah sampai ke penyedia.

export const MAX_HISTORY_TURNS = 12;
export const MAX_HISTORY_MESSAGE_CHARS = 2_000;
export const MAX_HISTORY_TOTAL_CHARS = 8_000;

export function redactPII(text: string, maxChars: number): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "[nomor]")
    .slice(0, maxChars);
}

export function sanitizeHistory(history: unknown): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(history)) return [];
  const cleaned: { role: "user" | "assistant"; content: string }[] = [];
  for (const item of history) {
    if (!item || typeof item !== "object") continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    // Tidak dirapatkan spasinya: markdown jawaban sebelumnya tetap terbaca model.
    const text = redactPII(content, MAX_HISTORY_MESSAGE_CHARS).trim();
    if (text.length === 0) continue;
    cleaned.push({ role, content: text });
  }
  // Anggaran total dihitung dari pesan terbaru ke belakang: konteks yang paling
  // dekat dengan pertanyaan sekarang yang paling penting.
  const kept: { role: "user" | "assistant"; content: string }[] = [];
  let total = 0;
  for (let i = cleaned.length - 1; i >= 0 && kept.length < MAX_HISTORY_TURNS; i--) {
    const length = cleaned[i].content.length;
    if (total + length > MAX_HISTORY_TOTAL_CHARS) break;
    total += length;
    kept.unshift(cleaned[i]);
  }
  return kept;
}
