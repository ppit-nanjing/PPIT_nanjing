import { desc } from "drizzle-orm";
import { db } from "@/db";
import { membershipApplications, membershipFormFields } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { auth } from "@/auth";
import { asc } from "drizzle-orm";

function csvCell(value: unknown): string {
  let s: string;
  if (value == null) s = "";
  else if (Array.isArray(value)) s = value.join(", ");
  else if (typeof value === "object") s = JSON.stringify(value);
  else s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  await auth();
  await requireModuleAccess("membership");
  const [apps, fields] = await Promise.all([
    db.select().from(membershipApplications).orderBy(desc(membershipApplications.submittedAt)),
    db.select().from(membershipFormFields).orderBy(asc(membershipFormFields.orderIndex)),
  ]);

  const answerFields = fields.filter((f) => f.type !== "section");
  const isGrid = (t: string) => t === "grid_radio" || t === "grid_checkbox";
  // `config` is jsonb, so narrow it before reading the grid row labels.
  const gridRows = (f: (typeof fields)[number]): string[] => {
    const rows = (f.config as { rows?: unknown } | null)?.rows;
    return Array.isArray(rows) ? rows.map(String) : [];
  };

  // Grid questions expand into one column per row so the CSV stays flat/readable.
  const header = [
    "Nama Lengkap",
    "Email",
    "Universitas",
    "Jurusan",
    "WhatsApp",
    "Status",
    "Tanggal Kirim",
    ...answerFields.flatMap((f) =>
      isGrid(f.type) ? gridRows(f).map((r) => `${f.label} — ${r}`) : [f.label],
    ),
  ];

  const lines = [header.map(csvCell).join(",")];
  for (const app of apps) {
    const responses = (app.responses ?? {}) as Record<string, unknown>;
    const row = [
      app.fullName,
      app.email,
      app.university,
      app.major,
      app.whatsapp,
      app.status,
      app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "",
      ...answerFields.flatMap((f) => {
        if (isGrid(f.type)) {
          const raw = responses[f.key ?? ""];
          const map = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
          return gridRows(f).map((_, i) => {
            const ans = map[String(i)];
            return Array.isArray(ans) ? ans.join(", ") : ans ? String(ans) : "";
          });
        }
        return [csvCell(responses[f.key ?? ""])];
      }),
    ];
    lines.push(row.map(csvCell).join(","));
  }

  const csv = "﻿" + lines.join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ppit-membership-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
