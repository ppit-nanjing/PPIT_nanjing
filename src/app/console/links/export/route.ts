import { and, desc, eq, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { managementPeriods, shortLinks } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  await requireModuleAccess("links");
  const sp = new URL(request.url).searchParams;
  const period = sp.get("period") ?? undefined;
  const category = sp.get("category") ?? undefined;

  const conditions: SQL[] = [];
  if (period && period !== "all") conditions.push(eq(shortLinks.managementPeriodId, period));
  if (category && category !== "all")
    conditions.push(eq(shortLinks.category, category as "documentation" | "file" | "form" | "other"));

  const rows = await db
    .select({
      slug: shortLinks.slug,
      title: shortLinks.title,
      targetUrl: shortLinks.targetUrl,
      category: shortLinks.category,
      periodLabel: managementPeriods.label,
      isActive: shortLinks.isActive,
      expiresAt: shortLinks.expiresAt,
      clickCount: shortLinks.clickCount,
      createdAt: shortLinks.createdAt,
    })
    .from(shortLinks)
    .leftJoin(managementPeriods, eq(shortLinks.managementPeriodId, managementPeriods.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(shortLinks.createdAt));

  const header = [
    "slug",
    "title",
    "target_url",
    "category",
    "period",
    "is_active",
    "expires_at",
    "click_count",
    "created_at",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.slug,
        r.title,
        r.targetUrl,
        r.category,
        r.periodLabel,
        r.isActive ? "true" : "false",
        r.expiresAt ? new Date(r.expiresAt).toISOString() : "",
        r.clickCount,
        r.createdAt ? new Date(r.createdAt).toISOString() : "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const filename = `short-links-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
