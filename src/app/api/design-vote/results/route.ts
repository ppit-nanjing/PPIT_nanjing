import { NextResponse } from "next/server";
import { db } from "@/db";
import { designVotes } from "@/db/schema";

export const dynamic = "force-dynamic";

const DESIGN_IDS = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
] as const;

const DESIGN_META: Record<string, { name: string; file: string }> = {
  "01": { name: "Diaspora Modern", file: "01-diaspora-modern.html" },
  "02": { name: "Cultural Heritage Motif", file: "02-cultural-heritage.html" },
  "03": { name: "Trust-first Corporate", file: "03-trust-corporate.html" },
  "04": { name: "Gov-style", file: "04-gov-style.html" },
  "05": { name: "Editorial UI", file: "05-editorial.html" },
  "06": { name: "Bento Grid", file: "06-bento-grid.html" },
  "07": { name: "Swiss Design", file: "07-swiss.html" },
  "08": { name: "Modern Dark SaaS", file: "08-dark-saas.html" },
  "09": { name: "Kinetic Hero Typography", file: "09-kinetic-type.html" },
  "10": { name: "Art Deco", file: "10-art-deco.html" },
  "11": { name: "Bauhaus UI", file: "11-bauhaus.html" },
  "12": { name: "Op Art", file: "12-op-art.html" },
  "13": { name: "Risograph Print", file: "13-risograph.html" },
  "14": { name: "Luxury Editorial", file: "14-luxury-editorial.html" },
  "15": { name: "Broadsheet", file: "15-broadsheet.html" },
  "16": { name: "Art Nouveau", file: "16-art-nouveau.html" },
  "17": { name: "Blueprint", file: "17-blueprint.html" },
  "18": { name: "Solarpunk", file: "18-solarpunk.html" },
  "19": { name: "De Stijl", file: "19-de-stijl.html" },
  "20": { name: "Constructivism", file: "20-constructivism.html" },
};

type Aggregate = {
  id: string;
  name: string;
  file: string;
  points: number;
  r1: number;
  r2: number;
  r3: number;
};

export async function GET() {
  try {
    const rows = await db
      .select({
        rank1: designVotes.rank1,
        rank2: designVotes.rank2,
        rank3: designVotes.rank3,
      })
      .from(designVotes);

    const aggregate = new Map<string, Aggregate>();
    for (const id of DESIGN_IDS) {
      aggregate.set(id, {
        id,
        name: DESIGN_META[id].name,
        file: DESIGN_META[id].file,
        points: 0,
        r1: 0,
        r2: 0,
        r3: 0,
      });
    }

    for (const row of rows) {
      const first = aggregate.get(row.rank1);
      if (first) {
        first.points += 3;
        first.r1 += 1;
      }
      const second = aggregate.get(row.rank2);
      if (second) {
        second.points += 2;
        second.r2 += 1;
      }
      const third = aggregate.get(row.rank3);
      if (third) {
        third.points += 1;
        third.r3 += 1;
      }
    }

    const ranking = Array.from(aggregate.values()).sort(
      (a, b) => b.points - a.points || a.id.localeCompare(b.id),
    );

    return NextResponse.json(
      { ok: true, total: rows.length, ranking },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[design-vote] aggregate failed:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memuat hasil." },
      { status: 500 },
    );
  }
}
