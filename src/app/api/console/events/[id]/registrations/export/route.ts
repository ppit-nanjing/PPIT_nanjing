import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, eventRegistrations, eventQuestions, eventFeeOptions, users } from "@/db/schema";
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

  const [rows, questions, feeOptions] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        status: eventRegistrations.status,
        registeredAt: eventRegistrations.registeredAt,
        branch: eventRegistrations.branch,
        answersJson: eventRegistrations.answersJson,
        feeOptionId: eventRegistrations.feeOptionId,
        biodataJson: eventRegistrations.biodataJson,
      })
      .from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .where(eq(eventRegistrations.eventId, id))
      .orderBy(desc(eventRegistrations.registeredAt)),
    db.select({ id: eventQuestions.id, label: eventQuestions.label }).from(eventQuestions).where(eq(eventQuestions.eventId, id)),
    db
      .select({ id: eventFeeOptions.id, label: eventFeeOptions.label, amountCny: eventFeeOptions.amountCny })
      .from(eventFeeOptions)
      .where(eq(eventFeeOptions.eventId, id)),
  ]);

  const feeLabel = new Map(feeOptions.map((o) => [o.id, `${o.label} (¥${o.amountCny})`]));
  const anyFee = feeOptions.length > 0;
  const anyBiodata = rows.some((r) => r.biodataJson);
  const BIODATA_COLS: { key: keyof NonNullable<(typeof rows)[number]["biodataJson"]>; label: string }[] = [
    { key: "fullName", label: "Nama Lengkap" },
    { key: "passportNumber", label: "Nomor Paspor" },
    { key: "wechatId", label: "WeChat ID" },
    { key: "chinaPhone", label: "No. Telpon China" },
    { key: "branch", label: "Kota / Ranting" },
    { key: "university", label: "Universitas" },
    { key: "major", label: "Jurusan" },
    { key: "entryYear", label: "Tahun Angkatan" },
    { key: "studentProofUrl", label: "Bukti Mahasiswa Aktif" },
  ];

  const header = [
    "Nama",
    "Email",
    "Status",
    "Tanggal Daftar",
    "Cabang",
    ...(anyFee ? ["Kategori Tarif"] : []),
    ...(anyBiodata ? BIODATA_COLS.map((c) => c.label) : []),
    ...questions.map((q) => q.label),
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    const answers = (r.answersJson ?? {}) as Record<string, unknown>;
    const bio = r.biodataJson;
    lines.push(
      [
        r.name ?? "",
        r.email ?? "",
        STATUS_LABEL[r.status] ?? r.status,
        // ISO date - locale-formatted dates ("10 Agu 2026") break Excel parsing.
        new Date(r.registeredAt).toISOString().slice(0, 10),
        r.branch ?? "",
        ...(anyFee ? [r.feeOptionId ? feeLabel.get(r.feeOptionId) ?? "" : ""] : []),
        ...(anyBiodata ? BIODATA_COLS.map((c) => bio?.[c.key] ?? "") : []),
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
