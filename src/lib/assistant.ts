// Endpoint LLM terpisah untuk asisten tanya-jawab panduan maba. Sengaja tidak
// memakai groq.ts: fitur lama (AI Improve, saran konten, terjemahan) tetap di
// Groq, sedangkan jalur jawaban panduan (src/lib/guide-answer.ts) memakai
// endpoint OpenAI-compatible yang diatur lewat env (OPENAI_BASE_URL,
// OPENAI_API_KEY). Endpoint ini dipakai sementara dan boleh berganti-ganti
// tanpa menyentuh kode lain — host tidak pernah ditanam di sumber.
const CHAT_URL = process.env.OPENAI_BASE_URL
  ? `${process.env.OPENAI_BASE_URL.replace(/\/+$/, "")}/chat/completions`
  : "";

// Alias `auto/*` merutekan ke model di balik gateway, jadi satu alias bisa
// dipindah tanpa mengubah kode.
const MODEL_CHAIN = ["auto/best-fast", "auto/chat"];

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
    return content.trim();
  }

  throw lastError;
}
