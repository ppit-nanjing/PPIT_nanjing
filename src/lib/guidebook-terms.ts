// Kata kunci dan batang kata untuk retrieval chatbot Help Center. Dipisah dari
// src/lib/guidebook-search.ts supaya logikanya murni: bisa diuji tanpa database
// lewat npm run check:guidebook, sementara file itu butuh koneksi Postgres
// hanya untuk query-nya.

const MAX_TERMS = 10;
// Token pertanyaan: kata latin/angka, plus satu run hanzi utuh. Soal berbahasa
// Mandarin tidak memakai spasi, jadi "吉兆营清真寺 地址" hanya punya dua kandidat
// istilah; tanpa cabang hanzi, daftar kata kuncinya kosong dan pertanyaannya
// dijawab "belum ada panduan" padahal artikelnya memuat masjid itu. Batas
// panjangnya sama untuk keduanya (>= 3 huruf/karakter), jadi "地址" tetap dibuang
// seperti "di": istilah pendek justru menaikkan lantai relevansi tanpa menambah
// kecocokan, karena pertanyaan pendek menuntut SEMUA kata kuncinya cocok.
// Dipakai lewat String#match, yang mengulang dari indeks 0 setiap panggilan -
// pola /g menyimpan posisi terakhir, jadi jangan dipakai dengan .test()/.exec().
const QUESTION_TOKENS = new RegExp("[\\p{Script=Han}]+|[a-z0-9]+", "gu");


// Kata fungsi + istilah yang muncul di hampir semua artikel (nama organisasi,
// kota). Kata seperti "ppit"/"nanjing" kalau ikut dicari akan mencocokkan semua
// artikel dan membuat peringkat tidak berarti.
const STOPWORDS: Record<string, true> = {
  yang: true, dan: true, untuk: true, dengan: true, dari: true, pada: true, dalam: true, atau: true,
  kalau: true, jika: true, agar: true, supaya: true, ini: true, itu: true, ada: true, adalah: true,
  apa: true, apakah: true, bagaimana: true, gimana: true, dimana: true, kapan: true, siapa: true,
  // "mana" sering lolos sebagai kata kunci dari "di mana saja", padahal cuma
  // kata tanya. Kalau ikut dicari, pertanyaan "masjid di Nanjing di mana saja?"
  // punya dua kata kunci dan lantai relevansinya menuntut keduanya cocok -
  // jawabannya jadi "belum ada panduan" padahal artikelnya ada.
  mana: true, kemana: true, darimana: true, berapa: true, seberapa: true,
  mengapa: true, kenapa: true, bisa: true, boleh: true, harus: true, saya: true, aku: true, kamu: true,
  kami: true, kita: true, anda: true, nya: true, tidak: true, bukan: true, belum: true, sudah: true,
  juga: true, saja: true, mau: true, ingin: true, butuh: true, tolong: true, minta: true, tanya: true,
  cara: true, info: true, informasi: true, dong: true, ya: true, kah: true, sih: true, the: true,
  // Kata penyusun perintah ("sebutkan semua ... satu per satu beserta alamatnya")
  // bukan topik. Kalau ikut dicari, kata seperti "satu" dan "per" cocok dengan
  // hampir semua artikel, menaikkan skor artikel yang tidak menjawab, dan
  // artikel tempat ibadah - satu-satunya yang memuat daftar masjid - terdorong
  // keluar dari empat artikel teratas untuk pertanyaan "sebutkan semua masjid
  // di luar kota ... beserta alamatnya".
  sebut: true, sebutkan: true, semua: true, satu: true, per: true, beserta: true,
  alamatnya: true, masing: true,
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
  // "kost" adalah ejaan yang benar-benar dipakai maba, sedangkan artikelnya
  // menulis "kos" dan "asrama". Koreksi salah ketik tidak bisa menolong: satu
  // huruf dari "kost" ada "cost", "lost", "most", dan "kos" sekaligus, jadi
  // tebakannya ambigu dan memang tidak ditebak (lihat correctTypo). Tanpa
  // pemetaan ini, "ada kost di nanjing?" hanya punya satu kata kunci yang tidak
  // ada di korpus, dan jawabannya "belum ada panduan" padahal artikelnya ada.
  kost: ["kos", "asrama"],
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
  doctor: ["dokter", "klinik", "rumah sakit", "berobat"],
  insurance: ["asuransi", "kesehatan"],
  medical: ["medis", "kesehatan", "mcu"],
  medicine: ["obat", "apotek"],
  international: ["internasional"],
  // "sakit" sendirian cuma mencocokkan satu batang kata di artikel kesehatan,
  // jadi pertanyaan "saya sakit, harus bagaimana" jatuh di bawah lantai
  // relevansi dan tidak dapat konteks apa pun. Sinonim ini menambah kata yang
  // memang ada di artikelnya.
  sakit: ["demam", "klinik", "obat", "berobat"],
  renew: ["perpanjang", "perpanjangan", "perbarui"],
  indonesian: ["indonesia", "kbri"],
  chinese: ["mandarin"],
  phrases: ["frasa", "kalimat"],
  daily: ["sehari-hari"],
  weekend: ["akhir pekan"],
  first: ["pertama"],
  month: ["bulan"],
  // "makanan" dan "makan" punya batang kata yang sama, jadi pertanyaan
  // "makanan khas apa yang harus dicoba" hanya menyisakan dua batang kata di
  // artikel kuliner. Sinonim ini menambah batang kata lain yang benar ada:
  // "masakan", "hidangan", "kuliner".
  makanan: ["masakan", "hidangan", "kuliner"],
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
  // Artikel wisata menulis nama tempatnya dalam bahasa Inggris/China aslinya
  // ("Nanjing Library", 南京图书馆), jadi pertanyaan "alamat Perpustakaan
  // Nanjing di mana?" tidak punya satu kata pun yang cocok dengan barisnya
  // sendiri - barisnya seri dengan puluhan entri lain dan jendelanya jatuh di
  // entri pertama daftar.
  perpustakaan: ["library", "图书馆"],
  library: ["perpustakaan", "图书馆"],
  // Kasus yang sama, tapi kali ini panduannya menyebut gedung dan ruangannya
  // dengan nama aslinya ("Zeng Xianzi Building", "Room 503"). Pertanyaan "kartu
  // mahasiswa saya diambil di gedung apa dan ruangan nomor berapa?" tidak punya
  // satu kata pun yang cocok dengan baris jawabannya, jadi skornya kalah dari
  // artikel yang cuma kebetulan memuat kata "nomor".
  gedung: ["building"],
  building: ["gedung"],
  ruangan: ["ruang", "room"],
  ruang: ["ruangan", "room"],
  // Artikel dari bandara menulis "bandara" dan "mendarat", pertanyaannya
  // menulis "pesawat tiba" - kata yang tidak ada di artikel itu.
  pesawat: ["bandara", "mendarat"],
  bandara: ["pesawat", "airport"],
  sepeda: ["单车", "bike", "bicycle"],
  bike: ["sepeda", "单车"],
  contact: ["kontak", "nomor", "whatsapp"],
  emergency: ["darurat", "nomor penting"],
  // Pertanyaan campur bahasa soal rumah ibadah, kerja, dan libur nasional
  // menyisakan kata Inggris yang tidak ada di artikel Indonesianya, jadi
  // kata kuncinya dipetakan ke istilah yang benar-benar dipakai artikel.
  church: ["gereja", "kristen", "kebaktian"],
  christian: ["kristen", "gereja"],
  mosque: ["masjid"],
  muslim: ["masjid", "halal"],
  temple: ["kuil", "candi"],
  worship: ["ibadah", "kebaktian"],
  prayer: ["ibadah", "kebaktian"],
  pray: ["ibadah"],
  part: ["paruh"],
  parttime: ["paruh"],
  holiday: ["libur", "nasional"],
  holidays: ["libur", "nasional"],
  public: ["nasional", "umum"],
  travel: ["perjalanan", "tiket"],
  tips: ["catatan", "saran"],
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
// Dipakai normalizeToken untuk membuang akhiran, dan dipakai termPattern di
// src/lib/guidebook-search.ts sebagai akhiran opsional saat mencocokkan kata
// kunci ke teks artikel - daftar imbuhannya harus satu, bukan dua.
export const SUFFIXES = ["nya", "kan", "an"];

// Partikel tanya "-kah" menempel di kata apa pun ("adakah", "dimanakah",
// "mahalkah") dan tidak pernah ada di teks artikel. Kalau ikut jadi kata kunci,
// "adakah masjid di nanjing?" menuntut kata yang tidak akan pernah cocok, dan
// karena pertanyaan pendek harus cocok semua, hasilnya nol padahal artikelnya
// ada. Bentuk tanpa partikel yang dipakai, jadi "adakah" jatuh ke "ada" (kata
// fungsi) dan berhenti di situ.
const PARTICLE_KAH = "kah";

function stripQuestionParticle(token: string): string {
  return token.length > PARTICLE_KAH.length && token.endsWith(PARTICLE_KAH)
    ? token.slice(0, -PARTICLE_KAH.length)
    : token;
}

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
  const raw = (question ?? "").toLowerCase().match(QUESTION_TOKENS) ?? [];
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
    const bare = stripQuestionParticle(token);
    add(bare);
    add(normalizeToken(bare));
  }
  for (const token of raw) {
    const stem = normalizeToken(token);
    for (const synonym of [...(SYNONYMS[token] ?? []), ...(SYNONYMS[stem] ?? [])]) add(synonym);
  }
  return [...terms].slice(0, MAX_TERMS);
}

// Koreksi salah ketik. Kamusnya kosakata korpus, bukan kamus bahasa: yang boleh
// jadi koreksi hanya kata yang benar-benar ada di artikel yang bisa dikutip.
// Ambangnya sengaja ketat - koreksi yang salah lebih mahal daripada penolakan,
// karena bot lalu mengutip artikel yang tidak menjawab pertanyaannya dan
// pembacanya tidak punya cara tahu. Ukurannya: satu salah ketik per pertanyaan
// menjatuhkan recall@4 golden dari 1,000 ke 0,84 (lihat src/db/eval-guidebook.ts
// grup "salah ketik").
// Di bawah panjang ini, tetangga yang dihitung hanya huruf tertukar dan
// tebakannya harus tunggal: itu salah ketik yang paling sering terjadi, dan
// pada kata tiga huruf substitusi satu huruf hampir selalu kata lain yang
// benar-benar ada ("buy" satu huruf dari "bus", dan pertanyaan tentang belanja
// jadi ikut menarik artikel transportasi - pernah kejadian, tertangkap grup
// recall di src/db/eval-guidebook.ts).
const MIN_TYPO_LEN = 5;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/** Kata -> jumlah artikel yang memuatnya. Mengisi peran kamus untuk koreksi salah ketik. */
export type CorpusVocabulary = Map<string, number>;

/** Kata yang muncul kalau dua huruf bersebelahan ditukar. */
function transpositions(term: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < term.length - 1; i += 1) {
    if (term[i] === term[i + 1]) continue;
    out.push(term.slice(0, i) + term[i + 1] + term[i] + term.slice(i + 2));
  }
  return out;
}

/**
 * Semua kata berjarak satu salah ketik dari `term`: satu huruf dibuang, ditambah,
 * diganti, atau ditukar posisinya. Kandidatnya dibangkitkan, bukan dicari lewat
 * indeks - pertanyaan paling panjang pun cuma beberapa ribu kandidat, dan
 * mencocokkannya ke Map jauh lebih murah daripada merawat indeks jarak.
 */
function typoNeighbours(term: string): string[] {
  const out = new Set<string>(transpositions(term));
  for (let i = 0; i < term.length; i += 1) {
    out.add(term.slice(0, i) + term.slice(i + 1));
    for (const letter of ALPHABET) {
      if (letter === term[i]) continue;
      out.add(term.slice(0, i) + letter + term.slice(i + 1));
      out.add(term.slice(0, i) + letter + term.slice(i));
    }
  }
  for (const letter of ALPHABET) out.add(term + letter);
  out.delete(term);
  return [...out];
}

/**
 * Kosakata korpus, satu teks per artikel (boleh gabungan judul + bagian + isi).
 * Satu artikel dihitung sekali walau katanya sepuluh kali: yang diukur "ada di
 * berapa artikel", bukan "muncul berapa kali". Kata pendek ikut disimpan karena
 * bisa jadi koreksi ("masjid" -> "madjid"), yang dibatasi justru sisi
 * pertanyaannya.
 */
export function buildCorpusVocabulary(texts: string[]): CorpusVocabulary {
  const freq: CorpusVocabulary = new Map();
  for (const text of texts) {
    for (const word of new Set((text ?? "").toLowerCase().match(/[a-z]{3,}/g) ?? [])) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  return freq;
}

/**
 * Kata betulan yang paling mungkin dimaksud, atau undefined kalau ragu.
 */
export function correctTypo(term: string, vocab: CorpusVocabulary): string | undefined {
  if (vocab.has(term)) return undefined;
  // Kata pendek: hanya huruf tertukar yang dipertimbangkan, dan tebakannya harus
  // tunggal. "kso" cuma bisa jadi "kos", jadi pertanyaan "biaya kso di nanjing"
  // tetap sampai ke artikel kos; "kost" punya empat tetangga (termasuk "kos")
  // sehingga dibiarkan apa adanya dan pertanyaannya dijawab lewat sinonim
  // (lihat SYNONYMS.kost).
  if (term.length < MIN_TYPO_LEN) {
    const swaps = transpositions(term).filter((word) => vocab.has(word));
    return swaps.length === 1 ? swaps[0] : undefined;
  }
  const candidates = typoNeighbours(term).filter((word) => vocab.has(word));
  // Beberapa kandidat: yang paling banyak artikelnya menang. Seri berarti dua
  // kata sama-sama masuk akal, dan menebak di situ tidak lebih baik daripada
  // tidak menjawab.
  let best: string | undefined;
  let bestFreq = -1;
  let tie = false;
  for (const word of candidates) {
    const freq = vocab.get(word) ?? 0;
    if (freq > bestFreq) {
      best = word;
      bestFreq = freq;
      tie = false;
    } else if (freq === bestFreq) tie = true;
  }
  return tie ? undefined : best;
}

/**
 * Pertanyaan dengan kata yang salah ketik diganti kata yang ada di korpus, atau
 * undefined kalau tidak ada yang berubah. Yang dikembalikan tetap pertanyaan,
 * bukan daftar kata kunci, supaya jalur pencariannya dijalankan ulang utuh -
 * sinonim, batang kata, dan batas jumlah kata kunci ikut berlaku untuk kata
 * hasil koreksi, sama seperti kata yang diketik benar. Kata hasil koreksi yang
 * ternyata kata fungsi pun ikut diganti: kata itu lalu dibuang oleh searchTerms
 * dan dikenali questionEntities, jadi mengetik "toingkok" berakhir sama dengan
 * mengetik "tiongkok".
 */
export function correctQuestionTypo(question: string, vocab: CorpusVocabulary): string | undefined {
  let changed = false;
  const fixed = (question ?? "").replace(/[A-Za-z]+/g, (word) => {
    const correction = correctTypo(word.toLowerCase(), vocab);
    if (correction === undefined) return word;
    changed = true;
    // Huruf besar di awal kata diikuti aslinya: "Mkanan" -> "Makanan".
    return word[0] === word[0].toUpperCase() ? correction[0].toUpperCase() + correction.slice(1) : correction;
  });
  return changed ? fixed : undefined;
}

/**
 * Isi kolom `guide_chunks.text_stemmed`: seluruh kata potongan, dinormalkan.
 * Beda dengan searchTerms, di sini stopword TIDAK dibuang - kolom ini harus
 * tetap bisa dicocokkan untuk kata apa pun yang diketik pengguna, dan kata
 * fungsi baru dibuang di sisi pertanyaan. Duplikat dibiarkan; `to_tsvector`
 * yang meringkasnya jadi lexeme.
 */
export function stemmedText(text: string): string {
  const raw = (text ?? "").toLowerCase().match(QUESTION_TOKENS) ?? [];
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

/** Jatah teks satu artikel di konteks model; sisanya dipotong windowAroundTerms. */
export const MAX_CHUNK_CHARS = 1800;

/**
 * Batas teks satu artikel sesudah jendela tambahannya ikut dikirim: jendela
 * utama (paling banyak MAX_CHUNK_CHARS) plus sampai MAX_EXTRA_WINDOWS jendela
 * lain, dengan jatah total yang dibagi rata. Batasnya sengaja tidak lebih besar
 * dari dua kali MAX_CHUNK_CHARS: biaya per pesan naik paling banyak dua kali
 * lipat, sementara total konteksnya tetap dijaga MAX_CONTEXT_CHARS di
 * buildGuideContext.
 */
export const MAX_CHUNK_CHARS_TOTAL = MAX_CHUNK_CHARS * 2;

/**
 * Jumlah jendela tambahan per artikel (di luar jendela utama). Satu jendela
 * tambahan tidak cukup kalau baris jawabannya seri dengan baris lain yang lebih
 * awal - di artikel visa, baris "SIM internasional tidak berlaku di Nanjing"
 * kalah dari baris appointment yang sama-sama dua istilah berbeda, lalu jatah
 * jendelanya habis di baris yang tidak menjawab. Jatah MAX_CHUNK_CHARS_TOTAL
 * dibagi rata ke jendela-jendela itu, jadi menambah jendela tidak menambah
 * panjang konteks - hanya memindahkan bagian yang dikirim.
 */
export const MAX_EXTRA_WINDOWS = 2;

/**
 * Penanda teks yang tidak ikut dikirim, di antara dua jendela satu artikel.
 * Tanpa penanda, dua bagian yang tidak bersebelahan terbaca sebagai satu kalimat
 * sambung dan model bisa menyimpulkan hubungan yang tidak ada di artikelnya.
 */
export const WINDOW_GAP = "\n\n[...]\n\n";

/**
 * Mengurutkan baris sesuai peringkat yang sudah dihitung - slug hasil skor
 * retrieval, atau id potongan dari baris cache - dengan `ordinal` sebagai
 * pemecah seri. Urutan yang datang dari DB (help_articles.sort_order) adalah
 * urutan tampilan konsol, bukan urutan relevansi: tanpa fungsi ini, daftar
 * "panduan yang paling relevan" tampil urut sort_order, jadi artikel yang paling
 * cocok muncul di posisi terakhir - atau hilang sama sekali kalau pemotongan
 * tiga artikel menyentuhnya.
 */
export function orderByRank<T extends { ordinal: number }>(
  rows: T[],
  rankKeys: string[],
  keyOf: (row: T) => string,
): T[] {
  const rank = new Map(rankKeys.map((key, i) => [key, i]));
  const last = rankKeys.length;
  return [...rows].sort(
    (a, b) => (rank.get(keyOf(a)) ?? last) - (rank.get(keyOf(b)) ?? last) || a.ordinal - b.ordinal,
  );
}

/** Escape satu kata kunci jadi pola yang aman dipakai di RegExp. */
export function escapedTerm(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

/**
 * Melebar dari satu baris jangkar ke dua arah bergantian, bukan menghabiskan
 * jatah ke satu arah dulu: baris tepat sebelum dan sesudah baris terbaik biasanya
 * masih satu daftar (alamat masjid satu per baris), jadi keduanya dapat jatah.
 * Berhenti saat tidak ada sisi yang muat lagi. Satu pengecualian: judul bagian
 * ("## ...") menandai isi di bawahnya, bukan di atasnya, jadi jangan menyeberang
 * ke bagian sebelumnya selagi isi bagian sekarang masih muat - kalau tidak,
 * paragraf pembuka artikel menghabiskan jatah dan entri di bawah judul yang
 * justru dicari ikut terpotong.
 *
 * `low`/`high` membatasi baris yang boleh diambil. Jendela pertama memakai
 * seluruh artikel; jendela kedua berhenti di batas jendela pertama, jadi dua
 * jendela tidak pernah memuat baris yang sama.
 */
function widenWindow(
  lines: string[],
  anchor: number,
  low: number,
  high: number,
  limit: number,
): { start: number; end: number } {
  let start = anchor;
  let end = anchor;
  let used = lines[anchor].length;
  for (let back = true; ; back = !back) {
    const before = start > low ? lines[start - 1] : null;
    const after = end < high ? lines[end + 1] : null;
    const blockedBefore = before !== null && /^#{2,}\s/.test(before) && after !== null;
    const roomBefore = before !== null && !blockedBefore && used + 1 + before.length <= limit;
    const roomAfter = after !== null && used + 1 + after.length <= limit;
    const takeBefore = back ? roomBefore || !roomAfter : roomBefore && !roomAfter;
    if (takeBefore ? !roomBefore : !roomAfter) break;
    if (takeBefore) {
      start -= 1;
      used += 1 + lines[start].length;
    } else {
      end += 1;
      used += 1 + lines[end].length;
    }
  }
  return { start, end };
}

/**
 * Teks satu artikel yang dikirim ke model: satu jendela di sekitar baris tempat
 * kata kunci pertanyaannya paling banyak muncul (paling banyak MAX_CHUNK_CHARS),
 * ditambah sampai MAX_EXTRA_WINDOWS jendela di baris-baris lain yang juga memuat
 * kata kuncinya, dihitung dari jatah MAX_CHUNK_CHARS_TOTAL. Jawaban satu artikel
 * sering terbelah dua tempat - denda di daftar sanksi, batas hari lapor di bagian
 * administrasi - dan dengan satu jendela saja model menjawab "panduannya tidak
 * memuat itu" untuk fakta yang ada di artikelnya. Artikel pendek, dan artikel
 * yang bagian keduanya tidak memuat
 * satu kata kunci pun, keluar persis sama seperti sebelum ada jendela kedua.
 *
 * Artikel yang lebih panjang dipotong di sekitar baris tempat kata kunci
 * pertanyaannya paling banyak muncul, bukan selalu dari judul. Bagian yang
 * menjawab pertanyaan sering ada jauh di bawah judul ("## Kirim Barang Pintu ke
 * Pintu" di artikel packing yang panjang), dan memotong dari atas membuat model
 * menjawab "panduannya tidak memuat itu" padahal ada - penolakan yang salah tapi
 * terdengar benar, jadi tidak ada yang menyadarinya. Baris pertama menang saat
 * seri, jadi artikel tanpa kata kunci di isinya tetap dikirim dari awal seperti
 * semula. Jendela kedua dipilih di baris-baris di luar jendela pertama, dan
 * penilainya bukan skor mentah yang sama: dua kata kunci di satu baris yang
 * salah satunya cuma varian kata kunci lain ("laku" pada baris yang juga memuat
 * "dilakukan", "izin"/"tinggal" pada judul "Izin Tinggal") dihitung satu, bukan
 * dua. Skor mentah sering cuma mengulang satu topik dengan dua varian katanya,
 * jadi baris yang cuma menyinggung topik itu mengalahkan judul bagian yang
 * memuat dua kata kunci berbeda ("## Registrasi 住宿登记: Batas 24 Jam") dan
 * jatah jendela kedua habis di bagian yang tidak menjawab pertanyaan. Jendela
 * pertama dinilai dengan aturan yang sama supaya baris yang menang di situ juga
 * baris dengan bukti terbanyak, bukan baris yang mengulang satu topik. Kalau di
 * luar jendela pertama tidak ada satu baris pun yang memuat kata kuncinya,
 * artikelnya keluar sebagai satu jendela.
 *
 * Skornya jumlah kata kunci BERBEDA di satu baris, bukan jumlah kemunculan:
 * kata umum ("metro") yang diulang-ulang di satu bagian tidak boleh mengalahkan
 * baris yang memuat nama tempat yang ditanyakan, karena baris itulah satu-satunya
 * tempat jawabannya (alamat, bus, pintu keluar metro) berada.
 *
 * Batas potongannya jatuh di antara baris, tidak di tengah baris: tombol tempat
 * di UI membaca nama tebal dan tautan Amap yang harus utuh dalam satu baris, dan
 * nama tempat yang terpotong membuat model tidak mengenali tempatnya. Kalau satu
 * baris sendiri lebih panjang dari jatahnya, baris itu tetap dikirim utuh -
 * memotongnya di tengah hanya mengubah nama yang salah jadi nama yang tidak ada.
 */
export function windowAroundTerms(body: string, terms: string[]): string {
  if (body.length <= MAX_CHUNK_CHARS || terms.length === 0) return body;
  // Satu pola per istilah, tanpa flag /g: `test` pada pola /g menyimpan posisi
  // terakhir, jadi baris berikutnya bisa dinilai dari posisi bekas baris
  // sebelumnya. Huruf besar-kecil diabaikan karena isi artikel menulis kapital di
  // awal kalimat, sementara sisi skoring membandingkan teks yang sudah di-lowercase.
  const probes = terms.map((term) => new RegExp(escapedTerm(term), "iu"));
  const lines = body.split("\n");
  // Nilai satu baris dihitung tanpa mengulang istilah yang sebenarnya varian
  // istilah lain di baris yang sama: "izin" dan "tinggal" pada baris
  // "## ... Izin Tinggal" hanya satu bukti, begitu juga "pakai" pada baris yang
  // sudah memuat "dipakai". Skor mentahnya sering cuma mengulang satu topik
  // dengan dua varian katanya, jadi baris yang cuma menyinggung topik itu
  // mengalahkan baris yang memuat dua kata kunci berbeda - dan di jalur ini
  // baris pemenangnya menentukan di mana jendela utama dipotong.
  const distinctHits = (line: string) => {
    const hits = terms.filter((_, j) => probes[j].test(line));
    return hits.filter((term) => !hits.some((other) => other !== term && other.includes(term)));
  };
  let best = 0;
  let bestScore = 0;
  lines.forEach((line, i) => {
    const score = distinctHits(line).length;
    // Seri dimenangkan baris paling awal, bukan baris paling panjang. Di artikel
    // berdaftar, baris pertama yang cocok adalah entri pertama bagian pertama;
    // baris panjang belakangan (mis. satu masjid di luar kota) tidak boleh
    // menyeret jendela keluar dari bagian yang justru jadi jawaban default.
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  const primary = widenWindow(lines, best, 0, lines.length - 1, MAX_CHUNK_CHARS);
  const primaryLines = lines.slice(primary.start, primary.end + 1);
  const primaryText = primaryLines.join("\n");

  // Baris yang memuat kata kunci pertanyaan tapi jatuh di luar jendela pertama:
  // di situlah bagian kedua artikel sering menyimpan jawabannya. Kandidatnya
  // diambil sampai MAX_EXTRA_WINDOWS, satu per satu, dengan aturan: kata kunci
  // yang BELUM terbaca di jendela sebelumnya dulu, baru istilah berbeda, baru
  // jumlah kecocokan, baru baris paling awal.
  //
  // Urutan itu penting di artikel visa. Jendela utamanya sudah memuat
  // "residence permit" dan "lewat", jadi baris yang mengulang kata kunci itu
  // dengan empat kecocokan selalu menang kalau penilainya jumlah kecocokan -
  // sementara baris "## Denda Overstay" yang cuma memuat satu kata kunci, dan
  // satu-satunya kata kunci yang belum terbaca, justru tempat jawabannya.
  // Begitu juga baris "SIM internasional tidak berlaku di Nanjing": kata
  // kuncinya seri dengan baris appointment yang lebih awal, dan satu jendela
  // tambahan saja membuatnya kalah. Sisa jatahnya karena itu dibagi rata ke
  // beberapa jendela, bukan diberikan seluruhnya ke satu baris.
  const anchors: number[] = [];
  // Teks yang sudah terbaca model sejauh ini (jendela utama + baris jangkar yang
  // sudah dipilih); kata kunci yang sudah ada di sini tidak dihitung "baru" lagi.
  let windowsText = primaryText;
  while (anchors.length < MAX_EXTRA_WINDOWS) {
    let pick = -1;
    let pickFresh = 0;
    let pickDistinct = 0;
    let pickHits = 0;
    for (let i = 0; i < lines.length; i++) {
      if ((i >= primary.start && i <= primary.end) || anchors.includes(i)) continue;
      const hits = terms.filter((_, j) => probes[j].test(lines[i])).length;
      if (hits === 0) continue;
      const fresh = terms.filter((term, j) => probes[j].test(lines[i]) && !windowsText.includes(term)).length;
      const distinct = distinctHits(lines[i]).length;
      if (
        fresh > pickFresh ||
        (fresh === pickFresh && (distinct > pickDistinct || (distinct === pickDistinct && hits > pickHits)))
      ) {
        pick = i;
        pickFresh = fresh;
        pickDistinct = distinct;
        pickHits = hits;
      }
    }
    if (pick < 0) break;
    anchors.push(pick);
    windowsText += `\n${lines[pick]}`;
  }
  anchors.sort((a, b) => a - b);
  const room = MAX_CHUNK_CHARS_TOTAL - primaryText.length;
  const slots = anchors.map((anchor) => ({ start: anchor, end: anchor }));
  const share = slots.length > 0 ? Math.floor(room / slots.length) : 0;
  // Keluarannya tetap satu jendela - persis seperti sebelum jendela kedua ada -
  // kalau tidak ada baris lain yang memuat satu kata kunci pun, atau baris
  // jangkarnya saja tidak muat lagi di bagian jatahnya.
  if (slots.length === 0 || room <= 0 || slots.some((slot) => share < lines[slot.start].length)) {
    return primaryText;
  }

  const windows: string[] = [primaryText];
  const last = slots.length - 1;
  let floor = 0;
  let used = 0;
  slots.forEach((slot, position) => {
    const above = slot.start < primary.start;
    const sameSide = position < last && slots[position + 1].start < primary.start === above;
    const low = Math.max(floor, above ? 0 : primary.end + 1);
    const high = sameSide ? slots[position + 1].start - 1 : above ? primary.start - 1 : lines.length - 1;
    // Jendela terakhir cuma dibatasi ujung artikel, dan dia yang menerima sisa
    // jatah: sebagian kecil jatah hilang kalau semua jendela dipotong rata
    // (jendela yang barisnya sedikit tidak memakainya), dan sisa itu justru
    // yang membuat jendela terakhir bisa memanjang sampai kalimat penutup.
    const cap = position === last ? room - used - WINDOW_GAP.length : share;
    const window = widenWindow(lines, slot.start, low, high, cap);
    const text = lines.slice(window.start, window.end + 1).join("\n");
    windows.push(text);
    floor = window.end + 1;
    used += text.length + WINDOW_GAP.length;
  });
  return windows.join(WINDOW_GAP);
}

/**
 * Satu paragraf pendek per topik untuk jawaban cadangan (kuota habis, AI mati,
 * Groq gagal) yang tidak memanggil model. Penanda blok markdown dibuang, bukan
 * dibiarkan: "## Masjid" dan "- **净觉寺 …**" hanya berarti di awal baris,
 * sedangkan di sini semuanya diratakan jadi satu paragraf. Kalau penandanya ikut,
 * renderer membaca seluruh potongan sebagai satu heading raksasa - terlihat di
 * jawaban Inggris "is there any mosque in nanjing?": "SOURCE THE GUIDEBOOK ...
 * ## MOSQUE - (净觉寺 …". Dipotong di batas kata, bukan di tengah kata.
 */
export function excerpt(text: string, max = 220): string {
  const flat = text
    .replace(/^[ \t]*(?:#{1,6}[ \t]+|[-*+][ \t]+|>[ \t]?)/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}
