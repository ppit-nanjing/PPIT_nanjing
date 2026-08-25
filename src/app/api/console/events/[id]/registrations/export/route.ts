import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, eventRegistrations, eventQuestions, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";

// Same hardening as the membership export: quote/escape CSV specials and
// neutralize Excel formula injection ("=HYPERLINK(...)" typed into a form
// answer must not execute when a treasurer opens the export).
function csvCell(value: unknown): string {
  let s: string;
  if (value == null) s = "";
  else if (Array.isArray(value)) s = value.join(", ");
  else if (typeof value === "object") s = JSON.stringify(value);
  else s = String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  attended: "Hadir",
  cancelled: "Dibatalkan",
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("events");
  const { id } = await params;

  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, id)).limit(1);
  if (!event) return new Response("Not found", { status: 404 });

  const [rows, questions] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        status: eventRegistrations.status,
        registeredAt: eventRegistrations.registeredAt,
        branch: eventRegistrations.branch,
        answersJson: eventRegistrations.answersJson,
      })
      .from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .where(eq(eventRegistrations.eventId, id))
      .orderBy(desc(eventRegistrations.registeredAt)),
    db.select({ id: eventQuestions.id, label: eventQuestions.label }).from(eventQuestions).where(eq(eventQuestions.eventId, id)),
  ]);

  const header = ["Nama", "Email", "Status", "Tanggal Daftar", "Cabang", ...questions.map((q) => q.label)];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    const answers = (r.answersJson ?? {}) as Record<string, unknown>;
    lines.push(
      [
        r.name ?? "",
        r.email ?? "",
        STATUS_LABEL[r.status] ?? r.status,
        // ISO date - locale-formatted dates ("10 Agu 2026") break Excel parsing.
        new Date(r.registeredAt).toISOString().slice(0, 10),
        r.branch ?? "",
        ...questions.map((q) => {
          const v = answers[q.id];
          return Array.isArray(v) ? v.join(", ") : v;
        }),
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const safeTitle = event.title.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().slice(0, 40);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pendaftar-${safeTitle}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
