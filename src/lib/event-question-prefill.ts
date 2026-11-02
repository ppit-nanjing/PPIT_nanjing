// Pertanyaan teks kustom pendaftaran acara yang labelnya SAMA dengan isian sensus
// diisi otomatis dari sensus (kalau sensusnya lengkap); yang berlabel LinkedIn,
// Instagram, GitHub, Spotify, atau TikTok diisi dari tautan di profil akun. Hanya isian yang tidak
// sensitif: paspor, telepon, dan WeChat sengaja tidak termasuk, karena jawaban
// kustom tampil ke seluruh panitia yang boleh melihat pendaftar. Yang terisi
// hanyalah nilai awal: pendaftar masih bisa mengubahnya sebelum mengirim.

export type SensusPrefillKey = "fullName" | "university" | "major" | "entryYear" | "branch";

// Label dicocokkan PERSIS (setelah dinormalkan), bukan sebagian, supaya
// "Nama pemilik rekening" atau "Asal kota di Indonesia" tidak ikut terisi.
const LABELS: Record<SensusPrefillKey, string[]> = {
  fullName: ["nama lengkap", "nama", "full name", "name"],
  university: ["asal kampus", "kampus", "nama kampus", "universitas", "asal universitas", "nama universitas", "university", "campus"],
  major: ["jurusan", "program studi", "prodi", "major"],
  entryYear: ["angkatan", "tahun masuk", "tahun angkatan", "entry year"],
  // "Asal kota" sengaja tidak ada: bisa berarti kota asal di Indonesia, bukan kota studi di sensus.
  branch: ["kota studi", "kota kuliah", "kota tempat kuliah", "study city"],
};

const BY_LABEL = new Map<string, SensusPrefillKey>(
  (Object.entries(LABELS) as [SensusPrefillKey, string[]][]).flatMap(([key, labels]) => labels.map((l) => [l, key] as const)),
);

function normalize(label: string): string {
  return label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Isian sensus yang menjadi nilai awal pertanyaan berlabel ini, atau null. */
export function sensusKeyForLabel(label: string): SensusPrefillKey | null {
  return BY_LABEL.get(normalize(label)) ?? null;
}

// ---- Tautan sosial di profil akun (users.linkedin_url dst., diisi sendiri oleh pemiliknya) ----

export type ProfileLinkKey = "linkedin" | "instagram" | "github" | "spotify" | "tiktok";

const PLATFORMS: Record<ProfileLinkKey, string[]> = {
  linkedin: ["linkedin", "linked in"],
  instagram: ["instagram", "ig"],
  github: ["github"],
  spotify: ["spotify"],
  tiktok: ["tiktok", "tik tok"],
};
// Label yang dikenali: "<platform>", "akun/link/url/profil/id/username <platform>", "<platform> url/username".
const PREFIXES = ["", "akun ", "link ", "url ", "profil ", "id ", "username ", "user name "];
const SUFFIXES = ["", " url", " link", " username", " id", " account"];

const PROFILE_BY_LABEL = new Map<string, { key: ProfileLinkKey; handle: boolean }>();
for (const [key, names] of Object.entries(PLATFORMS) as [ProfileLinkKey, string[]][]) {
  for (const name of names) {
    for (const pre of PREFIXES) {
      for (const suf of SUFFIXES) {
        const label = `${pre}${name}${suf}`;
        // "Username Instagram" meminta nama pengguna, bukan seluruh tautan.
        const handle = /username|user name|(^| )id( |$)/.test(label);
        PROFILE_BY_LABEL.set(label, { key, handle });
      }
    }
  }
}

/** Tautan profil yang menjadi nilai awal pertanyaan berlabel ini; handle = minta nama pengguna saja. */
export function profileKeyForLabel(label: string): { key: ProfileLinkKey; handle: boolean } | null {
  return PROFILE_BY_LABEL.get(normalize(label)) ?? null;
}

/** "https://instagram.com/nama", "instagram.com/nama", atau "@nama" -> "nama". */
export function handleFromLink(raw: string): string {
  const v = raw.trim();
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    const first = u.hostname.includes(".") ? u.pathname.split("/").filter(Boolean)[0] : undefined;
    if (first) return first.replace(/^@/, "");
  } catch {
    // bukan URL: pakai apa adanya di bawah
  }
  return v.replace(/^@/, "");
}
