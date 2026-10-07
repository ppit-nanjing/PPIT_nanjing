import type { FormSection, FormField } from "@/db/schema";

// Template default (placeholder) untuk tiga formulir internal BPH yang
// menggantikan Google Forms. Semua pertanyaan di bawah HANYA placeholder -
// BPH menggantinya dari /console/forms tanpa menyentuh file ini (data di DB
// yang dipakai publik; definisi di sini dipakai untuk membuat baris DB pertama
// dan untuk tahu form mana yang belum ada). Label memakai bahasa Indonesia
// karena konten DB tidak diterjemahkan otomatis.
export type FormTemplateDefault = {
  slug: string;
  title: string;
  description: string;
  sections: FormSection[];
};

const CONSENT_OPTIONS = ["Ya, saya setuju"];

function field(field: FormField): FormField {
  return field;
}

const RECRUITMENT: FormTemplateDefault = {
  slug: "recruitment",
  title: "Formulir Rekrutmen Pengurus",
  description:
    "Isi formulir ini untuk mendaftar sebagai pengurus PPIT Nanjing. Pastikan data yang kamu isi valid agar bisa dihubungi kembali.",
  sections: [
    {
      id: "data-diri",
      title: "Data Diri",
      fields: [
        field({ id: "nama", type: "short_text", label: "Nama lengkap", required: true, placeholder: "Nama sesuai paspor/KTM" }),
        field({ id: "email", type: "email", label: "Email", required: true, placeholder: "nama@example.com" }),
        field({ id: "whatsapp", type: "tel", label: "Nomor WhatsApp", required: true, placeholder: "+86 138 xxxx xxxx" }),
        field({ id: "nim", type: "short_text", label: "NIM / Student ID", required: true }),
        field({ id: "prodi", type: "short_text", label: "Jurusan / Program studi", required: true }),
        field({ id: "angkatan", type: "number", label: "Angkatan / tahun masuk", required: true, placeholder: "2024" }),
      ],
    },
    {
      id: "motivasi",
      title: "Motivasi & Pengalaman",
      fields: [
        field({ id: "motivasi", type: "paragraph", label: "Kenapa kamu ingin bergabung?", required: true }),
        field({ id: "pengalaman", type: "paragraph", label: "Pengalaman organisasi / kepanitiaan yang relevan", required: false }),
        field({ id: "skill", type: "paragraph", label: "Skill yang kamu punya", required: false }),
        field({ id: "portofolio", type: "short_text", label: "Tautan portofolio / LinkedIn / Instagram", required: false, placeholder: "https://..." }),
      ],
    },
    {
      id: "kesediaan",
      title: "Ketersediaan & Preferensi",
      fields: [
        field({
          id: "ketersediaan",
          type: "paragraph",
          label: "Ketersediaan waktu (hari/jam)",
          required: true,
          description: "Contoh: Senin & Rabu setelah 19.00, akhir pekan bebas.",
        }),
        field({
          id: "divisi",
          type: "select",
          label: "Divisi / peran yang diminati",
          required: true,
          options: ["Internal", "Eksternal", "Media & Informasi", "Sosial Budaya", "Teknologi"],
        }),
        field({
          id: "cv",
          type: "file",
          label: "Unggah CV",
          required: true,
          description: "PDF atau gambar, maksimal 10 MB.",
        }),
        field({ id: "kontakDarurat", type: "short_text", label: "Kontak darurat (nama & nomor)", required: false }),
        field({
          id: "persetujuan",
          type: "radio",
          label: "Persetujuan pengolahan data",
          required: true,
          description: "Data kamu dipakai hanya untuk proses rekrutmen PPIT Nanjing.",
          options: CONSENT_OPTIONS,
        }),
      ],
    },
  ],
};

const COMMITTEE_EVALUATION: FormTemplateDefault = {
  slug: "evaluation-committee",
  title: "Formulir Evaluasi Panitia",
  description:
    "Evaluasi kinerja anggota panitia. Jawabanmu hanya dibaca pengurus dan dipakai untuk perbaikan kepengurusan.",
  sections: [
    {
      id: "identitas",
      title: "Identitas Evaluator",
      fields: [
        field({ id: "namaEvaluator", type: "short_text", label: "Nama kamu (evaluator)", required: true }),
        field({ id: "namaDinilai", type: "short_text", label: "Nama anggota panitia yang dievaluasi", required: true }),
        field({ id: "divisiDinilai", type: "short_text", label: "Peran / divisi yang dievaluasi", required: false }),
        field({ id: "periode", type: "short_text", label: "Periode evaluasi", required: true, placeholder: "contoh: Kepengurusan 2026" }),
      ],
    },
    {
      id: "penilaian",
      title: "Penilaian (1–5)",
      description: "1 = kurang sekali, 5 = sangat baik.",
      fields: [
        field({ id: "komunikasi", type: "scale", label: "Komunikasi", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
        field({ id: "tanggungJawab", type: "scale", label: "Tanggung jawab", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
        field({ id: "kerjaSama", type: "scale", label: "Kerja sama tim", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
        field({ id: "inisiatif", type: "scale", label: "Inisiatif", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
        field({ id: "manajemenWaktu", type: "scale", label: "Manajemen waktu", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
        field({ id: "kualitasKerja", type: "scale", label: "Kualitas kerja", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
      ],
    },
    {
      id: "catatan",
      title: "Catatan",
      fields: [
        field({ id: "kelebihan", type: "paragraph", label: "Kelebihan", required: true }),
        field({ id: "halPerbaikan", type: "paragraph", label: "Hal yang perlu diperbaiki", required: true }),
        field({ id: "komentar", type: "paragraph", label: "Komentar tambahan", required: false }),
        field({ id: "rekomendasi", type: "scale", label: "Rekomendasi keseluruhan", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
      ],
    },
  ],
};

const PARTICIPANT_EVALUATION: FormTemplateDefault = {
  slug: "evaluation-participant",
  title: "Formulir Evaluasi Peserta",
  description: "Ceritakan pengalamanmu mengikuti acara kami supaya acara berikutnya makin baik.",
  sections: [
    {
      id: "data-peserta",
      title: "Data Peserta",
      fields: [
        field({ id: "nama", type: "short_text", label: "Nama kamu", required: true }),
        field({ id: "namaAcara", type: "short_text", label: "Nama acara / program", required: true }),
        field({ id: "tanggal", type: "date", label: "Tanggal acara", required: true }),
        field({ id: "fasilitator", type: "short_text", label: "Nama fasilitator / panitia yang menonjol", required: false }),
      ],
    },
    {
      id: "penilaian",
      title: "Penilaian (1–5)",
      description: "1 = kurang sekali, 5 = sangat baik.",
      fields: [
        field({ id: "kepuasan", type: "scale", label: "Kepuasan keseluruhan", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
        field({ id: "kualitasMateri", type: "scale", label: "Kualitas konten / materi", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
        field({ id: "narasumber", type: "scale", label: "Kinerja pembicara / fasilitator", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
        field({ id: "manajemenWaktu", type: "scale", label: "Manajemen waktu", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
        field({ id: "fasilitas", type: "scale", label: "Fasilitas / logistik", required: true, scaleMax: 5, lowLabel: "Kurang", highLabel: "Sangat baik" }),
      ],
    },
    {
      id: "masukan",
      title: "Masukan",
      fields: [
        field({ id: "palingDisukai", type: "paragraph", label: "Apa yang paling kamu suka?", required: true }),
        field({ id: "perbaikan", type: "paragraph", label: "Apa yang bisa diperbaiki?", required: false }),
        field({ id: "ikutLagi", type: "radio", label: "Akan ikut lagi di acara berikutnya?", required: true, options: ["Ya", "Tidak", "Mungkin"] }),
        field({ id: "masukanTambahan", type: "paragraph", label: "Masukan tambahan", required: false }),
        field({
          id: "persetujuan",
          type: "radio",
          label: "Persetujuan penggunaan masukan",
          required: true,
          description: "Masukanmu boleh dipakai (tanpa nama) untuk publikasi perbaikan acara.",
          options: CONSENT_OPTIONS,
        }),
      ],
    },
  ],
};

export const FORM_TEMPLATE_DEFAULTS: FormTemplateDefault[] = [
  RECRUITMENT,
  COMMITTEE_EVALUATION,
  PARTICIPANT_EVALUATION,
];

export function formTemplateFields(sections: FormSection[]): FormField[] {
  return sections.flatMap((s) => s.fields);
}

// Route publik untuk slug bawaan. Template buatan admin (slug lain) belum punya
// halaman publik sendiri - diakses internal dulu atau lewat short link.
export function formPublicPath(slug: string): string | null {
  switch (slug) {
    case "recruitment":
      return "/recruitment";
    case "evaluation-committee":
      return "/evaluation/committee";
    case "evaluation-participant":
      return "/evaluation/participant";
    default:
      return null;
  }
}
