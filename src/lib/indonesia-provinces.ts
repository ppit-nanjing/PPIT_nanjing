// Daftar provinsi Indonesia untuk field "Asal Provinsi" di form Sensus.
//
// Form Sensus PPI Tiongkok (pusat) memakai DROPDOWN untuk field ini, bukan teks
// bebas — supaya ejaan provinsi seragam saat data direkap secara nasional.
// Sebelumnya field ini di sini masih input teks ("contoh: Banten"), yang
// menghasilkan variasi seperti "DKI Jakarta" / "Jakarta" / "DKI" pada satu
// kolom yang sama.
//
// 38 provinsi — sudah termasuk 4 provinsi baru hasil pemekaran Papua
// (Papua Selatan, Papua Tengah, Papua Pegunungan pada 2022; Papua Barat Daya
// pada Desember 2022). Urutan mengikuti urutan geografis resmi BPS
// (Sumatera → Jawa → Bali/Nusa Tenggara → Kalimantan → Sulawesi → Maluku →
// Papua), bukan alfabetis, sama seperti daftar wilayah pemerintah.
export const INDONESIA_PROVINCES = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kepulauan Riau",
  "Jambi",
  "Sumatera Selatan",
  "Kepulauan Bangka Belitung",
  "Bengkulu",
  "Lampung",
  "DKI Jakarta",
  "Jawa Barat",
  "Banten",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Gorontalo",
  "Sulawesi Tengah",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Maluku",
  "Maluku Utara",
  "Papua Barat",
  "Papua Barat Daya",
  "Papua",
  "Papua Selatan",
  "Papua Tengah",
  "Papua Pegunungan",
] as const;

export type IndonesiaProvince = (typeof INDONESIA_PROVINCES)[number];

export function isIndonesiaProvince(value: string): value is IndonesiaProvince {
  return (INDONESIA_PROVINCES as readonly string[]).includes(value);
}
