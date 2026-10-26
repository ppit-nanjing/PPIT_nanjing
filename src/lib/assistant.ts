// Endpoint LLM terpisah untuk asisten tanya-jawab panduan maba. Sengaja tidak
// memakai groq.ts: fitur lama (AI Improve, saran konten, terjemahan) tetap di
// Groq, sedangkan jalur jawaban panduan (src/lib/guide-answer.ts) memakai
// endpoint OpenAI-compatible yang diatur lewat env (OPENAI_BASE_URL,
// OPENAI_API_KEY). Endpoint ini dipakai sementara dan boleh berganti-ganti
// tanpa menyentuh kode lain — host tidak pernah ditanam di sumber.
const CHAT_URL = process.env.OPENAI_BASE_URL
  ? `${process.env.OPENAI_BASE_URL.replace(/\/+$/, "")}/chat/completions`
  : "";

// Urutan model dicoba dari kiri ke kanan. Lewat env supaya pindah penyedia
// cuma mengubah konfigurasi: Cloudflare Workers AI memakai id
// `@cf/qwen/qwen3-30b-a3b-fp8` (yang disarankan di .env.example: ~35 Neuron per
// jawaban = ~283 jawaban/hari di jatah gratis 10k Neuron), sedangkan gateway
// OpenAI-compatible memakai alias `auto/*`. Kosong = perilaku lama.
const MODEL_CHAIN = (process.env.OPENAI_MODELS ?? "auto/best-fast,auto/chat")
  .split(",")
  .map((m) => m.trim())
  .filter((m) => m.length > 0);

const TIMEOUT_MS = 20_000;

export type AssistantMessage = { role: "system" | "user" | "assistant"; content: string };

type AssistantOptions = {
  /** Pin an exact model, skipping the fallback chain entirely. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export async function assistantChat(messages: AssistantMessage[], opts: AssistantOptions = {}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY belum diatur di environment");
  }
  if (!CHAT_URL) {
    throw new Error("OPENAI_BASE_URL belum diatur di environment");
  }

  const candidates = opts.model ? [opts.model] : MODEL_CHAIN;
  let lastError = new Error("Layanan AI sedang tidak tersedia");

  for (const model of candidates) {
    let res: Response;
    try {
      res = await fetch(CHAT_URL, {
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
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue; // network-level failure - try the next model
    }

    if (res.status === 401) {
      throw new Error(`Layanan AI sedang tidak tersedia (${res.status})`);
    }
    if (res.status === 429) {
      throw new Error("Layanan AI sedang sibuk, coba lagi sebentar lagi");
    }
    if (!res.ok) {
      lastError = new Error(`Layanan AI sedang tidak tersedia (${res.status})`);
      continue; // this model specifically is unavailable - try the next one
    }

    const data = await res.json();
    if (data?.usage) {
      console.log(
        `[assistant] ${model} prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} total=${data.usage.total_tokens}`,
      );
    }
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      lastError = new Error("Respons AI tidak valid");
      continue;
    }
    // Model penalaran kadang menghabiskan jatah token untuk penalarannya dan
    // mengembalikan content kosong dengan status 200. Dulu itu diteruskan
    // sebagai jawaban, lalu askGuide menyimpannya ke cache: gelembung kosong
    // yang bertahan untuk semua penanya. Coba model berikutnya.
    if (content.trim().length === 0) {
      lastError = new Error("Respons AI kosong");
      continue;
    }
    return content.trim();
  }

  throw lastError;
}
