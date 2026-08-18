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
  | "linear_scale"
  | "grid_radio"
  | "grid_checkbox"
  | "file";

export interface RatingConfig {
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
  rows?: string[];
  // Quiz mode: point value + correct answer key for auto-scored questions.
  points?: number;
  answerKey?: string;
  // Inline image shown alongside the question (Google Forms "add image").
  imageUrl?: string;
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
  grid_radio: "Kisi Pilihan Ganda",
  grid_checkbox: "Petak Kotak Centang",
  file: "Unggah Berkas",
};

// Grid question types (rows × columns). `grid_radio` = one choice per row,
// `grid_checkbox` = multiple choices per row.
export const GRID_TYPES: MembershipFieldType[] = ["grid_radio", "grid_checkbox"];

// A section is a heading/divider with no input — it groups the questions that
// follow it until the next section.
export function isSectionType(type: MembershipFieldType): boolean {
  return type === "section";
}

// Types whose answers come from a fixed list of options.
export const OPTION_TYPES: MembershipFieldType[] = ["select", "radio", "multiselect"];

// Types rendered as a scale the user rates.
export const SCALE_TYPES: MembershipFieldType[] = ["rating", "linear_scale"];

// Types whose answer is picked from `options` — the quiz answer key can be
// built from that same list instead of typed by hand.
export const CHOICE_TYPES: MembershipFieldType[] = ["select", "radio", "multiselect"];

// --- Quiz scoring -----------------------------------------------------------
// An answer key lives in `config.answerKey` in the same shape the respondent's
// answer is stored in, so grading is just a normalised comparison:
//   select / radio / text / …  → plain string
//   multiselect               → comma-separated options (order-insensitive)
//   checkbox                  → "true" / "false"
//   grid_radio                → JSON { rowIndex: column }
//   grid_checkbox             → JSON { rowIndex: [columns] }

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

function sameSet(a: unknown, b: unknown): boolean {
  const x = (Array.isArray(a) ? a : []).map(norm).filter(Boolean).sort();
  const y = (Array.isArray(b) ? b : []).map(norm).filter(Boolean).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

function parseKeyObject(key: string): Record<string, unknown> {
  try {
    const o = JSON.parse(key);
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// True when a stored answer matches the question's answer key. A missing or
// blank key means the question is not auto-graded.
export function isCorrectAnswer(f: MembershipFieldDef, raw: unknown): boolean {
  const key = f.config?.answerKey;
  if (!key || !key.trim()) return false;

  if (f.type === "multiselect") {
    return sameSet(raw, key.split(",").map((s) => s.trim()).filter(Boolean));
  }

  if (GRID_TYPES.includes(f.type)) {
    const expected = parseKeyObject(key);
    const rowKeys = Object.keys(expected);
    if (rowKeys.length === 0) return false;
    const given = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    return rowKeys.every((r) =>
      f.type === "grid_checkbox" ? sameSet(given[r], expected[r]) : norm(given[r]) === norm(expected[r]),
    );
  }

  return norm(raw) === norm(key);
}

// Points earned vs. points available. Only questions carrying a point value
// count toward the maximum, so a partially-keyed quiz still scores sensibly.
export function scoreApplication(
  responses: Record<string, unknown>,
  fields: MembershipFieldDef[],
): { score: number; max: number } {
  let score = 0;
  let max = 0;
  for (const f of fields) {
    const pts = f.config?.points;
    if (isSectionType(f.type) || !pts || pts <= 0) continue;
    max += pts;
    if (isCorrectAnswer(f, responses[f.key])) score += pts;
  }
  return { score, max };
}

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

// The only two questions that genuinely cannot be removed: membership_applications
// .full_name and .email are NOT NULL and every submission is keyed on them. Every
// other core field maps to a nullable column, so admins may delete it like any
// custom question.
export const LOCKED_FIELD_KEYS: string[] = [CORE_KEYS.fullName, CORE_KEYS.email];

export function canDeleteField(key: string): boolean {
  return !LOCKED_FIELD_KEYS.includes(key);
}

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
  // For rating/scale: { min, max, lowLabel, highLabel }.
  // For grid types: also include `rows` (the grid's row labels).
  config?: RatingConfig & { rows?: string[] };
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
      { key: "cvUploadFile", label: "Unggah CV (berkas PDF/Dokumen)", type: "file" },
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
  {
    title: "Kisi / Grid",
    templates: [
      {
        key: "availabilityGrid",
        label: "Ketersediaan Waktu untuk Rapat Rutin",
        type: "grid_checkbox",
        helpText: "Centang kolom waktu yang kamu bisa untuk tiap hari.",
        options: ["Pagi", "Siang", "Sore"],
        config: { rows: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] },
      },
      {
        key: "interestGrid",
        label: "Tingkat minat pada tiap divisi",
        type: "grid_radio",
        helpText: "Pilih satu untuk tiap divisi.",
        options: ["Tidak tertarik", "Cukup", "Sangat tertarik"],
        config: { rows: ["Hubungan Masyarakat", "Kesenian dan Olahraga", "Pendidikan dan Litbang", "Kerohanian", "Logistik dan Perlengkapan", "Media dan Kreatif"] },
      },
    ],
  },
];

// Flat lookup by template key, used by the server action that inserts a bank
// question into the live form.
export const QUESTION_BY_KEY: Record<string, QuestionTemplate> = Object.fromEntries(
  QUESTION_BANK.flatMap((c) => c.templates).map((t) => [t.key, t])
);
