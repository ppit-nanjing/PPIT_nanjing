"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { auditLogs, guideChunks, guideMeta, helpArticles, releaseNotes } from "@/db/schema";
import { CHUNKER_VERSION, chunkMarkdown } from "@/lib/guide-chunker";
import { stemmedText } from "@/lib/guidebook-search";
import { articleSignatureSql, isGuidePhase } from "@/lib/guidebook-topic";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
  return session.user.id;
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Topik guidebook maba (docs/Guidebook Maba.md, fase P2)
// ---------------------------------------------------------------------------

type ArticleSnapshot = {
  title: string;
  section: string;
  content: string | null;
  isPublic: boolean;
  phase: string | null;
  sortOrder: number;
  sourceLabel: string | null;
  sourceDocSlug: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  expiresAt: Date | null;
};

/**
 * Jejak audit topik. entityType "help_article" = satu artikel satu riwayat,
 * jadi halaman editor bisa mengambil riwayatnya dengan satu query.
 */
async function logArticleAudit(
  actorId: string,
  articleId: string,
  action: string,
  detail?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
): Promise<void> {
  // Pola logEventAudit: gagal mencatat riwayat tidak pernah membatalkan
  // simpanannya.
  try {
    await db.insert(auditLogs).values({
      actorUserId: actorId,
      entityType: "help_article",
      entityId: articleId,
      action,
      beforeJson: detail?.before ?? null,
      afterJson: detail?.after ?? null,
    });
  } catch (err) {
    console.error(`[audit] help_article ${action} failed:`, err);
  }
}

/**
 * Potongan pencarian dibangun ulang setiap isi disimpan. Baris lama dibuang
 * dulu karena (article_id, ordinal) unik dan chunker menomori dari 0.
 * Isi kosong = nol potongan, artinya topik hilang dari pencarian tapi tetap ada
 * di checklist.
 */
async function rebuildChunks(articleId: string, content: string | null): Promise<number> {
  await db.delete(guideChunks).where(eq(guideChunks.articleId, articleId));
  const drafts = chunkMarkdown(content ?? "");
  if (drafts.length === 0) return 0;
  await db.insert(guideChunks).values(
    drafts.map((d) => ({
      articleId,
      ordinal: d.ordinal,
      heading: d.heading,
      pageFrom: d.pageFrom,
      pageTo: d.pageTo,
      text: d.text,
      textStemmed: stemmedText(d.text),
    })),
  );
  return drafts.length;
}

/**
 * corpus_version adalah kunci cache guide_answers: naik satu langkah setiap
 * korpus berubah, jadi jawaban lama berhenti dicocokkan tanpa ada yang dihapus.
 * chunker_version ditulis di sini juga supaya script ingest tahu potongan lama
 * mana yang perlu dibangun ulang kalau aturan pemotongan berubah.
 */
async function bumpCorpusVersion(): Promise<void> {
  await db
    .insert(guideMeta)
    .values({ oneRow: true, corpusVersion: 1, chunkerVersion: CHUNKER_VERSION })
    .onConflictDoUpdate({
      target: guideMeta.oneRow,
      set: {
        corpusVersion: sql`${guideMeta.corpusVersion} + 1`,
        chunkerVersion: CHUNKER_VERSION,
        updatedAt: new Date(),
      },
    });
}

const EXPIRY_MONTHS: Record<string, number> = { "3": 3, "6": 6, "12": 12 };

/** "keep" = biarkan, "none" = cabut masa berlaku, sisanya = bulan dari sekarang. */
function resolveExpiry(choice: string, current: Date | null): Date | null {
  if (choice === "none") return null;
  const months = EXPIRY_MONTHS[choice];
  if (!months) return current;
  const next = new Date();
  next.setMonth(next.getMonth() + months);
  return next;
}

function snapshot(row: ArticleSnapshot): Record<string, unknown> {
  return {
    title: row.title,
    section: row.section,
    content: row.content,
    isPublic: row.isPublic,
    phase: row.phase,
    sortOrder: row.sortOrder,
    sourceLabel: row.sourceLabel,
    sourceDocSlug: row.sourceDocSlug,
    reviewedAt: row.reviewedAt,
    reviewedBy: row.reviewedBy,
    expiresAt: row.expiresAt,
  };
}

const SNAPSHOT_COLUMNS = {
  title: helpArticles.title,
  section: helpArticles.section,
  content: helpArticles.content,
  isPublic: helpArticles.isPublic,
  phase: helpArticles.phase,
  sortOrder: helpArticles.sortOrder,
  sourceLabel: helpArticles.sourceLabel,
  sourceDocSlug: helpArticles.sourceDocSlug,
  reviewedAt: helpArticles.reviewedAt,
  reviewedBy: helpArticles.reviewedBy,
  expiresAt: helpArticles.expiresAt,
} as const;

export async function upsertHelpArticle(existingId: string | null, formData: FormData) {
  const actorId = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const section = String(formData.get("section") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const isPublic = formData.get("isPublic") === "on";
  if (!title || !section) throw new Error("Judul dan bagian wajib diisi");

  // --- kolom guidebook: hanya berarti kalau fase diisi ---
  const phaseInput = String(formData.get("phase") ?? "").trim();
  if (phaseInput && !isGuidePhase(phaseInput)) throw new Error("Fase guidebook tidak dikenal");
  const phase = phaseInput || null;
  const parsedOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const sourceLabel = String(formData.get("sourceLabel") ?? "").trim() || null;
  const sourceDocSlug = String(formData.get("sourceDocSlug") ?? "").trim() || null;
  const reviewState = String(formData.get("reviewState") ?? "keep");
  const expiresIn = String(formData.get("expiresIn") ?? "keep");
  // Dihitung Postgres (lihat guidebook-topic.ts) dan dikirim form sebagai hidden
  // field: dipakai sebagai kunci optimistis di bawah.
  const seenSignature = String(formData.get("seenSignature") ?? "").trim();

  const guideFields = {
    phase,
    sortOrder: Number.isNaN(parsedOrder) ? 0 : parsedOrder,
    sourceLabel,
    sourceDocSlug,
  };

  let slug: string;
  if (existingId) {
    const [existing] = await db
      .select({ slug: helpArticles.slug, ...SNAPSHOT_COLUMNS })
      .from(helpArticles)
      .where(eq(helpArticles.id, existingId));
    if (!existing) throw new Error("Panduan tidak ditemukan");
    slug = existing.slug;

    const reviewedAt =
      reviewState === "mark" ? new Date() : reviewState === "clear" ? null : existing.reviewedAt;
    const reviewedBy =
      reviewState === "mark" ? actorId : reviewState === "clear" ? null : existing.reviewedBy;
    const expiresAt = resolveExpiry(expiresIn, existing.expiresAt);

    const next = {
      title,
      section,
      content: content || null,
      isPublic,
      ...guideFields,
      reviewedAt,
      reviewedBy,
      expiresAt,
    };

    // Kunci optimistis: WHERE-nya cuma cocok selama isi di database masih sama
    // dengan yang dibaca waktu halaman dibuka. Tidak ada baris yang kembali =
    // pengurus lain menyimpan lebih dulu, jadi simpanan kedua ditolak - bukan
    // menimpa yang pertama diam-diam. Form lama yang tidak mengirim
    // seenSignature tetap jalan seperti sebelumnya.
    const rows = await db
      .update(helpArticles)
      .set({ ...next, updatedAt: new Date() })
      .where(
        seenSignature
          ? and(eq(helpArticles.id, existingId), eq(articleSignatureSql, seenSignature))
          : eq(helpArticles.id, existingId),
      )
      .returning({ id: helpArticles.id });
    if (rows.length === 0) {
      throw new Error("Artikel ini sudah disimpan pengurus lain. Muat ulang halamannya, lalu simpan lagi.");
    }

    if (phase) await rebuildChunks(existingId, next.content);
    else await db.delete(guideChunks).where(eq(guideChunks.articleId, existingId));

    await logArticleAudit(actorId, existingId, "article.updated", {
      before: snapshot(existing),
      after: snapshot(next),
    });
    // Korpus berubah kalau barisnya topik sekarang atau sebelumnya - suntingan
    // artikel Help Center biasa tidak perlu menaikkan versi.
    if (phase || existing.phase) await bumpCorpusVersion();
  } else {
    slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 6);
    const [created] = await db
      .insert(helpArticles)
      .values({
        title,
        section,
        slug,
        content: content || null,
        isPublic,
        authorId: actorId,
        ...guideFields,
      })
      .returning({ id: helpArticles.id });

    if (created && phase) {
      await rebuildChunks(created.id, content || null);
      await logArticleAudit(actorId, created.id, "article.created", {
        after: snapshot({ title, section, content: content || null, isPublic, ...guideFields, reviewedAt: null, reviewedBy: null, expiresAt: null }),
      });
      await bumpCorpusVersion();
    }
  }

  revalidatePath("/console/docs");
  revalidatePath("/console/docs/guidebook");
  revalidatePath(`/console/docs/${slug}`);
  // Artikel publik ikut kebaca di /help - baik yang baru dibuat/diubah publik
  // maupun yang baru dimatikan lagi (revalidate tanpa syarat, lebih murah
  // daripada melacak isPublic sebelumnya).
  revalidatePath("/help");
  revalidatePath(`/help/${slug}`);
  redirect("/console/docs");
}

/** Ambil isi artikel dari sebelum_json sebuah entri riwayat (dijamin bentuk sederhana). */
function snapshotFromJson(value: unknown, fallback: ArticleSnapshot): ArticleSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.title !== "string" || typeof v.section !== "string") return null;
  const asDate = (raw: unknown) => (typeof raw === "string" && raw ? new Date(raw) : null);
  return {
    title: v.title,
    section: v.section,
    content: typeof v.content === "string" ? v.content : null,
    isPublic: v.isPublic === true,
    phase: typeof v.phase === "string" ? v.phase : null,
    sortOrder: typeof v.sortOrder === "number" ? v.sortOrder : 0,
    sourceLabel: typeof v.sourceLabel === "string" ? v.sourceLabel : null,
    sourceDocSlug: typeof v.sourceDocSlug === "string" ? v.sourceDocSlug : null,
    reviewedAt: asDate(v.reviewedAt),
    reviewedBy: typeof v.reviewedBy === "string" ? v.reviewedBy : null,
    expiresAt: asDate(v.expiresAt) ?? fallback.expiresAt,
  };
}

/**
 * Kembalikan artikel ke isi sebelum satu entri riwayat. Riwayatnya sendiri tidak
 * dihapus - pemulihan dicatat sebagai entri baru, jadi tetap bisa dibalik lagi.
 */
export async function restoreHelpArticleVersion(formData: FormData) {
  const actorId = await requireAdmin();
  const articleId = String(formData.get("articleId") ?? "");
  const auditId = String(formData.get("auditId") ?? "");
  if (!articleId || !auditId) throw new Error("Riwayat yang mau dipulihkan tidak disebutkan");
  const [log] = await db
    .select({ before: auditLogs.beforeJson, action: auditLogs.action })
    .from(auditLogs)
    .where(and(eq(auditLogs.id, auditId), eq(auditLogs.entityId, articleId), eq(auditLogs.entityType, "help_article")))
    .limit(1);
  if (!log) throw new Error("Riwayat tidak ditemukan");

  const [current] = await db
    .select({ slug: helpArticles.slug, ...SNAPSHOT_COLUMNS })
    .from(helpArticles)
    .where(eq(helpArticles.id, articleId));
  if (!current) throw new Error("Panduan tidak ditemukan");

  const target = snapshotFromJson(log.before, current);
  if (!target) throw new Error("Riwayat ini tidak menyimpan isi sebelumnya, jadi tidak bisa dipulihkan");

  const restored = {
    title: target.title,
    section: target.section,
    content: target.content,
    isPublic: target.isPublic,
    phase: target.phase,
    sortOrder: target.sortOrder,
    sourceLabel: target.sourceLabel,
    sourceDocSlug: target.sourceDocSlug,
    reviewedAt: target.reviewedAt,
    reviewedBy: target.reviewedBy,
    expiresAt: target.expiresAt,
  };

  await db
    .update(helpArticles)
    .set({ ...restored, updatedAt: new Date() })
    .where(eq(helpArticles.id, articleId));

  if (restored.phase) await rebuildChunks(articleId, restored.content);
  else await db.delete(guideChunks).where(eq(guideChunks.articleId, articleId));

  await logArticleAudit(actorId, articleId, "article.restored", {
    before: snapshot(current),
    after: snapshot({ ...restored, content: restored.content }),
  });
  await bumpCorpusVersion();

  revalidatePath("/console/docs");
  revalidatePath("/console/docs/guidebook");
  revalidatePath(`/console/docs/${current.slug}`);
  revalidatePath("/help");
  revalidatePath(`/help/${current.slug}`);
}

/**
 * Panel merge: versi hasil ekstraksi PDF (`parsed_markdown`) dibandingkan dengan
 * yang sudah disunting pengurus (`content`). Dua-duanya sah - yang dipilih
 * pengurus yang menang, dan selisihnya berhenti ditandai setelah itu.
 */
export async function resolveGuideMerge(formData: FormData) {
  const actorId = await requireAdmin();
  const articleId = String(formData.get("articleId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!articleId) throw new Error("Artikel tidak disebutkan");
  if (decision !== "parsed" && decision !== "live") throw new Error("Pilihan merge tidak dikenal");

  const [current] = await db
    .select({ slug: helpArticles.slug, content: helpArticles.content, parsedMarkdown: helpArticles.parsedMarkdown })
    .from(helpArticles)
    .where(eq(helpArticles.id, articleId));
  if (!current) throw new Error("Panduan tidak ditemukan");
  if (!current.parsedMarkdown) throw new Error("Artikel ini tidak punya versi hasil ekstraksi PDF");

  if (decision === "parsed") {
    // Isi live ditimpa versi PDF; parsed_markdown dibiarkan sebagai catatan asal.
    await db
      .update(helpArticles)
      .set({ content: current.parsedMarkdown, updatedAt: new Date() })
      .where(eq(helpArticles.id, articleId));
    await rebuildChunks(articleId, current.parsedMarkdown);
  } else {
    // Suntingan pengurus dipertahankan: baseline PDF disamakan dengan isi live
    // supaya selisih yang sama tidak ditandai lagi.
    await db
      .update(helpArticles)
      .set({ parsedMarkdown: current.content, updatedAt: new Date() })
      .where(eq(helpArticles.id, articleId));
  }

  await logArticleAudit(actorId, articleId, `merge.${decision}`, {
    before: { content: current.content, parsedMarkdown: current.parsedMarkdown },
  });
  await bumpCorpusVersion();

  revalidatePath("/console/docs/guidebook");
  revalidatePath(`/console/docs/${current.slug}`);
  revalidatePath("/help");
  revalidatePath(`/help/${current.slug}`);
}

export async function publishReleaseNote(formData: FormData) {
  const actorId = await requireAdmin();
  const version = String(formData.get("version") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  if (!version || !summary) throw new Error("Versi dan ringkasan wajib diisi");

  await db.insert(releaseNotes).values({
    version,
    summary,
    details: String(formData.get("details") ?? "").trim() || null,
    publishedBy: actorId,
  });

  revalidatePath("/console/docs/changelog");
}
