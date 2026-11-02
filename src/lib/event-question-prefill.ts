// Pertanyaan teks kustom pendaftaran acara yang labelnya SAMA dengan isian sensus
// diisi otomatis dari sensus (kalau sensusnya lengkap). Hanya isian yang tidak
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
