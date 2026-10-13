// Pertanyaan pemancing cache (lihat scripts/prewarm-guide.ts) sekaligus sumber
// saran pertanyaan lanjutan di widget chat waktu model tidak mengirim saran
// sendiri (fallbackFollowUps di src/lib/guide-answer.ts). Isinya kalimat
// yang benar-benar diketik maba di chatbot, bukan judul artikel, dan tiap topik
// di korpus guidebook terwakili minimal satu pertanyaan. `topic` = slug
// help_articles yang jadi rujukannya, supaya penambahan topik baru gampang
// dicek: topik tanpa pertanyaan berarti prewarm-nya bolong.
export type GuideFaq = { question: string; topic: string };

export const GUIDE_FAQ: GuideFaq[] = [
  // transportasi-dari-bandara-ke-kampus-uvd9
  { question: "dari bandara Lukou ke kampus naik apa ya?", topic: "transportasi-dari-bandara-ke-kampus-uvd9" },
  { question: "berapa tarif metro dari bandara ke pusat kota Nanjing?", topic: "transportasi-dari-bandara-ke-kampus-uvd9" },
  { question: "sampai kampus di Jiangning dari bandara bagaimana?", topic: "transportasi-dari-bandara-ke-kampus-uvd9" },

  // profil-ppit-nanjing
  { question: "apa itu PPIT Nanjing?", topic: "profil-ppit-nanjing" },
  { question: "PPIT Nanjing itu organisasinya buat apa?", topic: "profil-ppit-nanjing" },
  { question: "berapa banyak mahasiswa Indonesia di Nanjing?", topic: "profil-ppit-nanjing" },

  // profil-ppit-tiongkok
  { question: "PPIT Tiongkok itu apa?", topic: "profil-ppit-tiongkok" },
  { question: "PPIT pusat bedanya sama PPIT Nanjing apa?", topic: "profil-ppit-tiongkok" },
  { question: "kontak resmi PPIT Tiongkok apa saja?", topic: "profil-ppit-tiongkok" },

  // kota-nanjing
  { question: "Nanjing itu kota seperti apa?", topic: "kota-nanjing" },
  { question: "cuaca di Nanjing tiap musim bagaimana?", topic: "kota-nanjing" },
  { question: "kuliner halal di Nanjing di mana?", topic: "kota-nanjing" },

  // dokumen-dan-berkas-awal-datang
  { question: "dokumen apa saja yang harus dibawa saat pertama datang ke China?", topic: "dokumen-dan-berkas-awal-datang" },
  { question: "cara perpanjang paspor Indonesia di Nanjing bagaimana?", topic: "dokumen-dan-berkas-awal-datang" },
  { question: "surat keterangan belajar untuk persamaan derajat di Indonesia bagaimana?", topic: "dokumen-dan-berkas-awal-datang" },

  // visa-dan-izin-tinggal
  { question: "urutan mengurus visa dan izin tinggal setelah tiba bagaimana?", topic: "visa-dan-izin-tinggal" },
  { question: "medical check-up untuk pelajar asing di mana?", topic: "visa-dan-izin-tinggal" },
  { question: "registrasi di universitas butuh dokumen apa saja?", topic: "visa-dan-izin-tinggal" },

  // aplikasi-pembayaran-dan-sim-card
  { question: "aplikasi pembayaran apa yang dipakai di China?", topic: "aplikasi-pembayaran-dan-sim-card" },
  { question: "cara beli kartu SIM lokal untuk mahasiswa baru?", topic: "aplikasi-pembayaran-dan-sim-card" },

  // tempat-tinggal-asrama-dan-kos
  { question: "cara cari asrama atau kos di sekitar kampus?", topic: "tempat-tinggal-asrama-dan-kos" },
  { question: "kontrak kos di Nanjing biasanya seperti apa?", topic: "tempat-tinggal-asrama-dan-kos" },

  // biaya-hidup-bulan-pertama
  { question: "berapa biaya hidup mahasiswa di Nanjing per bulan?", topic: "biaya-hidup-bulan-pertama" },
  { question: "uang saku bulan pertama sebaiknya berapa?", topic: "biaya-hidup-bulan-pertama" },
];

// Pertanyaan pembuka widget chat: dipakai waktu jawabannya tidak punya satu pun
// sumber (pertanyaan ambigu atau di luar korpus), supaya maba tetap punya jalan
// masuk ke panduan. Isinya pertanyaan yang benar-benar ditanyakan, bukan judul
// artikel, dan ketiga topic-nya ada di GUIDE_FAQ di atas.
export const GUIDE_STARTER_QUESTIONS: string[] = [
  "apa itu PPIT Nanjing?",
  "dokumen apa saja yang harus dibawa saat pertama datang ke China?",
  "berapa biaya hidup mahasiswa di Nanjing per bulan?",
];
