import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, sensusProfiles } from "@/db/schema";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({ user: users, sensus: sensusProfiles })
    .from(users)
    .leftJoin(sensusProfiles, eq(sensusProfiles.userId, users.id));

  const header = [
    "Nama",
    "Email",
    "Universitas",
    "Program",
    "Jenjang",
    "Kota di Tiongkok",
    "Status Sensus",
  ];
  const lines = [header.join(",")];
  for (const { user, sensus } of rows) {
    lines.push(
      [
        user.name,
        user.email,
        sensus?.university,
        sensus?.program,
        sensus?.degreeLevel,
        sensus?.cityInChina,
        sensus?.completionStatus ?? "belum mengisi",
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="data-mahasiswa-ppit-nanjing.csv"`,
    },
  });
}
