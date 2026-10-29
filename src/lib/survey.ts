// Logika murni modul Formulir (formulir kustom buatan anggota kabinet / panitia acara):
// pemeriksaan jawaban, biodata, status buka-tutup, ringkasan hasil, dan dataset
// tabel/ekspor. Tanpa database dan tanpa @/auth, jadi aman diimpor dari klien dan
// bisa diuji langsung. Dokumentasi: docs/Formulir.md.
import type { SurveyBiodata } from "@/db/schema";
import { GRID_TYPES, type MembershipFieldDef, type MembershipFieldType } from "@/lib/membership-form";
import type { ReportColumn } from "@/lib/report-export";

export type SurveyFieldDef = Pick<MembershipFieldDef, "key" | "label" | "type" | "required" | "options" | "config">;

/** Baris form_fields -> definisi pertanyaan (opsi disimpan satu per baris di database). */
export function toFieldDef(r: {
  id: string;
  key: string;
  label: string;
  type: string;
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  options: string | null;
  config: unknown;
}): MembershipFieldDef {
  return {
    id: r.id,
    key: r.key,
    label: r.label,
    type: r.type as MembershipFieldType,
    placeholder: r.placeholder ?? undefined,
    helpText: r.helpText ?? undefined,
    required: r.required,
    options: r.options ? r.options.split(/\r?\n/).map((o) => o.trim()).filter(Boolean) : undefined,
    config: (r.config as MembershipFieldDef["config"]) ?? undefined,
    isCore: false,
  };
}

/**
 * Jenis pertanyaan yang tidak tersedia di formulir: unggahan berkas/gambar.
 * Pengisi publik tidak punya akun untuk mengunggah, dan berkas yang diunggah ke
 * form punya aturan akses sendiri (src/lib/private-file-access.ts) yang hanya
 * mengenal lamaran Oprek/Pemilu.
 */
export const SURVEY_BLOCKED_TYPES: MembershipFieldType[] = ["file", "image"];

export function isSurveyFieldType(type: string): boolean {
  return !(SURVEY_BLOCKED_TYPES as string[]).includes(type);
}

/**
 * Nama kolom jebakan bot di halaman isi. Sengaja bukan nama yang dikenali pengisi
 * otomatis browser (website, url, email, dst): kolom itu tidak boleh terisi oleh manusia.
 */
export const SURVEY_HONEYPOT_FIELD = "hp_ref";

export const SURVEY_TEXT_MAX = 500;
export const SURVEY_TEXTAREA_MAX = 5000;
export const SURVEY_BIODATA_MAX = 120;
export const SURVEY_TITLE_MAX = 150;
export const SURVEY_DESCRIPTION_MAX = 2000;
export const SURVEY_MESSAGE_MAX = 500;

// ---------- Status buka / tutup ----------

export type SurveyOpenState = "open" | "closed" | "not_yet" | "ended";

/**
 * Berbeda dari form Oprek (tanggal hanya informasi), formulir MENEGAKKAN
 * tanggalnya: isOpen adalah sakelar utama, lalu rentang tanggal (kalau diisi)
 * membatasi lagi. Dipakai halaman isi DAN aksi kirim.
 */
export function surveyOpenState(
  form: { isOpen: boolean; opensAt: Date | null; closesAt: Date | null },
  now: Date = new Date(),
): SurveyOpenState {
  if (!form.isOpen) return "closed";
  if (form.opensAt && now < form.opensAt) return "not_yet";
  if (form.closesAt && now > form.closesAt) return "ended";
  return "open";
}

export const SURVEY_STATE_LABEL: Record<SurveyOpenState, string> = {
  open: "Dibuka",
  closed: "Ditutup",
  not_yet: "Belum dibuka",
  ended: "Sudah berakhir",
};

// ---------- Pembersihan teks ----------

/** NUL tidak bisa disimpan di jsonb Postgres, dan karakter kontrol lain tak berguna di jawaban. */
export function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

function singleLine(value: string): string {
  return cleanText(value).replace(/\s+/g, " ");
}

// ---------- Pemeriksaan jawaban ----------

export type AnswerSource = {
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
};

export type ParsedAnswers = { answers: Record<string, unknown>; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_RE = /^[0-9+()\-.\s]{3,30}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function str(value: FormDataEntryValue | null | undefined): string {
  return typeof value === "string" ? value : "";
}

function isRealDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function scaleRange(config: SurveyFieldDef["config"]): { min: number; max: number } {
  const min = Number.isInteger(config?.min) ? (config!.min as number) : 1;
  const max = Number.isInteger(config?.max) ? (config!.max as number) : 5;
  // Konfigurasi terbalik/aneh dari builder jangan membuat pertanyaan mustahil dijawab.
  return max >= min ? { min, max } : { min: 1, max: 5 };
}

/**
 * Format isian untuk jenis yang bentuknya tetap. Satu sumber untuk server
 * (parseSurveyAnswers) DAN form di browser (form-renderer): form memakai
 * noValidate, jadi tanpa cek yang sama di klien, salah ketik email atau tanggal
 * baru ketahuan di server dan seluruh isian pengisi ikut terbuang.
 */
export function isValidFormat(type: string, raw: string): boolean {
  switch (type) {
    case "email":
      return raw.length <= 254 && EMAIL_RE.test(raw);
    case "tel":
      return TEL_RE.test(raw);
    case "url":
      return raw.length <= 2000 && isHttpUrl(raw);
    case "date":
      return isRealDate(raw);
    case "time":
      return TIME_RE.test(raw);
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) && Math.abs(n) <= 1e15;
    }
    default:
      return true;
  }
}

/** Batas panjang jawaban teks (atribut maxLength di browser dan cek di server). */
export function surveyMaxLength(type: string): number | undefined {
  return type === "textarea" ? SURVEY_TEXTAREA_MAX : type === "text" ? SURVEY_TEXT_MAX : undefined;
}

const REQUIRED = "Wajib diisi.";
const INVALID = "Jawabannya tidak valid.";

/**
 * Baca jawaban dari FormData dan periksa terhadap definisi pertanyaan: wajib,
 * pilihan harus salah satu opsi yang ada, rentang skala/angka, format
 * email/URL/tanggal, dan batas panjang. Kunci di luar daftar pertanyaan diabaikan.
 * Mengembalikan jawaban BERSIH (yang akan disimpan) dan galat per kunci.
 */
export function parseSurveyAnswers(fields: SurveyFieldDef[], src: AnswerSource): ParsedAnswers {
  const answers: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const f of fields) {
    if (f.type === "section" || !isSurveyFieldType(f.type)) continue;
    const options = f.options ?? [];

    if (GRID_TYPES.includes(f.type)) {
      const rows = f.config?.rows ?? [];
      const map: Record<string, string | string[]> = {};
      let missing = false;
      for (let i = 0; i < rows.length; i++) {
        const picked = [...new Set(src.getAll(`${f.key}::${i}`).map((e) => cleanText(str(e))).filter(Boolean))];
        if (picked.length === 0) {
          missing = true;
          continue;
        }
        if (!picked.every((p) => options.includes(p))) {
          errors[f.key] = INVALID;
          break;
        }
        map[String(i)] = f.type === "grid_checkbox" ? picked : picked[0];
      }
      if (errors[f.key]) continue;
      if (f.required && rows.length > 0 && missing) {
        errors[f.key] = REQUIRED;
        continue;
      }
      if (Object.keys(map).length > 0) answers[f.key] = map;
      continue;
    }

    if (f.type === "multiselect") {
      const picked = [...new Set(src.getAll(f.key).map((e) => cleanText(str(e))).filter(Boolean))];
      if (!picked.every((p) => options.includes(p))) {
        errors[f.key] = INVALID;
        continue;
      }
      if (f.required && picked.length === 0) {
        errors[f.key] = REQUIRED;
        continue;
      }
      if (picked.length > 0) answers[f.key] = picked;
      continue;
    }

    if (f.type === "checkbox") {
      const checked = str(src.get(f.key)) === "true";
      if (f.required && !checked) {
        errors[f.key] = REQUIRED;
        continue;
      }
      answers[f.key] = checked;
      continue;
    }

    const raw = f.type === "textarea" ? cleanText(str(src.get(f.key))) : singleLine(str(src.get(f.key)));
    if (!raw) {
      if (f.required) errors[f.key] = REQUIRED;
      continue;
    }

    switch (f.type) {
      case "select":
      case "radio":
        if (!options.includes(raw)) errors[f.key] = INVALID;
        else answers[f.key] = raw;
        break;
      case "rating":
      case "linear_scale": {
        const { min, max } = scaleRange(f.config);
        const n = Number(raw);
        if (!/^-?\d+$/.test(raw) || n < min || n > max) errors[f.key] = INVALID;
        else answers[f.key] = n;
        break;
      }
      case "number": {
        const n = Number(raw);
        const v = f.config?.validations;
        if (!isValidFormat("number", raw)) errors[f.key] = INVALID;
        else if ((v?.min != null && n < v.min) || (v?.max != null && n > v.max)) errors[f.key] = INVALID;
        else answers[f.key] = n;
        break;
      }
      case "email":
        if (!isValidFormat("email", raw)) errors[f.key] = INVALID;
        else answers[f.key] = raw;
        break;
      case "tel":
        if (!isValidFormat("tel", raw)) errors[f.key] = INVALID;
        else answers[f.key] = raw;
        break;
      case "url":
        if (!isValidFormat("url", raw)) errors[f.key] = INVALID;
        else answers[f.key] = raw;
        break;
      case "date":
        if (!isValidFormat("date", raw)) errors[f.key] = INVALID;
        else answers[f.key] = raw;
        break;
      case "time":
        if (!isValidFormat("time", raw)) errors[f.key] = INVALID;
        else answers[f.key] = raw;
        break;
      default: {
        // text, textarea
        const max = surveyMaxLength(f.type) ?? SURVEY_TEXT_MAX;
        const minLength = f.config?.validations?.minLength;
        if (raw.length > max) errors[f.key] = `Maksimal ${max} karakter.`;
        else if (typeof minLength === "number" && raw.length < minLength) errors[f.key] = `Minimal ${minLength} karakter.`;
        else answers[f.key] = raw;
      }
    }
  }

  return { answers, errors };
}

// ---------- Biodata ----------

export const SURVEY_BIODATA_SOURCE_LABEL: Record<string, string> = { sensus: "Sensus", manual: "Diisi sendiri" };

/** Biodata yang diisi pengisi sendiri. Nama wajib; kampus dan kota boleh kosong. */
export function parseManualBiodata(src: AnswerSource): { biodata: SurveyBiodata | null; error: string | null } {
  const fullName = singleLine(str(src.get("bio_fullName")));
  const university = singleLine(str(src.get("bio_university")));
  const city = singleLine(str(src.get("bio_city")));
  if (fullName.length < 2) return { biodata: null, error: "Nama lengkap wajib diisi." };
  if (fullName.length > SURVEY_BIODATA_MAX || university.length > SURVEY_BIODATA_MAX || city.length > SURVEY_BIODATA_MAX) {
    return { biodata: null, error: `Biodata maksimal ${SURVEY_BIODATA_MAX} karakter per isian.` };
  }
  return { biodata: { fullName, university, city }, error: null };
}

/**
 * Biodata dari sensus: HANYA tiga isian ini yang disalin. Paspor, telepon,
 * jenis kelamin, dan data pribadi lain di sensus tidak pernah ikut ke formulir.
 */
export function biodataFromSensus(row: {
  fullName: string | null;
  university: string | null;
  branch: string | null;
}): SurveyBiodata | null {
  const fullName = singleLine(row.fullName ?? "").slice(0, SURVEY_BIODATA_MAX);
  if (fullName.length < 2) return null;
  return {
    fullName,
    university: singleLine(row.university ?? "").slice(0, SURVEY_BIODATA_MAX),
    city: singleLine(row.branch ?? "").slice(0, SURVEY_BIODATA_MAX),
  };
}

// ---------- Ringkasan hasil ----------

export type ResultItem = { label: string; count: number };

export type QuestionResult =
  | { kind: "choice"; key: string; label: string; answered: number; items: ResultItem[] }
  | {
      kind: "scale";
      key: string;
      label: string;
      answered: number;
      average: number | null;
      items: ResultItem[];
    }
  | {
      kind: "number";
      key: string;
      label: string;
      answered: number;
      average: number | null;
      min: number | null;
      max: number | null;
    }
  | { kind: "text"; key: string; label: string; answered: number; samples: string[]; hasMore: boolean }
  | { kind: "grid"; key: string; label: string; answered: number; rows: { label: string; items: ResultItem[] }[] };

export type SurveyResponseLike = { answers: unknown; submittedAt: Date };

const TEXT_SAMPLE_LIMIT = 30;

function answerMap(answers: unknown): Record<string, unknown> {
  return answers && typeof answers === "object" && !Array.isArray(answers) ? (answers as Record<string, unknown>) : {};
}

function tally(counts: Map<string, number>, order?: string[]): ResultItem[] {
  const items = [...counts.entries()].map(([label, count]) => ({ label, count }));
  if (order) {
    // Urutan opsi seperti di builder; jawaban lama yang opsinya sudah dihapus di belakang.
    const rank = (l: string) => {
      const i = order.indexOf(l);
      return i < 0 ? order.length : i;
    };
    return items.sort((a, b) => rank(a.label) - rank(b.label) || b.count - a.count || a.label.localeCompare(b.label));
  }
  return items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function bump(counts: Map<string, number>, label: string) {
  counts.set(label, (counts.get(label) ?? 0) + 1);
}

/** Ringkasan per pertanyaan: hitung pilihan, rata-rata skala/angka, contoh jawaban teks, grid per baris. */
export function buildSurveyResults(fields: SurveyFieldDef[], responses: SurveyResponseLike[]): QuestionResult[] {
  const results: QuestionResult[] = [];
  // Terbaru dulu untuk contoh jawaban teks.
  const newestFirst = [...responses].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

  for (const f of fields) {
    if (f.type === "section" || !isSurveyFieldType(f.type)) continue;
    const options = f.options ?? [];
    const base = { key: f.key, label: f.label };

    if (GRID_TYPES.includes(f.type)) {
      const rowLabels = f.config?.rows ?? [];
      const perRow = rowLabels.map(() => new Map<string, number>());
      let answered = 0;
      for (const r of responses) {
        const map = answerMap(answerMap(r.answers)[f.key]);
        let any = false;
        rowLabels.forEach((_, i) => {
          const v = map[String(i)];
          const values = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
          for (const value of values) {
            bump(perRow[i], String(value));
            any = true;
          }
        });
        if (any) answered++;
      }
      results.push({
        kind: "grid",
        ...base,
        answered,
        rows: rowLabels.map((label, i) => ({ label, items: tally(perRow[i], options) })),
      });
      continue;
    }

    if (f.type === "select" || f.type === "radio" || f.type === "multiselect" || f.type === "checkbox") {
      const counts = new Map<string, number>();
      let answered = 0;
      for (const r of responses) {
        const v = answerMap(r.answers)[f.key];
        if (f.type === "multiselect") {
          if (Array.isArray(v) && v.length > 0) {
            answered++;
            for (const o of v) bump(counts, String(o));
          }
        } else if (f.type === "checkbox") {
          if (typeof v === "boolean") {
            answered++;
            bump(counts, v ? "Ya" : "Tidak");
          }
        } else if (typeof v === "string" && v) {
          answered++;
          bump(counts, v);
        }
      }
      results.push({
        kind: "choice",
        ...base,
        answered,
        items: tally(counts, f.type === "checkbox" ? ["Ya", "Tidak"] : options),
      });
      continue;
    }

    if (f.type === "rating" || f.type === "linear_scale") {
      const { min, max } = scaleRange(f.config);
      const counts = new Map<string, number>();
      for (let n = min; n <= max; n++) counts.set(String(n), 0);
      let sum = 0;
      let answered = 0;
      for (const r of responses) {
        const v = answerMap(r.answers)[f.key];
        if (typeof v === "number" && Number.isFinite(v)) {
          answered++;
          sum += v;
          bump(counts, String(v));
        }
      }
      // Skala ditampilkan penuh (termasuk nilai yang tidak dipilih siapa pun), urut naik.
      const items = [...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => Number(a.label) - Number(b.label));
      results.push({ kind: "scale", ...base, answered, average: answered ? sum / answered : null, items });
      continue;
    }

    if (f.type === "number") {
      const nums: number[] = [];
      for (const r of responses) {
        const v = answerMap(r.answers)[f.key];
        if (typeof v === "number" && Number.isFinite(v)) nums.push(v);
      }
      results.push({
        kind: "number",
        ...base,
        answered: nums.length,
        average: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null,
        min: nums.length ? Math.min(...nums) : null,
        max: nums.length ? Math.max(...nums) : null,
      });
      continue;
    }

    // text, textarea, email, tel, url, date, time: contoh jawaban terbaru.
    const texts: string[] = [];
    for (const r of newestFirst) {
      const v = answerMap(r.answers)[f.key];
      if (typeof v === "string" && v) texts.push(v);
    }
    results.push({
      kind: "text",
      ...base,
      answered: texts.length,
      samples: texts.slice(0, TEXT_SAMPLE_LIMIT),
      hasMore: texts.length > TEXT_SAMPLE_LIMIT,
    });
  }

  return results;
}

// ---------- Dataset tabel / ekspor ----------

export type SurveyDatasetResponse = {
  submittedAt: Date;
  answers: unknown;
  biodata: SurveyBiodata | null;
  biodataSource: string | null;
};

function cellText(f: SurveyFieldDef, v: unknown): string | number {
  if (v == null) return "";
  if (f.type === "checkbox") return v === true ? "Ya" : v === false ? "Tidak" : "";
  if (f.type === "rating" || f.type === "linear_scale" || f.type === "number") return typeof v === "number" ? v : "";
  if (Array.isArray(v)) return v.map(String).join(", ");
  return typeof v === "string" ? v : "";
}

/**
 * Kolom + baris formulir: SATU sumber untuk tabel di layar dan berkas CSV/Excel,
 * supaya keduanya selalu sama. Kolom biodata hanya ada kalau formulir memintanya.
 * Identitas akun (user_id) tidak pernah masuk ke sini.
 */
export function buildSurveyDataset(input: {
  fields: SurveyFieldDef[];
  responses: SurveyDatasetResponse[];
  collectBiodata: boolean;
}): { columns: ReportColumn[]; rows: Record<string, unknown>[] } {
  const { fields, responses, collectBiodata } = input;
  const questions = fields.filter((f) => f.type !== "section" && isSurveyFieldType(f.type));

  const columns: ReportColumn[] = [
    { header: "No", key: "no", type: "number" },
    { header: "Waktu", key: "submittedAt", type: "date" },
    ...(collectBiodata
      ? [
          { header: "Nama", key: "bioName" },
          { header: "Universitas / instansi", key: "bioUniversity" },
          { header: "Kota", key: "bioCity" },
          { header: "Sumber biodata", key: "bioSource" },
        ]
      : []),
  ];
  for (const f of questions) {
    if (GRID_TYPES.includes(f.type)) {
      (f.config?.rows ?? []).forEach((rowLabel, i) => {
        columns.push({ header: `${f.label} — ${rowLabel}`, key: `${f.key}::${i}` });
      });
    } else {
      const numeric = f.type === "rating" || f.type === "linear_scale" || f.type === "number";
      columns.push({ header: f.label, key: `q_${f.key}`, ...(numeric ? { type: "number" as const } : {}) });
    }
  }

  const sorted = [...responses].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  const rows = sorted.map((r, index) => {
    const answers = answerMap(r.answers);
    const row: Record<string, unknown> = { no: index + 1, submittedAt: r.submittedAt };
    if (collectBiodata) {
      row.bioName = r.biodata?.fullName ?? "";
      row.bioUniversity = r.biodata?.university ?? "";
      row.bioCity = r.biodata?.city ?? "";
      row.bioSource = r.biodataSource ? (SURVEY_BIODATA_SOURCE_LABEL[r.biodataSource] ?? r.biodataSource) : "";
    }
    for (const f of questions) {
      if (GRID_TYPES.includes(f.type)) {
        const map = answerMap(answers[f.key]);
        (f.config?.rows ?? []).forEach((_, i) => {
          const v = map[String(i)];
          row[`${f.key}::${i}`] = Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "";
        });
      } else {
        row[`q_${f.key}`] = cellText(f, answers[f.key]);
      }
    }
    return row;
  });

  return { columns, rows };
}
