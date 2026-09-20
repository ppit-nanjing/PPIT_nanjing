// Per-question response summaries for /console/sensus's Analitik tab -
// aggregation only, no DB access, so it's easy to feed real rows in a test
// or a repro without touching Drizzle. Mirrors Google Forms' own "Ringkasan"
// view: one card per question, in the same order as the sensus form itself
// (src/components/sensus/sensus-wizard.tsx), skipping anything free-text or
// personally identifying - the admin already sees that in the full list/
// export, and a chart of unique names or passport numbers isn't a summary.
import { tally } from "@/components/console/summary-list";
import { MEMBERSHIP_LABEL, membershipStatus } from "@/lib/membership-status";

type SensusRow = {
  gender: string | null;
  province: string | null;
  branch: string | null;
  studentStatus: string | null;
  university: string | null;
  degreeLevel: string | null;
  mediumOfInstruction: string | null;
  mandarinAbility: string | null;
  fundingSource: string | null;
  entryYear: number | null;
  graduationYear: number | null;
  subscribeNewsletter: boolean;
  completionStatus: string;
};

export interface AnalyticsQuestion {
  key: string;
  title: string;
  kind: "donut" | "bar";
  totalResponses: number;
  items: { label: string; count: number }[];
}

// HSK 1-9 then "Belum ada" - the order students actually progress through,
// not alphabetical/count order (a bar chart of this reads as nonsense
// shuffled by frequency instead of by level).
const MANDARIN_ORDER = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6", "HSK 7", "HSK 8", "HSK 9", "Belum ada"];

function orderedTally(values: (string | null | undefined)[], order: string[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v?.trim() || "Tidak diisi";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const known = order.filter((label) => counts.has(label)).map((label) => ({ label, count: counts.get(label)! }));
  const unknown = [...counts.entries()]
    .filter(([label]) => !order.includes(label))
    .map(([label, count]) => ({ label, count }));
  return [...known, ...unknown];
}

function yearTally(values: (number | null)[]): { label: string; count: number }[] {
  const counts = new Map<number, number>();
  let missing = 0;
  for (const v of values) {
    if (v == null) missing++;
    else counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ label: String(year), count }));
  if (missing > 0) rows.push({ label: "Tidak diisi", count: missing });
  return rows;
}

export function buildSensusAnalytics(rows: SensusRow[]): AnalyticsQuestion[] {
  const total = rows.length;
  const q = (key: string, title: string, kind: "donut" | "bar", items: { label: string; count: number }[]): AnalyticsQuestion => ({
    key,
    title,
    kind,
    totalResponses: total,
    items,
  });

  return [
    q("gender", "Jenis Kelamin", "donut", tally(rows.map((r) => r.gender))),
    q("province", "Provinsi Asal", "bar", tally(rows.map((r) => r.province))),
    q("branch", "Asal Kota", "bar", tally(rows.map((r) => r.branch))),
    q("studentStatus", "Status Mahasiswa", "donut", tally(rows.map((r) => r.studentStatus))),
    q("university", "Universitas", "bar", tally(rows.map((r) => r.university))),
    q("degreeLevel", "Jenjang", "donut", tally(rows.map((r) => r.degreeLevel))),
    q("mediumOfInstruction", "Bahasa Pengantar Kuliah", "donut", tally(rows.map((r) => r.mediumOfInstruction))),
    q("mandarinAbility", "Kemampuan Mandarin (HSK)", "bar", orderedTally(rows.map((r) => r.mandarinAbility), MANDARIN_ORDER)),
    q("fundingSource", "Sumber Dana", "donut", tally(rows.map((r) => r.fundingSource))),
    q("entryYear", "Tahun Masuk", "bar", yearTally(rows.map((r) => r.entryYear))),
    q("graduationYear", "Perkiraan Tahun Lulus", "bar", yearTally(rows.map((r) => r.graduationYear))),
    q(
      "membershipStatus",
      "Status Keanggotaan",
      "donut",
      tally(rows.map((r) => MEMBERSHIP_LABEL[membershipStatus(r)])),
    ),
    q("completionStatus", "Kelengkapan Sensus", "donut", tally(rows.map((r) => (r.completionStatus === "complete" ? "Lengkap" : "Belum lengkap")))),
    q(
      "subscribeNewsletter",
      "Berlangganan Newsletter",
      "donut",
      tally(rows.map((r) => (r.subscribeNewsletter ? "Ya" : "Tidak"))),
    ),
  ];
}
