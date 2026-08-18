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
  const header = [
    "Nama Lengkap",
    "Email",
    "Universitas",
    "Jurusan",
    "WhatsApp",
    "Status",
    "Tanggal Kirim",
    ...answerFields.map((f) => f.label),
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
      ...answerFields.map((f) => csvCell(responses[f.key ?? ""])),
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
