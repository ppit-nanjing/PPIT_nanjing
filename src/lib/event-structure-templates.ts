// Template struktur kepanitiaan acara PPIT Nanjing - sumber bentuk pohon
// event_divisions yang bisa diterapkan satu klik di console.
//
// Prinsipnya sama dengan src/db/seed-wif-2026.ts, yang jadi dasar semua
// template "Acara Besar" di sini:
//
// 1. Template hanya berisi DIVISI + kuota + jobdesc. Orang TIDAK ikut - BPH
//    dan SC (Ketua Pelaksana, Wakil, Sekretaris, Bendahara, Supervisor)
//    selalu ditugaskan TANPA divisi lewat form panitia inti, karena peran
//    mereka berdiri sendiri di atas departemen mana pun (coreHint).
// 2. Kuota departemen = 1 (kursi ketua departemen); anggota dihitung di
//    sub-timnya. Kuota sub-tim hanya diisi kalau angkanya memang diketahui
//    (warisan WIF) - menebak lebih buruk daripada mengosongkan.
// 3. Jobdesc satu poin per baris; yang tidak diketahui pasti dibiarkan kosong
//    supaya tidak terkesan resmi padahal belum disepakati siapa pun.
//
// Registry ini murni data tanpa import server/client apa pun - aman dibaca
// dari server component maupun server action. Menambah format acara baru =
// tambah entri di sini, bukan migrasi database.

export type StructureTemplateNode = {
  name: string;
  quota?: number;
  jobDescription?: string;
};

export type StructureTemplateDepartment = StructureTemplateNode & {
  children: StructureTemplateNode[];
};

export type StructureTemplateGroupId = "acara-besar" | "formal" | "proker";

export type StructureTemplate = {
  id: string;
  group: StructureTemplateGroupId;
  label: string;
  /** Satu kalimat konteks untuk admin sebelum menerapkan. */
  description: string;
  /** Pengingat penugasan peran inti tanpa divisi, tampil di picker. */
  coreHint: string;
  departments: StructureTemplateDepartment[];
};

export const STRUCTURE_TEMPLATE_GROUPS: { id: StructureTemplateGroupId; label: string }[] = [
  { id: "acara-besar", label: "Acara Besar & Festival" },
  { id: "formal", label: "Acara Formal, Sidang & Musyawarah" },
  { id: "proker", label: "Program Kerja Divisi" },
];

const FESTIVAL_CORE_HINT =
  "Setelah diterapkan, tugaskan tanpa divisi (panitia inti): Ketua Pelaksana (peran ketua), Wakil Ketua Pelaksana (wakil), Sekretaris (sekretaris), Bendahara (bendahara), dan Supervisory Committee (supervisor).";

// Kerangka asli WIF 2026 (seed-wif-2026.ts) - struktur teruji yang dipakai
// PPIT. Kuota dan tiga jobdesc-nya verbatim dari situ. Tiap acara besar lain
// hanyalah kerangka ini + sub-tim khasnya di Dept. EO.
function wifSkeleton(extraEoChild?: StructureTemplateNode): StructureTemplateDepartment[] {
  const eoChildren: StructureTemplateNode[] = [
    { name: "Acara", quota: 5 },
    ...(extraEoChild ? [extraEoChild] : []),
    { name: "Humas", quota: 2 },
    { name: "Design & Media", quota: 6 },
  ];
  return [
    { name: "Dept. EO", quota: 1, children: eoChildren },
    {
      name: "Dept. Perlengkapan",
      quota: 1,
      children: [
        {
          name: "Konsumsi",
          quota: 2,
          jobDescription: [
            "Menyiapkan konsumsi saat acara.",
            "Memastikan jumlah konsumsi yang disiapkan mencukupi.",
          ].join("\n"),
        },
        {
          name: "Perlengkapan",
          quota: 3,
          jobDescription: [
            "Mendata semua perlengkapan yang diperlukan oleh setiap divisi.",
            "Mempersiapkan semua alat & bahan yang diperlukan untuk acara.",
          ].join("\n"),
        },
        {
          name: "Sound System",
          quota: 2,
          jobDescription: "Mempersiapkan sound system, peralatan yang dibutuhkan di belakang layar.",
        },
      ],
    },
    {
      name: "Dept. Keuangan",
      quota: 1,
      children: [
        { name: "Usaha Dana", quota: 2 },
        { name: "Sponsorship", quota: 2 },
      ],
    },
  ];
}

// Proker divisi (sosial, budaya, akademik) berbagi satu bentuk; varian Bakti
// Sosial punya sub-tim donasi/cinderamata ekstra di Perlengkapan & Operasional.
function prokerSkeleton(sosialOnly: boolean): StructureTemplateDepartment[] {
  return [
    {
      name: "Divisi Acara",
      quota: 1,
      children: [
        { name: "Konsep Rundown & Teknis Kegiatan", jobDescription: "Menyusun rundown dan memastikan teknis kegiatan berjalan sesuai rencana." },
        { name: "MC / Moderator / Narasumber Coordinator", quota: 1, jobDescription: "Mengoordinasikan MC, moderator, dan narasumber sebelum serta saat acara." },
        { name: "Games & Ice Breaking", jobDescription: "Menyiapkan dan memandu games atau ice breaking peserta." },
      ],
    },
    {
      name: "Divisi Humas & LO",
      quota: 1,
      children: [
        { name: "Hubungan Mitra / Instansi / Pemateri", jobDescription: "Menjalin dan menjaga komunikasi dengan mitra, instansi, atau pemateri." },
        { name: "Registrasi Peserta & Broadcast Info", jobDescription: "Mengelola pendaftaran peserta dan menyebar informasi ke kanal resmi." },
      ],
    },
    {
      name: "Divisi Desain & Publikasi",
      quota: 1,
      children: [
        { name: "Poster, Virtual Background & Feed", jobDescription: "Menyiapkan kebutuhan desain promosi dan publikasi acara." },
        { name: "Dokumentasi Kegiatan", jobDescription: "Memotret/merekam jalannya acara dan mengarsipkan hasilnya." },
      ],
    },
    {
      name: "Divisi Perlengkapan & Operasional",
      quota: 1,
      children: [
        { name: "Transportasi, Venue / Link Room", jobDescription: "Mengurus transportasi, venue, atau link room online untuk acara." },
        { name: "Konsumsi & Logistik", jobDescription: "Menyiapkan konsumsi dan logistik panitia serta peserta." },
        ...(sosialOnly
          ? [{ name: "Donasi / Cinderamata", jobDescription: "Mengelola pengumpulan dan penyaluran donasi atau cinderamata." }]
          : []),
      ],
    },
  ];
}

export const EVENT_STRUCTURE_TEMPLATES: StructureTemplate[] = [
  {
    id: "wif",
    group: "acara-besar",
    label: "WIF — Welcoming Indonesian Freshman",
    description: "Struktur lengkap WIF 2026 persis seperti yang dipakai PPIT - dasar paling teruji.",
    coreHint: FESTIVAL_CORE_HINT,
    departments: wifSkeleton(),
  },
  {
    id: "champions",
    group: "acara-besar",
    label: "Champions — Acara Olahraga",
    description: "Kerangka WIF + sub-tim lapangan khusus lomba/pertandingan.",
    coreHint: FESTIVAL_CORE_HINT,
    departments: wifSkeleton({
      name: "Field Officer / Lomba & Pertandingan",
      jobDescription: "Mendampingi dan mengatur jalannya lomba/pertandingan di lapangan, termasuk pencatatan skor hasilnya.",
    }),
  },
  {
    id: "wonders",
    group: "acara-besar",
    label: "Wonders — Acara Budaya",
    description: "Kerangka WIF + koordinator talent/performer untuk panggung budaya.",
    coreHint: FESTIVAL_CORE_HINT,
    departments: wifSkeleton({
      name: "Talent & Performer Coordinator",
      jobDescription: "Mengoordinasikan talent dan performer: rundown panggung, sound check, dan perlindungan waktu latihan.",
    }),
  },
  {
    id: "welpar",
    group: "acara-besar",
    label: "Welpar — Welcoming Party",
    description: "Kerangka WIF + koordinator talent/performer untuk panggung hiburan.",
    coreHint: FESTIVAL_CORE_HINT,
    departments: wifSkeleton({
      name: "Talent & Performer Coordinator",
      jobDescription: "Mengoordinasikan talent dan performer: rundown panggung, sound check, dan perlindungan waktu latihan.",
    }),
  },
  {
    id: "farewell",
    group: "acara-besar",
    label: "Farewell Party",
    description: "Kerangka WIF + koordinator talent/performer untuk acara perpisahan.",
    coreHint: FESTIVAL_CORE_HINT,
    departments: wifSkeleton({
      name: "Talent & Performer Coordinator",
      jobDescription: "Mengoordinasikan talent dan performer: rundown panggung, sound check, dan perlindungan waktu latihan.",
    }),
  },
  {
    id: "formal-sidang",
    group: "formal",
    label: "Acara Formal / Sidang / Musyawarah",
    description: "Untuk SKR, Pemilu, RUC, RKC, RKE, sampai rekrutmen - fokus persidangan, verifikasi, dan arsip.",
    coreHint:
      "Tugaskan tanpa divisi (panitia inti): Penanggung Jawab / Dewan Pengarah (supervisor), Ketua Pelaksana / Ketua KPU / Presidium Ad-Hoc (ketua), Sekretaris / Notulis Utama (sekretaris), Bendahara (bendahara).",
    departments: [
      {
        name: "Divisi Persidangan & Tata Tertib",
        quota: 1,
        children: [
          { name: "Drafting & Materi Sidang", jobDescription: "Menyusun draf materi, notula acuan, dan dokumen sidang." },
          { name: "Pimpinan Sidang / Moderator", quota: 1, jobDescription: "Memimpin jalannya sidang dan menjaga forum tetap tertib." },
          { name: "Time Keeper & Notulensi Teknis", jobDescription: "Menjaga durasi bicara tiap pihak dan mencatat notulensi teknis." },
        ],
      },
      {
        name: "Divisi Verifikasi & Administrasi",
        quota: 1,
        children: [
          { name: "Verifikasi Peserta / Hak Suara", jobDescription: "Memverifikasi keabsahan peserta dan hak suara sebelum sidang." },
          { name: "Pendaftaran & Rekapitulasi Data", jobDescription: "Mendaftarkan peserta dan merekapitulasi data serta hasil sidang." },
        ],
      },
      {
        name: "Divisi Logistik & IT Support",
        quota: 1,
        children: [
          { name: "Perlengkapan Sidang & Sound System", jobDescription: "Menyiapkan perlengkapan sidang dan sound system tempat acara." },
          { name: "Technical Support & Virtual Platform", jobDescription: "Mengelola Zoom/streaming dan menangani kendala teknis virtual." },
          { name: "Konsumsi", jobDescription: "Menyiapkan konsumsi panitia dan peserta sidang." },
        ],
      },
      {
        name: "Divisi Publikasi & Dokumentasi",
        quota: 1,
        children: [
          { name: "Media Publikasi Hasil Sidang", jobDescription: "Mempublikasikan hasil sidang ke kanal resmi organisasi." },
          { name: "Dokumentasi & Arsip", jobDescription: "Mendokumentasikan sidang dan mengarsipkan seluruh dokumennya." },
        ],
      },
    ],
  },
  {
    id: "proker-sosial",
    group: "proker",
    label: "Proker Divisi — Bakti Sosial (PemdasSos)",
    description: "Panti asuhan, panti jompo/disabilitas, outdoor - plus sub-tim donasi/cinderamata.",
    coreHint:
      "Tugaskan tanpa divisi (tim inti): Project Officer / Ketua Acara (ketua), Sekretaris & Administrasi (sekretaris), Bendahara (bendahara).",
    departments: prokerSkeleton(true),
  },
  {
    id: "proker-umum",
    group: "proker",
    label: "Proker Divisi — Umum (Sosialisasi / Kultura / Akademia)",
    description: "Bentuk baku proker divisi: sosialisasi, kunjungan budaya, career path, workshop.",
    coreHint:
      "Tugaskan tanpa divisi (tim inti): Project Officer / Ketua Acara (ketua), Sekretaris & Administrasi (sekretaris), Bendahara (bendahara).",
    departments: prokerSkeleton(false),
  },
];

export function getStructureTemplate(id: string): StructureTemplate | undefined {
  return EVENT_STRUCTURE_TEMPLATES.find((t) => t.id === id);
}
