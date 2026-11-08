import { formatChinaDateTimeIso, timeHeader } from "@/lib/datetime";
import { amountForTier, feeTierAt } from "@/lib/event-fee";
import { effectiveBranch } from "@/lib/membership-status";

// Kolom + baris ekspor pendaftar acara (murni, tanpa database), SATU sumber untuk file CSV
// (/api/console/events/[id]/registrations/export) dan Google Sheet. Kolom data
// pribadi ditandai `sensitive` supaya Google Sheet bisa membuangnya tanpa
// mengubah isi CSV.

export const REGISTRATION_STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  attended: "Hadir",
  cancelled: "Dibatalkan",
};

type BiodataKey =
  | "fullName"
  | "passportNumber"
  | "wechatId"
  | "chinaPhone"
  | "branch"
  | "university"
  | "major"
  | "entryYear"
  | "studentProofUrl";

const BIODATA_COLS: { key: BiodataKey; label: string; sensitive?: boolean }[] = [
  { key: "fullName", label: "Nama Lengkap" },
  { key: "passportNumber", label: "Nomor Paspor", sensitive: true },
  { key: "wechatId", label: "WeChat ID" },
  { key: "chinaPhone", label: "No. Telpon China", sensitive: true },
  { key: "branch", label: "Kota / Ranting" },
  { key: "university", label: "Universitas" },
  { key: "major", label: "Jurusan" },
  { key: "entryYear", label: "Tahun Angkatan" },
  { key: "studentProofUrl", label: "Bukti Mahasiswa Aktif", sensitive: true },
];

export type RegistrationExportRow = {
  name: string | null;
  email: string | null;
  status: string;
  registeredAt: Date | string;
  branch: string | null;
  answersJson: Record<string, unknown> | null;
  feeOptionId: string | null;
  biodataJson: Partial<Record<BiodataKey, string>> | null;
  sensusBranch: string | null;
  sensusCompletion: string | null;
  sensusUniversity: string | null;
  sensusWechat: string | null;
};

export type RegistrationExportInput = {
  rows: RegistrationExportRow[];
  questions: { id: string; label: string }[];
  feeOptions: { id: string; label: string; amountCny: number; earlyBirdAmountCny: number | null }[];
  earlyBirdUntil: Date | null;
  /** Path unggahan relatif (/api/...) dijadikan URL penuh supaya bisa diklik di luar situs. */
  origin: string;
};

export type RegistrationExport = {
  header: { label: string; sensitive: boolean }[];
  /** Nilai mentah per sel; ubah jadi teks lewat exportCellText(). */
  lines: unknown[][];
};

/** Nilai sel ekspor sebagai teks: larik digabung ", ", objek jadi JSON. */
export function exportCellText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function buildRegistrationExport(input: RegistrationExportInput): RegistrationExport {
  const { rows, questions, feeOptions, earlyBirdUntil, origin } = input;
  const absUrl = (v: unknown) => (typeof v === "string" && v.startsWith("/api/") ? origin + v : v);

  const feeOptionById = new Map(feeOptions.map((o) => [o.id, o]));
  // Label kategori per pendaftaran: nominal efektif = tahap (early bird / normal)
  // yang berlaku saat dia mendaftar.
  const feeLabelFor = (feeOptionId: string | null, registeredAt: Date | string): string => {
    if (!feeOptionId) return "";
    const o = feeOptionById.get(feeOptionId);
    if (!o) return "";
    const tier = feeTierAt(earlyBirdUntil, new Date(registeredAt));
    const eff = amountForTier(tier, o.amountCny, o.earlyBirdAmountCny);
    const earlyBird = tier === "early_bird" && o.earlyBirdAmountCny != null;
    return `${o.label} (¥${eff}${earlyBird ? " early bird" : ""})`;
  };
  const anyFee = feeOptions.length > 0;
  const anyBiodata = rows.some((r) => r.biodataJson);

  const header: RegistrationExport["header"] = [
    { label: "Nama", sensitive: false },
    { label: "Email", sensitive: false },
    { label: "Status", sensitive: false },
    { label: timeHeader("Waktu Daftar"), sensitive: false },
    { label: "Cabang", sensitive: false },
    // Acara tanpa blok biodata tetap punya kampus & WeChat dari sensus.
    ...(anyBiodata
      ? []
      : [
          { label: "Kampus", sensitive: false },
          { label: "WeChat ID", sensitive: false },
        ]),
    ...(anyFee ? [{ label: "Kategori Tarif", sensitive: false }] : []),
    ...(anyBiodata ? BIODATA_COLS.map((c) => ({ label: c.label, sensitive: Boolean(c.sensitive) })) : []),
    ...questions.map((q) => ({ label: q.label, sensitive: false })),
  ];

  const lines = rows.map((r) => {
    const answers = r.answersJson ?? {};
    const bio = r.biodataJson;
    return [
      r.name ?? "",
      r.email ?? "",
      REGISTRATION_STATUS_LABEL[r.status] ?? r.status,
      // ISO date-time in China time - locale-formatted dates ("10 Agu 2026") break Excel parsing.
      formatChinaDateTimeIso(new Date(r.registeredAt)),
      effectiveBranch(r.sensusCompletion === "complete" ? r.sensusBranch : null, r.branch) ?? "",
      ...(anyBiodata ? [] : [r.sensusUniversity ?? "", r.sensusWechat ?? ""]),
      ...(anyFee ? [feeLabelFor(r.feeOptionId, r.registeredAt)] : []),
      ...(anyBiodata ? BIODATA_COLS.map((c) => absUrl(bio?.[c.key]) ?? "") : []),
      ...questions.map((q) => {
        const v = answers[q.id];
        return Array.isArray(v) ? v.join(", ") : absUrl(v);
      }),
    ];
  });

  return { header, lines };
}
