import type { MembershipFieldDef } from "@/lib/membership-form";

// Analitik per formulir (pemilu/oprek): agregasi murni tanpa server import,
// dipakai halaman kelola form. Pola yang sama dengan sensus-analytics.ts.

export type AnalyticsItem = { label: string; count: number };

export type FormAnalytics = {
  total: number;
  accepted: number;
  pending: number;
  rejected: number;
  statusItems: AnalyticsItem[];
  positionItems: AnalyticsItem[];
  choice1Items: AnalyticsItem[];
  choice2Items: AnalyticsItem[];
  questionItems: { label: string; items: AnalyticsItem[] }[];
};

const ACCEPTED = ["accepted", "accepted_choice1", "accepted_choice2", "reassigned"];
// Tipe pertanyaan yang diringkas di analitik (pilihan). Teks bebas tidak
// diringkas — lihat ekspor CSV/Excel untuk jawaban lengkap.
const CHOICE_ANALYTICS_TYPES = ["select", "radio", "multiselect", "checkbox"];

function sortItems<T extends { label: string; count: number }>(items: T[]): T[] {
  return items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildFormAnalytics({
  applications,
  fields,
  divisionNameById,
  statusLabel,
  roleLabel,
}: {
  applications: {
    status: string;
    positionApplied: string | null;
    choice1DivisionId: string | null;
    choice2DivisionId: string | null;
    responses: unknown;
  }[];
  fields: Pick<MembershipFieldDef, "key" | "label" | "type">[];
  divisionNameById: Map<string, string>;
  statusLabel: (status: string) => string;
  roleLabel: (role: string) => string;
}): FormAnalytics {
  const total = applications.length;

  const statusCounts = new Map<string, number>();
  for (const app of applications) {
    statusCounts.set(app.status, (statusCounts.get(app.status) ?? 0) + 1);
  }
  const statusItems = sortItems(
    [...statusCounts.entries()].map(([status, count]) => ({ label: statusLabel(status), count })),
  );

  const positionCounts = new Map<string, number>();
  for (const app of applications) {
    if (app.positionApplied) {
      positionCounts.set(app.positionApplied, (positionCounts.get(app.positionApplied) ?? 0) + 1);
    }
  }
  const positionItems = sortItems(
    [...positionCounts.entries()].map(([role, count]) => ({ label: roleLabel(role), count })),
  );

  const choiceItems = (key: "choice1DivisionId" | "choice2DivisionId") => {
    const counts = new Map<string, number>();
    for (const app of applications) {
      const id = app[key];
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return sortItems(
      [...counts.entries()].map(([id, count]) => ({ label: divisionNameById.get(id) ?? "(divisi dihapus)", count })),
    );
  };

  const questionItems = fields
    .filter((f) => CHOICE_ANALYTICS_TYPES.includes(f.type))
    .map((f) => {
      const counts = new Map<string, number>();
      for (const app of applications) {
        const responses = (app.responses ?? {}) as Record<string, unknown>;
        const value = responses[f.key];
        if (f.type === "multiselect") {
          if (Array.isArray(value)) {
            for (const opt of value) counts.set(String(opt), (counts.get(String(opt)) ?? 0) + 1);
          }
        } else if (f.type === "checkbox") {
          if (value === true || value === "true") counts.set("Ya", (counts.get("Ya") ?? 0) + 1);
          else if (value === false || value === "false") counts.set("Tidak", (counts.get("Tidak") ?? 0) + 1);
        } else if (typeof value === "string" && value.trim()) {
          counts.set(value.trim(), (counts.get(value.trim()) ?? 0) + 1);
        }
      }
      return {
        label: f.label,
        items: sortItems([...counts.entries()].map(([label, count]) => ({ label, count }))),
      };
    });

  return {
    total,
    accepted: applications.filter((a) => ACCEPTED.includes(a.status)).length,
    pending: applications.filter((a) => a.status === "pending").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
    statusItems,
    positionItems,
    choice1Items: choiceItems("choice1DivisionId"),
    choice2Items: choiceItems("choice2DivisionId"),
    questionItems,
  };
}
