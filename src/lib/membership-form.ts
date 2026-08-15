export type MembershipFieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "number"
  | "select"
  | "date";

export interface MembershipFieldDef {
  id?: string;
  key: string;
  label: string;
  type: MembershipFieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[]; // for select only, one entry per line
  isCore: boolean;
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
