export type MembershipFieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "number"
  | "select"
  | "radio"
  | "multiselect"
  | "date"
  | "checkbox"
  | "rating"
  | "image"
  | "url"
  | "section"
  | "time"
  | "linear_scale";

export interface RatingConfig {
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
  validations?: { min?: number; max?: number; minLength?: number };
}

export interface MembershipFieldDef {
  id?: string;
  key: string;
  label: string;
  type: MembershipFieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[]; // for select / radio / multiselect, one entry per line
  config?: RatingConfig;
  isCore: boolean;
}

// Human-friendly labels for each field type (used in the admin builder).
export const FIELD_TYPE_LABELS: Record<MembershipFieldType, string> = {
  text: "Teks Pendek",
  textarea: "Teks Panjang / Paragraf",
  email: "Email",
  tel: "Telepon / WhatsApp",
  number: "Angka",
  select: "Dropdown (pilih satu)",
  radio: "Pilihan (radio, pilih satu)",
  multiselect: "Kotak Centang (pilih banyak)",
  date: "Tanggal",
  checkbox: "Centang Ya/Tidak",
  rating: "Skala / Rating",
  image: "Unggah Gambar",
  url: "Tautan (URL)",
  section: "Bagian / Judul Tahap",
  time: "Waktu",
  linear_scale: "Skala Linier",
};

// A section is a heading/divider with no input — it groups the questions that
// follow it until the next section.
export function isSectionType(type: MembershipFieldType): boolean {
  return type === "section";
}

// Types whose answers come from a fixed list of options.
export const OPTION_TYPES: MembershipFieldType[] = ["select", "radio", "multiselect"];

// Types rendered as a scale the user rates.
export const SCALE_TYPES: MembershipFieldType[] = ["rating", "linear_scale"];

// Stable keys that map onto membership_applications' structured columns.
export const CORE_KEYS = {
  fullName: "fullName",
  email: "email",
  whatsapp: "whatsapp",
  university: "university",
  major: "major",
  expectedGraduation: "expectedGraduation",
  divisionInterest: "divisionInterest",
  motivation: "motivation",
  commitment: "commitment",
} as const;

// Shipped as the initial form so /join-us is never empty; admin can edit these
// from /console/membership/form (labels/types/required/order) and add more.
export const DEFAULT_FIELDS: MembershipFieldDef[] = [
  { key: CORE_KEYS.fullName, label: "Nama Lengkap", type: "text", required: true, isCore: true },
  { key: CORE_KEYS.email, label: "Email", type: "email", required: true, isCore: true },
  { key: CORE_KEYS.whatsapp, label: "WhatsApp", type: "tel", required: true, isCore: true },
  { key: CORE_KEYS.university, label: "Universitas", type: "text", required: false, isCore: true },
  { key: CORE_KEYS.major, label: "Jurusan / Program Studi", type: "text", required: false, isCore: true },
  {
    key: CORE_KEYS.expectedGraduation,
    label: "Perkiraan Lulus (mis. Juni 2027)",
    type: "text",
    required: false,
    isCore: true,
  },
  {
    key: CORE_KEYS.divisionInterest,
    label: "Minat Divisi",
    type: "text",
    placeholder: "mis. Hubungan Masyarakat, Teknologi, Logistik",
    required: false,
    isCore: true,
  },
  { key: CORE_KEYS.motivation, label: "Motivasi Bergabung", type: "textarea", required: false, isCore: true },
  {
    key: CORE_KEYS.commitment,
    label: "Komitmen (kesiapan mengikuti kegiatan)",
    type: "textarea",
    required: false,
    isCore: true,
  },
];

// ---- Question bank (referensi pertanyaan siap pakai) ----
// Admin can drop these into the form with one click, like a Google Forms
// question bank. Grouped by theme so it's easy to scan for "variasi".
export interface QuestionTemplate {
  key: string; // unique template id
  label: string;
  type: MembershipFieldType;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: string[];
  config?: RatingConfig;
}

export interface QuestionCategory {
  title: string;
  templates: QuestionTemplate[];
}

export const QUESTION_BANK: QuestionCategory[] = [
  {
    title: "Data Diri",
    templates: [
      { key: "nickname", label: "Nama Panggilan", type: "text", placeholder: "mis. Adi" },
      { key: "birthPlace", label: "Tempat Lahir", type: "text" },
      { key: "birthDate", label: "Tanggal Lahir", type: "date" },
      {
        key: "gender",
        label: "Jenis Kelamin",
        type: "radio",
        options: ["Laki-laki", "Perempuan", "Lainnya"],
        required: true,
      },
      { key: "addressChina", label: "Alamat di Tiongkok", type: "text", placeholder: "Nama jalan / apartemen" },
      { key: "originCity", label: "Kota Asal di Indonesia", type: "text" },
    ],
  },
  {
    title: "Pendidikan",
    templates: [
      { key: "gpa", label: "IPK (GPA)", type: "number", placeholder: "mis. 3.75" },
      { key: "semester", label: "Semester Saat Ini", type: "number", placeholder: "mis. 6" },
      { key: "studentId", label: "NIM / Nomor Mahasiswa", type: "text" },
      { key: "thesisTopic", label: "Topik Skripsi / Penelitian", type: "textarea" },
      {
        key: "studyLang",
        label: "Bahasa Pengantar Kuliah",
        type: "multiselect",
        options: ["Indonesia", "Inggris", "Mandarin", "Lainnya"],
      },
    ],
  },
  {
    title: "Motivasi & Komitmen",
    templates: [
      { key: "whyJoin", label: "Alasan ingin bergabung dengan PPIT Nanjing", type: "textarea", required: true },
      { key: "orgExp", label: "Pengalaman Organisasi Sebelumnya", type: "textarea" },
      { key: "expectation", label: "Ekspektasi setelah menjadi anggota", type: "textarea" },
      { key: "strengthWeak", label: "Kekuatan & kelemahan utama", type: "textarea" },
      {
        key: "commitLevel",
        label: "Sejauh mana komitmen Anda?",
        type: "rating",
        config: { min: 1, max: 5, lowLabel: "Ragu", highLabel: "Sangat siap" },
      },
    ],
  },
  {
    title: "Keahlian & Portofolio",
    templates: [
      {
        key: "skills",
        label: "Skill / Keahlian yang dimiliki",
        type: "multiselect",
        options: ["Desain", "Menulis", "Fotografi", "Video", "Public Speaking", "Programming", "Bahasa Asing", "Event Organizing"],
      },
      { key: "portfolioUrl", label: "Tautan Portofolio", type: "url", placeholder: "https://" },
      { key: "cvUrl", label: "Unggah CV (tautan gambar/PDF)", type: "url", placeholder: "https://" },
      { key: "certUpload", label: "Sertifikat (unggah gambar)", type: "image" },
      { key: "socialMedia", label: "Media Sosial aktif", type: "url", placeholder: "https://instagram.com/..." },
    ],
  },
  {
    title: "Preferensi & Ketersediaan",
    templates: [
      {
        key: "divisionChoice",
        label: "Pilihan Divisi (urutan prioritas)",
        type: "multiselect",
        options: ["Hubungan Masyarakat", "Teknologi", "Logistik", "Acara", "Media & Kreatif", "Sosial & Lingkungan"],
      },
      {
        key: "availability",
        label: "Ketersediaan waktu",
        type: "radio",
        options: ["Sangat fleksibel", "Weekend saja", "Weekday malam", "Terbatas"],
        required: true,
      },
      { key: "hasDevice", label: "Memiliki laptop sendiri untuk kegiatan?", type: "checkbox" },
      {
        key: "interestRating",
        label: "Seberapa tertarik dengan kegiatan PPIT?",
        type: "rating",
        config: { min: 1, max: 5, lowLabel: "Kurang", highLabel: "Sangat" },
      },
      { key: "joinReason", label: "Rekomendasi dari siapa (opsional)", type: "text" },
    ],
  },
  {
    title: "Lainnya",
    templates: [
      { key: "allergy", label: "Alergi / catatan kesehatan", type: "textarea" },
      { key: "emergencyContact", label: "Kontak darurat (nama & nomor)", type: "tel" },
      { key: "dietary", label: "Preferensi makanan", type: "select", options: ["Biasa", "Vegetarian", "Halal saja", "Lainnya"] },
      { key: "suggestion", label: "Saran untuk PPIT Nanjing", type: "textarea" },
    ],
  },
];

// Flat lookup by template key, used by the server action that inserts a bank
// question into the live form.
export const QUESTION_BY_KEY: Record<string, QuestionTemplate> = Object.fromEntries(
  QUESTION_BANK.flatMap((c) => c.templates).map((t) => [t.key, t])
);
