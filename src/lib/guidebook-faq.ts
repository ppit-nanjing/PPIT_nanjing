// Pertanyaan pemancing cache (lihat scripts/prewarm-guide.ts) sekaligus sumber
// saran pertanyaan lanjutan di widget chat waktu model tidak mengirim saran
// sendiri (fallbackFollowUps di src/lib/guide-answer.ts). Isinya kalimat
// yang benar-benar diketik maba di chatbot, bukan judul artikel, dan tiap topik
// di korpus guidebook terwakili minimal satu pertanyaan. `topic` = slug
// help_articles yang jadi rujukannya, supaya penambahan topik baru gampang
// dicek: topik tanpa pertanyaan berarti prewarm-nya bolong.
// `questionEn` hanya dipakai jawaban berbahasa Inggris (fallbackFollowUps di
// src/lib/guide-answer.ts): pertanyaan WhatsApp-nya boleh Indonesia, tombol
// saran di widget harus sebahasa dengan jawabannya.
export type GuideFaq = { question: string; topic: string; questionEn?: string };

export const GUIDE_FAQ: GuideFaq[] = [
  // transportasi-dari-bandara-ke-kampus-uvd9
  { question: "dari bandara Lukou ke kampus naik apa ya?", questionEn: "how do I get from Lukou airport to campus?", topic: "transportasi-dari-bandara-ke-kampus-uvd9" },
  { question: "berapa tarif metro dari bandara ke pusat kota Nanjing?", questionEn: "how much is the metro from the airport to downtown Nanjing?", topic: "transportasi-dari-bandara-ke-kampus-uvd9" },
  { question: "sampai kampus di Jiangning dari bandara bagaimana?", questionEn: "how do I reach the Jiangning campus from the airport?", topic: "transportasi-dari-bandara-ke-kampus-uvd9" },

  // profil-ppit-nanjing
  { question: "apa itu PPIT Nanjing?", questionEn: "what is PPIT Nanjing?", topic: "profil-ppit-nanjing" },
  { question: "PPIT Nanjing itu organisasinya buat apa?", questionEn: "what does PPIT Nanjing actually do?", topic: "profil-ppit-nanjing" },
  { question: "berapa banyak mahasiswa Indonesia di Nanjing?", questionEn: "how many Indonesian students are in Nanjing?", topic: "profil-ppit-nanjing" },

  // profil-ppit-tiongkok
  { question: "PPIT Tiongkok itu apa?", questionEn: "what is PPIT China?", topic: "profil-ppit-tiongkok" },
  { question: "PPIT pusat bedanya sama PPIT Nanjing apa?", questionEn: "how is PPIT China different from PPIT Nanjing?", topic: "profil-ppit-tiongkok" },
  { question: "kontak resmi PPIT Tiongkok apa saja?", questionEn: "what are the official PPIT China contacts?", topic: "profil-ppit-tiongkok" },

  // kota-nanjing
  { question: "Nanjing itu kota seperti apa?", questionEn: "what kind of city is Nanjing?", topic: "kota-nanjing" },
  { question: "cuaca di Nanjing tiap musim bagaimana?", questionEn: "what is the weather like in Nanjing each season?", topic: "kota-nanjing" },
  { question: "kuliner halal di Nanjing di mana?", questionEn: "where can I find halal food in Nanjing?", topic: "kota-nanjing" },

  // dokumen-dan-berkas-awal-datang
  { question: "dokumen apa saja yang harus dibawa saat pertama datang ke China?", questionEn: "which documents must I bring when I first arrive in China?", topic: "dokumen-dan-berkas-awal-datang" },
  { question: "cara perpanjang paspor Indonesia di Nanjing bagaimana?", questionEn: "how do I renew my Indonesian passport in Nanjing?", topic: "dokumen-dan-berkas-awal-datang" },
  { question: "surat keterangan belajar untuk persamaan derajat di Indonesia bagaimana?", questionEn: "how do I get a study certificate for degree equivalence in Indonesia?", topic: "dokumen-dan-berkas-awal-datang" },

  // visa-dan-izin-tinggal
  { question: "urutan mengurus visa dan izin tinggal setelah tiba bagaimana?", questionEn: "what is the order for sorting out my visa and residence permit after arrival?", topic: "visa-dan-izin-tinggal" },
  { question: "medical check-up untuk pelajar asing di mana?", questionEn: "where do foreign students get the medical check-up?", topic: "visa-dan-izin-tinggal" },
  { question: "registrasi di universitas butuh dokumen apa saja?", questionEn: "which documents does university registration need?", topic: "visa-dan-izin-tinggal" },

  // aplikasi-pembayaran-dan-sim-card
  { question: "aplikasi pembayaran apa yang dipakai di China?", questionEn: "which payment apps are used in China?", topic: "aplikasi-pembayaran-dan-sim-card" },
  { question: "cara beli kartu SIM lokal untuk mahasiswa baru?", questionEn: "how do new students buy a local SIM card?", topic: "aplikasi-pembayaran-dan-sim-card" },

  // tempat-tinggal-asrama-dan-kos
  { question: "cara cari asrama atau kos di sekitar kampus?", questionEn: "how do I find a dorm or rented room near campus?", topic: "tempat-tinggal-asrama-dan-kos" },
  { question: "kontrak kos di Nanjing biasanya seperti apa?", questionEn: "what is a room rental contract in Nanjing usually like?", topic: "tempat-tinggal-asrama-dan-kos" },

  // biaya-hidup-bulan-pertama
  { question: "berapa biaya hidup mahasiswa di Nanjing per bulan?", questionEn: "how much does living in Nanjing cost a student per month?", topic: "biaya-hidup-bulan-pertama" },
  { question: "uang saku bulan pertama sebaiknya berapa?", questionEn: "how much pocket money should I bring for the first month?", topic: "biaya-hidup-bulan-pertama" },

  // vpn-dan-akses-internet
  { question: "WhatsApp dibuka pakai apa kalau di China diblokir?", questionEn: "what do I use to open WhatsApp while it is blocked in China?", topic: "vpn-dan-akses-internet" },
  { question: "VPN apa yang dipakai mahasiswa Indonesia di Nanjing?", questionEn: "which VPN do Indonesian students in Nanjing use?", topic: "vpn-dan-akses-internet" },

  // packing-dan-kirim-barang
  { question: "apa saja yang wajib dibawa di koper pertama?", questionEn: "what must I pack in my first suitcase?", topic: "packing-dan-kirim-barang" },
  { question: "cara kirim barang dari Indonesia ke China bagaimana?", questionEn: "how do I ship things from Indonesia to China?", topic: "packing-dan-kirim-barang" },

  // minggu-pertama-checklist
  { question: "urutan apa yang harus beres di minggu pertama di Nanjing?", questionEn: "what should I get done in my first week in Nanjing, in order?", topic: "minggu-pertama-checklist" },
  { question: "hari pertama sampai Nanjing harus ngapain?", questionEn: "what should I do on my first day in Nanjing?", topic: "minggu-pertama-checklist" },

  // tempat-ibadah-di-nanjing
  { question: "masjid di Nanjing di mana saja?", questionEn: "where are the mosques in Nanjing?", topic: "tempat-ibadah-di-nanjing" },
  { question: "gereja untuk mahasiswa Indonesia di Nanjing di mana?", questionEn: "where is the church for Indonesian students in Nanjing?", topic: "tempat-ibadah-di-nanjing" },
  // Jalur keluar dari jawaban default "masjid di kota Nanjing": pertanyaan ini
  // memang dijawab artikel yang sama, cuma bagian luar kotanya.
  {
    question: "masjid di luar kota Nanjing apa saja?",
    questionEn: "which mosques are outside Nanjing city?",
    topic: "tempat-ibadah-di-nanjing",
  },

  // kerja-magang-dan-sim
  { question: "boleh tidak mahasiswa asing kerja sambilan di China?", questionEn: "can foreign students take part-time jobs in China?", topic: "kerja-magang-dan-sim" },
  { question: "SIM internasional bisa dipakai di China?", questionEn: "can I use an international driving permit in China?", topic: "kerja-magang-dan-sim" },

  // festival-dan-hari-libur
  { question: "hari libur nasional China kapan saja?", questionEn: "when are China's national holidays?", topic: "festival-dan-hari-libur" },
  { question: "Golden Week itu apa dan dampaknya ke tiket kereta?", questionEn: "what is Golden Week and how does it affect train tickets?", topic: "festival-dan-hari-libur" },
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
