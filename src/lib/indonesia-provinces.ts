// Daftar provinsi Indonesia untuk field "Asal Provinsi" di form Sensus.
//
// Form Sensus PPI Tiongkok (pusat) memakai DROPDOWN untuk field ini, bukan teks
// bebas — supaya ejaan provinsi seragam saat data direkap secara nasional.
// Sebelumnya field ini di sini masih input teks ("contoh: Banten"), yang
// menghasilkan variasi seperti "DKI Jakarta" / "Jakarta" / "DKI" pada satu
// kolom yang sama.
//
// Sumber: https://sig.bps.go.id/bridging-kode/index (terakhir diakses 2026-08-28)

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

const INDONESIA_PROVINCE_BY_CODE: Readonly<Record<string, IndonesiaProvince>> = {
  "11": "Aceh",
  "12": "Sumatera Utara",
  "13": "Sumatera Barat",
  "14": "Riau",
  "15": "Jambi",
  "16": "Sumatera Selatan",
  "17": "Bengkulu",
  "18": "Lampung",
  "19": "Kepulauan Bangka Belitung",
  "21": "Kepulauan Riau",
  "31": "DKI Jakarta",
  "32": "Jawa Barat",
  "33": "Jawa Tengah",
  "34": "DI Yogyakarta",
  "35": "Jawa Timur",
  "36": "Banten",
  "51": "Bali",
  "52": "Nusa Tenggara Barat",
  "53": "Nusa Tenggara Timur",
  "61": "Kalimantan Barat",
  "62": "Kalimantan Tengah",
  "63": "Kalimantan Selatan",
  "64": "Kalimantan Timur",
  "65": "Kalimantan Utara",
  "71": "Sulawesi Utara",
  "72": "Sulawesi Tengah",
  "73": "Sulawesi Selatan",
  "74": "Sulawesi Tenggara",
  "75": "Gorontalo",
  "76": "Sulawesi Barat",
  "81": "Maluku",
  "82": "Maluku Utara",
  "91": "Papua",
  "92": "Papua Barat",
  "93": "Papua Selatan",
  "94": "Papua Tengah",
  "95": "Papua Pegunungan",
  "96": "Papua Barat Daya",
};

export function provinceFromPersonalNumber(personalNumber: string): IndonesiaProvince | "" {
  return INDONESIA_PROVINCE_BY_CODE[personalNumber.slice(0, 2)] ?? "";
}

export function isIndonesiaProvince(value: string): value is IndonesiaProvince {
  return (INDONESIA_PROVINCES as readonly string[]).includes(value);
}
