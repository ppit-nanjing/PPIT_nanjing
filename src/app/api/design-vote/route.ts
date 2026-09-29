import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { designVotes } from "@/db/schema";

export const dynamic = "force-dynamic";

const DESIGN_IDS = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
] as const;

const DESIGN_ID_SET = new Set<string>(DESIGN_IDS);

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: unknown }).code === "23505"
    ) {
      return true;
    }
    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause?: unknown }).cause
        : null;
  }
  return false;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("Body JSON tidak valid.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const ranks = Array.isArray(body.ranks)
    ? body.ranks.filter((r): r is string => typeof r === "string")
    : [];

  if (name.length < 2 || name.length > 80) {
    return bad("Nama wajib diisi (2–80 karakter).");
  }
  if (city.length > 40) {
    return bad("Nama kota terlalu panjang.");
  }
  if (note.length > 400) {
    return bad("Catatan maksimal 400 karakter.");
  }
  if (token.length < 8 || token.length > 100) {
    return bad("Token perangkat tidak valid.");
  }
  if (
    ranks.length !== 3 ||
    new Set(ranks).size !== 3 ||
    !ranks.every((r) => DESIGN_ID_SET.has(r))
  ) {
    return bad("Pilih tepat 3 desain yang berbeda.");
  }

  try {
    await db.insert(designVotes).values({
      voterName: name,
      voterCity: city || null,
      voterToken: token,
      rank1: ranks[0],
      rank2: ranks[1],
      rank3: ranks[2],
      note: note || null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { ok: false, error: "Perangkat ini sudah pernah vote." },
        { status: 409 },
      );
    }
    console.error("[design-vote] insert failed:", error);
    return bad("Gagal menyimpan vote. Coba lagi.", 500);
  }

  return NextResponse.json({ ok: true });
}

