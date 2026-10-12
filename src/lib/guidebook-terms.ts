// Kata kunci dan batang kata untuk retrieval chatbot Help Center. Dipisah dari
// src/lib/guidebook-search.ts supaya logikanya murni: bisa diuji tanpa database
// lewat npm run check:guidebook, sementara file itu butuh koneksi Postgres
// hanya untuk query-nya.

const MAX_TERMS = 10;

// Kata fungsi + istilah yang muncul di hampir semua artikel (nama organisasi,
// kota). Kata seperti "ppit"/"nanjing" kalau ikut dicari akan mencocokkan semua
// artikel dan membuat peringkat tidak berarti.
const STOPWORDS: Record<string, true> = {
  yang: true, dan: true, untuk: true, dengan: true, dari: true, pada: true, dalam: true, atau: true,
  kalau: true, jika: true, agar: true, supaya: true, ini: true, itu: true, ada: true, adalah: true,
  apa: true, apakah: true, bagaimana: true, gimana: true, dimana: true, kapan: true, siapa: true,
  mengapa: true, kenapa: true, bisa: true, boleh: true, harus: true, saya: true, aku: true, kamu: true,
  kami: true, kita: true, anda: true, nya: true, tidak: true, bukan: true, belum: true, sudah: true,
  juga: true, saja: true, mau: true, ingin: true, butuh: true, tolong: true, minta: true, tanya: true,
  cara: true, info: true, informasi: true, dong: true, ya: true, kah: true, sih: true, the: true,
  and: true, for: true, with: true, how: true, what: true, where: true, when: true, who: true, can: true,
  // Kata fungsi Inggris lain yang muncul di pertanyaan maba ("how is the visa
  // work?"). Kalau ikut dicari, kata seperti "is" mencocokkan hampir semua
  // artikel dan mendorong kata yang sebenarnya penting keluar dari MAX_TERMS.
  is: true, are: true, was: true, were: true, be: true, been: true, do: true, does: true, did: true,
  i: true, me: true, my: true, you: true, your: true, we: true, our: true, they: true, it: true, its: true,
  this: true, that: true, there: true, here: true, about: true, tell: true, know: true, need: true,
  from: true, into: true, over: true, after: true, before: true,
  want: true, please: true, much: true, many: true, any: true, some: true,
  ppit: true, nanjing: true, tiongkok: true, china: true,
  // Sapaan dan terima kasih: kalau ikut dicari, "halo kak" jadi kata kunci dan
  // memaksa satu kueri DB yang pasti tidak ada hasilnya.
  halo: true, hai: true, hi: true, hello: true, kak: true, bang: true, min: true, pagi: true, siang: true,
  sore: true, malam: true, assalamualaikum: true, salam: true, kenal: true, terima: true, kasih: true,
  makasih: true, thanks: true, thank: true, banget: true,
};

// Pertanyaan maba sering datang dalam bahasa Inggris, sedangkan artikelnya
// bahasa Indonesia: "how to NUAA from airport" tidak memuat satu pun kata yang
// ada di artikel (yang menulis "bandara"). Peta istilah domain ini menutup
// celah itu tanpa embedding. Isinya sengaja sempit - hanya istilah yang benar
// muncul di korpus guidebook - dan dirawat bersama artikelnya: menambah topik
// baru berarti menambah sinonimnya di sini.
const SYNONYMS: Record<string, string[]> = {
  airport: ["bandara", "penerbangan", "pesawat", "terminal"],
  flight: ["penerbangan", "pesawat", "bandara"],
  plane: ["pesawat", "penerbangan"],
  airline: ["penerbangan", "maskapai"],
  university: ["kampus", "universitas"],
  campus: ["kampus", "universitas"],
  college: ["kampus", "universitas"],
  dorm: ["asrama"],
  dormitory: ["asrama"],
  hostel: ["asrama", "penginapan"],
  accommodation: ["asrama", "tempat tinggal", "penginapan", "住宿登记"],
  housing: ["asrama", "tempat tinggal"],
  rent: ["sewa", "kos", "apartemen"],
  apartment: ["apartemen", "sewa"],
  visa: ["visa", "izin tinggal"],
  residence: ["izin tinggal", "tinggal"],
  permit: ["izin tinggal", "izin"],
  immigration: ["imigrasi", "keimigrasian"],
  passport: ["paspor"],
  police: ["polisi", "公安"],
  registration: ["registrasi", "pendaftaran", "daftar"],
  register: ["registrasi", "daftar", "pendaftaran"],
  enroll: ["daftar", "pendaftaran"],
  bank: ["bank", "rekening"],
  account: ["rekening", "akun"],
  money: ["uang", "pembayaran", "biaya"],
  payment: ["pembayaran", "bayar", "biaya"],
  cash: ["uang", "tunai"],
  phone: ["telepon", "ponsel", "kartu"],
  sim: ["kartu", "telepon", "seluler"],
  internet: ["internet", "jaringan"],
  wifi: ["internet", "wifi"],
  health: ["kesehatan", "rumah sakit", "klinik"],
  hospital: ["rumah sakit", "klinik"],
  clinic: ["klinik", "rumah sakit"],
  doctor: ["dokter", "klinik"],
  insurance: ["asuransi", "kesehatan"],
  medical: ["medis", "kesehatan", "mcu"],
  medicine: ["obat", "apotek"],
  metro: ["metro", "kereta"],
  subway: ["metro", "kereta"],
  bus: ["bus", "transportasi"],
  train: ["kereta", "stasiun"],
  taxi: ["taksi", "transportasi"],
  transport: ["transportasi", "angkutan"],
  food: ["makanan", "kuliner", "makan"],
  halal: ["halal", "makanan"],
  weather: ["cuaca", "musim"],
  season: ["musim", "cuaca"],
  winter: ["musim dingin", "dingin"],
  summer: ["musim panas", "panas"],
  city: ["kota", "kota nanjing"],
  work: ["kerja", "pekerjaan", "part-time"],
  job: ["kerja", "pekerjaan"],
  scholarship: ["beasiswa"],
  tuition: ["uang kuliah", "biaya"],
  class: ["kelas", "kuliah"],
  lecture: ["kuliah", "kelas"],
  exam: ["ujian", "ujian masuk"],
  language: ["bahasa", "mandarin"],
  mandarin: ["bahasa", "mandarin"],
  study: ["kuliah", "belajar", "studi"],
  student: ["mahasiswa", "maba"],
  room: ["kamar", "asrama"],
  luggage: ["bagasi", "koper", "barang"],
  packing: ["bawaan", "koper", "barang"],
  document: ["dokumen", "berkas", "surat"],
  documents: ["dokumen", "berkas", "surat"],
  letter: ["surat", "keterangan"],
  arrival: ["kedatangan", "tiba", "datang"],
  arrive: ["kedatangan", "tiba", "datang"],
  departing: ["keberangkatan", "berangkat"],
  departure: ["keberangkatan", "berangkat"],
  wechat: ["wechat", "微信"],
  alipay: ["alipay", "支付宝"],
  address: ["alamat", "lokasi"],
  contact: ["kontak", "nomor", "whatsapp"],
  emergency: ["darurat", "nomor penting"],
};

// Istilah yang justru topiknya sendiri saat berdiri sendiri: "apa itu PPIT",
// "where is nanjing at?" hanya menyisakan kata yang di STOPWORDS dibuang,
// padahal jawabannya ada di artikel berjudul "Profil PPIT Nanjing" atau "Kota
// Nanjing". Untuk pertanyaan seperti itu pencarian diulang di judul+bagian saja
// supaya seluruh artikel tidak ikut cocok.
const ENTITY_TERMS: Record<string, true> = {
  ppit: true, ppi: true, nanjing: true, nuaa: true, tiongkok: true, china: true,
};

// Imbuhan Indonesia yang paling sering membuat kata kunci pengguna tidak
// persis sama dengan kata di artikel ("membuka rekening" vs "buka rekening").
// Kosongkan awalan saja yang aman: mencocokkan lewat ILIKE bersifat substring,
// jadi sisa kata yang terlalu pendek justru menambah pencocokan palsu, bukan
// mengurangi yang benar. Kata aslinya tetap dicari juga (lihat searchTerms).
const PREFIXES = ["meng", "meny", "mem", "men", "me", "di", "ter", "ber"];
const SUFFIXES = ["nya", "kan", "an"];

function normalizeToken(token: string): string {
  let s = token;
  for (const suffix of SUFFIXES) {
    if (s.length - suffix.length >= 4 && s.endsWith(suffix)) {
      s = s.slice(0, -suffix.length);
      break;
    }
  }
  for (const prefix of PREFIXES) {
    if (s.length - prefix.length >= 4 && s.startsWith(prefix)) {
      s = s.slice(prefix.length);
      break;
    }
  }
  return s;
}

/**
 * Kata kunci dari pertanyaan pengguna: kata asli + bentuk tanpa imbuhan, tanpa
 * kata fungsi. Kosong = pertanyaan tidak punya kata yang bisa dicari (mis.
 * "halo"), dan pemanggil akan menjawab "tidak tahu" - bukan mencari ke korpus.
 */
export function searchTerms(question: string): string[] {
  const raw = (question ?? "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const terms = new Set<string>();
  const add = (token: string) => {
    if (terms.size >= MAX_TERMS) return;
    if (token.length < 3 || STOPWORDS[token] === true) return;
    terms.add(token);
  };
  // Dua lewat: kata asli pengguna dulu, baru sinonimnya. Kalau dicampur, satu
  // istilah Inggris ("airport") bisa menghabiskan kuota kata kunci sebelum
  // kata penting lain ("nuaa") sempat ikut dicari.
  for (const token of raw) {
    if (token.length < 3 || STOPWORDS[token] === true) continue;
    add(token);
    add(normalizeToken(token));
  }
  for (const token of raw) {
    const stem = normalizeToken(token);
    for (const synonym of [...(SYNONYMS[token] ?? []), ...(SYNONYMS[stem] ?? [])]) add(synonym);
  }
  return [...terms].slice(0, MAX_TERMS);
}

/**
 * Isi kolom `guide_chunks.text_stemmed`: seluruh kata potongan, dinormalkan.
 * Beda dengan searchTerms, di sini stopword TIDAK dibuang - kolom ini harus
 * tetap bisa dicocokkan untuk kata apa pun yang diketik pengguna, dan kata
 * fungsi baru dibuang di sisi pertanyaan. Duplikat dibiarkan; `to_tsvector`
 * yang meringkasnya jadi lexeme.
 */
export function stemmedText(text: string): string {
  const raw = (text ?? "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return raw.map(normalizeToken).join(" ");
}

/**
 * Skor sederhana: judul paling menentukan, lalu bagian, lalu isi (dibatasi 3
 * hitungan supaya artikel panjang tidak menang hanya karena panjang).
 * Query DB sudah menjamin minimal satu istilah cocok, jadi tidak ada
 * penapisan ulang di sini.
 */

/**
 * Istilah entitas dari pertanyaan: kata yang di STOPWORDS dibuang justru karena
 * selalu muncul di korpus, tapi jadi topik itu sendiri saat berdiri sendiri
 * ("apa itu PPIT", "where is nanjing at?"). Dipakai findGuideChunks sebagai
 * pencarian cadangan yang hanya mencocokkan judul dan bagian.
 */
export function questionEntities(question: string): string[] {
  const raw = (question ?? "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return [...new Set(raw.filter((token) => ENTITY_TERMS[token] === true))].slice(0, 3);
}
