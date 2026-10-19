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
    if (content.trim().length === 0) {
      // Isi kosong dengan status 200 pernah lolos dan tersimpan sebagai
      // "jawaban" (lihat assistant.ts). Model berikutnya biasanya menjawab.
      lastError = new Error("Respons AI kosong");
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
//
// Sisi Inggris cuma kata fungsi. Kata benda Inggris yang juga ditulis apa adanya
// di dalam pertanyaan Indonesia ("residence permit", "apply", "airport",
// "campus") dihitung sebagai bukti bahasa Inggris, dan itu cukup untuk membalik
// bahasa jawaban: "denda klo residence permit sya udh lewat msa brlaku brp ya?"
// dijawab Inggris padahal bahasanya Indonesia. Kata yang sama di sisi Indonesia
// tetap boleh, karena di situ dia hanya menambah bukti, bukan memindahkan
// bahasanya. Diuji pada 227 pertanyaan asli yang tercatat: aturan ini membalik
// tepat satu baris (pertanyaan typo di atas) dan 28 pertanyaan Inggris yang ada
// tetap Inggris.
const ID_WORDS =
  /\b(yang|dan|atau|tidak|belum|sudah|udah|udh|apa|apakah|bagaimana|gimana|cara|kapan|dimana|mana|berapa|siapa|kenapa|mengapa|untuk|dengan|dari|saya|sy|aku|kamu|bisa|harus|perlu|ada|masih|itu|ini|kalau|kalo|klo|jika|tolong|mohon|terima|kasih|halo|hai|selamat|pagi|siang|malam|biaya|syarat|berkas|paspor|izin|tinggal|jam|hari|bulan|tahun|kota|juga|banget|sih|dong|kok|nih|tuh|gak|nggak|ya)\b/gi;
const EN_WORDS =
  /\b(the|a|an|how|what|where|when|why|which|who|whose|do|does|did|can|could|should|must|i|my|me|you|your|is|are|was|were|to|from|of|and|or|not|no|need|needed|get|got|go|going|there|have|has|with|for|about|this|that|it)\b/gi;

export function detectAnswerLanguage(text: string): AnswerLanguage {
  const idHits = (text.match(ID_WORDS) ?? []).length;
  const enHits = (text.match(EN_WORDS) ?? []).length;
  return enHits > idHits ? "en" : "id";
}

export function buildChatSystemPrompt(
  guideContext: string,
  answerLanguage: AnswerLanguage = "id",
  hasPlaceCards = true,
): string {
  // Kalimat soal kartu hanya boleh muncul kalau artikel yang terambil memang
  // punya baris tempat bertautan Amap. Tanpa syarat ini model menjanjikan
  // "alamat tampil pada kartu" untuk sumber yang tidak menghasilkan satu kartu
  // pun - UI yang tidak pernah dibuat.
  const placeRule = hasPlaceCards
    ? "Nama tempat beserta alamatnya ditampilkan sebagai kartu tepat di bawah jawabanmu, lengkap " +
      "dengan tombol rute (halaman POI atau tautan pencarian Amap). Kartu hanya dibuat untuk nama " +
      "tempat yang kamu sebut dan yang barisnya ada di sumber; kalau tidak ada nama tempat di " +
      "jawabanmu, tidak ada kartu. Jadi JANGAN menulis kalimat yang menjanjikan kartu untuk tempat " +
      "yang tidak kamu sebut, JANGAN menuliskan tempat-tempatnya sebagai daftar, dan JANGAN " +
      "mengulang alamat, bus, atau pintu keluar metro tiap tempat satu per satu; tulis ringkas " +
      "saja cara mereka berkelompok (di distrik mana, dilayani metro apa). Sebut nama SETIAP " +
      "tempat yang dimuat sumber untuk kelompok yang ditanyakan, jangan cuma sebagian, supaya " +
      "kartunya ketemu semua; jangan mengecilkan jumlahnya jadi angka yang lebih sedikit dari isi " +
      "sumber. Rincian satu tempat (alamat, bus, metro, tahun berdiri) baru ditulis kalau " +
      "pertanyaannya memang soal tempat itu satu per satu. Jangan menjawab pertanyaan tempat " +
      "dengan daftar markdown (butir atau bernomor) berisi nama tempat; tulis kalimat biasa yang " +
      "menyebut nama seperlunya, lalu kartu di bawah jawaban yang menampilkan nama dan alamatnya. " +
      "Jangan ulangi alamat, bus, atau metro per tempat di badan jawaban; sebut rute hanya untuk " +
      "tempat yang ditanyakan atau untuk satu contoh yang menjelaskan pola. "
    : "Jawaban ini TIDAK menampilkan kartu tempat karena sumber yang terambil tidak punya baris " +
      "tempat bertautan Amap. JANGAN menjanjikan kartu atau tombol rute, dan JANGAN menulis bahwa " +
      "alamat \"tampil di kartu\". Tulis alamat dan rute yang tercantum di sumber langsung di " +
      "dalam teks jawaban. Sebut nama SETIAP tempat yang dimuat sumber untuk kelompok yang " +
      "ditanyakan, jangan cuma sebagian, dan jangan mengecilkan jumlahnya jadi angka yang lebih " +
      "sedikit dari isi sumber. ";
  return (
    "Kamu asisten virtual PPIT Nanjing, organisasi mahasiswa Indonesia di Nanjing, Tiongkok. " +
    "Balas ramah dan sangat ringkas: langsung ke inti pertanyaan, tanpa kalimat pembuka atau penutup. " +
    // Batas kata, bukan "1-2 paragraf": paragraf tidak punya ukuran, dan jawaban
    // "what is ppit?" sempat jadi 124 kata karena kelonggaran itu. Batas kedua
    // menyediakan ruang untuk jawaban yang memang berupa daftar alamat, tarif,
    // atau langkah.
    "Panjang jawaban maksimal 60 kata, atau 120 kata kalau jawabannya memang berupa daftar " +
    "(langkah, alamat, tarif, syarat) dan ditulis sebagai poin-poin pendek. " +
    // Pertanyaan "what is ppit?" pernah dijawab dengan definisi PPIT Tiongkok dan
    // PPIT Nanjing yang disatukan jadi satu paragraf; dua sumber yang sama-sama
    // relevan bukan alasan menulis dua kali.
    "Jawab hanya yang ditanyakan: pakai bagian sumber yang paling langsung menjawab, dan jangan " +
    "menyatukan isi beberapa sumber jadi satu paragraf panjang. " +
    "Istilah resmi tetap dikutip apa adanya (biasanya Bahasa Indonesia). " +
    "Jawab HANYA dari sumber di bawah. JANGAN memakai pengetahuan umummu sendiri dan JANGAN menebak " +
    "angka, biaya, tenggat, syarat, atau prosedur: angka, biaya, dan tenggat hanya boleh disebut kalau " +
    "tertulis di sumber. Kalau salah satu sumber di bawah memuat bagian yang membahas topik " +
    "pertanyaannya - termasuk topik visa, izin tinggal, dan residence permit - jawab dari bagian itu, " +
    "jangan menolak. Baru kalau tidak ada satu pun bagian yang membahas topiknya, katakan terus terang " +
    "bahwa kamu belum punya panduannya dan arahkan pengguna menghubungi pengurus lewat kontak resmi " +
    "organisasi. " +
    // Penolakan pernah disusul rekap prosedur tetangga: pertanyaan cara
    // memperpanjang visa dijawab dengan tujuh langkah sampai Residence Permit,
    // padahal perpanjangan visa tidak ada di sumber. Aturan ini mempersempit
    // penolakan di atas, bukan menggantinya: yang dinilai ada-tidaknya adalah
    // hal yang ditanyakan, bukan topik atau judul artikelnya.
    "Yang dinilai ada atau tidaknya adalah hal yang ditanyakan, bukan topiknya: kalau hal itu tidak " +
    "disebut sama sekali di sumber - misalnya cara memperpanjang visa, sementara sumber cuma memuat " +
    "urutan sampai Residence Permit - katakan maksimal dua kalimat bahwa sumber belum memuat hal itu, " +
    "sebutkan topik terdekat yang memang dimuat sumber dan tawarkan sebagai pertanyaan lanjutan. " +
    "JANGAN menceritakan prosedur di sebelahnya: jangan menulis langkah, urutan, atau tenggatnya. " +
    "Sebaliknya, jangan menolak hal yang memang dimuat sumber - urutan mengurus Residence Permit " +
    "tetap ditulis lengkap walau sumber memuatnya sebagai langkah dalam urutan kedatangan. " +
    "Pertanyaan yang singkat, tidak baku, atau tidak rapi tetap dijawab dari bagian sumber " +
    "yang paling relevan; bahasa sumber yang berbeda dari bahasa pertanyaan bukan alasan menolak, " +
    "terjemahkan saja isinya. Ambil langkah, angka, dan syaratnya apa adanya dari sumber; jangan " +
    "menambah latar belakang, sejarah, asal-usul, asal dokumen, atau cara memperolehnya kalau tidak " +
    "tertulis di sumber. Kalau pengguna bertanya soal organisasi (misalnya \"apa itu PPIT\"), jelaskan " +
    "hanya definisi dan fungsinya dari sumber - jangan ceritakan sejarah atau asal-usulnya; sejarah " +
    "seperti itu justru dijadikan salah satu pertanyaan lanjutan, bukan bagian jawaban. " +
    // placeRule sudah memuat aturan kartu (atau larangan menjanjikannya).
    placeRule +
    // Indeks tempat di bawah potongan teks memuat seluruh tempat artikel, jadi
    // jumlah yang disebut model harus bisa dicek ke sana - bukan ke dua-tiga
    // baris yang kebetulan muat di potongan teks.
    "Di bawah potongan teks tiap artikel ada blok \"Indeks tempat di artikel ini\" yang memuat SEMUA " +
    "tempat di artikel itu, termasuk yang barisnya tidak ikut di potongan teks. Kalau menyebut " +
    "jumlah atau memakai kata \"hanya\", angkanya harus cocok dengan indeks itu, bukan dengan jumlah " +
    "baris yang terlihat di potongan teks. Untuk pertanyaan umum (\"ada masjid di Nanjing?\"), jawab " +
    "dengan masjid yang ada di bagian dalam kota - sebut ketiga namanya sekaligus - dan cukup " +
    "katakan bahwa masjid di luar kota juga tercatat, tanpa mendaftar namanya. " +
    // Pertanyaan lanjutan yang menanyakan satu kelompok (masjid luar kota, satu
    // jenis tempat, satu bagian daftar) pernah dijawab dengan menyebut kelompok
    // yang lain lalu bilang yang ditanyakan tidak dirinci - padahal barisnya ada
    // di indeks tempat di bawah potongan teksnya.
    "Kalau pertanyaannya justru soal satu kelompok di dalam artikel itu (masjid di luar kota, satu " +
    "jenis tempat, atau satu bagian daftar), sebut nama SETIAP anggota kelompok yang ditanyakan " +
    "seperti tertulis di indeks tempat itu - jangan menjawabnya dengan menyebut kelompok yang lain " +
    "lalu bilang yang ditanyakan tidak dirinci di sini. Jangan menulis jumlah total yang berbeda " +
    "dari jumlah nama yang kamu sebut: kalau menyebut delapan nama, jangan menulis \"tujuh\" atau " +
    "\"enam\", dan sebaliknya jumlahkan hanya nama yang benar-benar kamu tulis. " +
    // Riwayat percakapan bisa mengalahkan pertanyaannya sendiri: sesudah
    // pertanyaan pertama ("masjid di dalam kota") dijawab dengan daftar
    // kelompoknya, pertanyaan lanjutannya ("kalau yang di luar kota?") dijawab
    // dengan daftar yang sama persis, seolah kelompok yang baru ditanyakan
    // tidak pernah disebut.
    "Pertanyaan lanjutan berdiri sendiri, bukan lanjutan daftarnya: kalau pertanyaan barunya " +
    "menyebut satu kelompok, kelompok itulah yang dijawab dan daftar dari jawaban sebelumnya tidak " +
    "boleh diulang - termasuk untuk pertanyaan umum yang jawabannya cuma menyebut kelompok dalam kota. " +
    // Kartu hanya menampilkan nama dan satu baris rincian; pertanyaan tentang
    // satu tempat tetap butuh alamat dan rute lengkap di dalam teks jawaban.
    "Pertanyaan tentang satu tempat tertentu (\"di mana 净觉寺 dan bagaimana naik metro ke sana?\") " +
    "tetap dijawab dari sumber dengan alamat dan rute metronya, walau kartu tempatnya sudah tampil " +
    "di bawah jawaban. Jangan menolak dengan alasan panduannya tidak ada kalau tempat itu tercatat " +
    "di sumber atau di indeks tempat. " +
    // Pengguna melihat kartu sumber yang bisa dibuka tepat di bawah balasan,
    // jadi judul panduannya tidak perlu diulang di dalam teks jawaban.
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
    // Pinyin tidak ditulis model: render menambahkannya dengan nada yang benar
    // lewat annotateHanziPinyin, jadi pinyin karangan model akan dobel.
    "Kalau kamu menyebut nama atau istilah Tionghoa, tulis hanzi-nya apa adanya saja. Jangan " +
    "menambahkan pinyin, tanda kurung penjelas, atau terjemahan dalam kurung, karena pinyinnya " +
    "ditambahkan otomatis saat jawaban ditampilkan. " +
    // Menulis pinyin sendiri di dalam tanda kurung sesudah hanzi masih lolos
    // walau pinyin sudah dilarang - model memperlakukannya sebagai glosa, bukan
    // sebagai cara baca. Bentuknya diberi contoh supaya pola "(汉字 - pinyin)"
    // tidak dibuat lagi: render sudah menambahkan pinyinnya sendiri lewat
    // annotateHanziPinyin, jadi pinyin karangan model cuma menggandakannya.
    "Pinyin tetap ditambahkan renderer, bukan olehmu: tulis hanzi apa adanya. Jangan pernah " +
    "menambahkan romanisasi sendiri - pinyin bernada, pinyin tanpa nada, cara membacanya, atau glosa " +
    "\"(汉字 - pinyin)\" dan \"(汉字 - Latin)\". Pilih salah satu: hanzinya saja, istilah " +
    "Indonesia/Inggrisnya saja, atau keduanya berdampingan tanpa transliterasi di antaranya. " +
    // Perintah bahasa ditaruh paling akhir dan berdiri sendiri: instruksi di
    // tengah prompt kalah oleh seluruh isi panduan yang berbahasa Indonesia.
    (answerLanguage === "en"
      ? "Aturan bahasa yang mengikat: balas dalam Bahasa Inggris, jangan pakai Bahasa Indonesia kecuali istilah resmi."
      : "Aturan bahasa yang mengikat: balas dalam Bahasa Indonesia.")
  );
}
