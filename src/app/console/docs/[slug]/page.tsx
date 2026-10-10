import { and, desc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { db } from "@/db";
import { auditLogs, guideChunks, guideMeta, helpArticles, users } from "@/db/schema";
import { resolveGuideMerge, restoreHelpArticleVersion } from "@/app/actions/admin-docs";
import { ArticleForm } from "@/components/console/article-form";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ConfirmButton } from "@/components/console/confirm-button";
import { PrintButton } from "@/components/console/print-button";
import { StatusRow } from "@/components/console/status-row";
import { ghostBtn } from "@/components/console/form";
import { CHUNKER_VERSION } from "@/lib/guide-chunker";
import { articleSignatureSql, expiryStatus, guidePhaseLabel } from "@/lib/guidebook-topic";

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [row] = await db
    .select({ article: helpArticles, authorName: users.name, signature: articleSignatureSql })
    .from(helpArticles)
    .leftJoin(users, eq(helpArticles.authorId, users.id))
    .where(eq(helpArticles.slug, slug));
  if (!row) notFound();
  const { article, authorName, signature } = row;

  // Panel guidebook cuma dijalankan untuk topik; halaman Help Center biasa tidak
  // menanggung query tambahan.
  const isTopic = article.phase !== null;
  const chunkStats = isTopic
    ? (
        await db
          .select({
            count: sql<number>`count(*)::int`,
            minPage: sql<number | null>`min(${guideChunks.pageFrom})`,
            maxPage: sql<number | null>`max(${guideChunks.pageTo})`,
          })
          .from(guideChunks)
          .where(eq(guideChunks.articleId, article.id))
      )[0]
    : undefined;
  const meta = isTopic
    ? (
        await db
          .select({ corpusVersion: guideMeta.corpusVersion, chunkerVersion: guideMeta.chunkerVersion })
          .from(guideMeta)
          .limit(1)
      )[0]
    : undefined;
  const history = isTopic
    ? await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          createdAt: auditLogs.createdAt,
          actorName: users.name,
          beforeJson: auditLogs.beforeJson,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorUserId, users.id))
        .where(and(eq(auditLogs.entityType, "help_article"), eq(auditLogs.entityId, article.id)))
        .orderBy(desc(auditLogs.createdAt))
        .limit(10)
    : [];

  const expiry = expiryStatus(article.expiresAt);
  const expired = expiry === "expired";
  const expiringSoon = expiry === "soon";
  const chunkerStale = meta !== undefined && meta.chunkerVersion !== CHUNKER_VERSION;
  const mergeDiffers =
    article.parsedMarkdown !== null && article.parsedMarkdown !== (article.content ?? "");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-2xl">
      <span className="text-label-caps uppercase tracking-wide text-primary-container mb-2 block">
        {article.section}
      </span>
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">{article.title}</h1>
      <p className="text-label-caps text-on-surface-variant mb-8 flex flex-wrap items-center gap-x-2">
        <span>
          Diperbarui {new Date(article.updatedAt).toLocaleDateString("id-ID")}
          {authorName ? ` oleh ${authorName}` : ""}
        </span>
        {article.isPublic && (
          <span className="bg-primary-container/10 text-primary-container px-2 py-0.5 rounded-full normal-case">
            Publik di /help
          </span>
        )}
        {isTopic && (
          <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full normal-case">
            Guidebook · {guidePhaseLabel(article.phase)}
          </span>
        )}
      </p>

      {article.content && (
        <p className="text-body-lg text-on-surface-variant whitespace-pre-wrap mb-10">{article.content}</p>
      )}

      {/* print:hidden - Fase 2: dua sumber (Word/PDF) diturunkan dari artikel
          yang sama, bukan dokumen SOP terpisah yang harus dijaga manual. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-10 text-label-caps print:hidden">
        <a
          href={`/api/console/docs/${article.slug}/export`}
          download
          className="text-primary-container hover:text-primary inline-flex items-center gap-1"
        >
          <Download size={13} aria-hidden /> Unduh sebagai Word
        </a>
        <PrintButton />
      </div>

      {isTopic && (
        <div className="flex flex-col gap-4 mb-10 print:hidden">
          <CollapsibleSection
            title="Status Topik Guidebook"
            description="Yang bikin topik ini ketahuan perlu diperbarui."
            defaultOpen={!article.reviewedAt || expired || expiringSoon || chunkerStale}
          >
            <dl className="flex flex-col gap-2 text-body-md">
              <StatusRow
                label="Tinjauan"
                ok={Boolean(article.reviewedAt)}
                value={
                  article.reviewedAt
                    ? `Ditinjau ${article.reviewedAt.toLocaleDateString("id-ID")}`
                    : "Belum pernah ditinjau"
                }
              />
              <StatusRow
                label="Masa berlaku"
                ok={!expired && !expiringSoon}
                value={
                  article.expiresAt
                    ? `${article.expiresAt.toLocaleDateString("id-ID")}${
                        expired ? " (sudah lewat)" : expiringSoon ? " (kurang dari 30 hari)" : ""
                      }`
                    : "Tanpa masa berlaku"
                }
              />
              <StatusRow
                label="Potongan pencarian"
                ok={(chunkStats?.count ?? 0) > 0}
                value={
                  (chunkStats?.count ?? 0) > 0
                    ? `${chunkStats?.count} potongan${
                        chunkStats?.minPage
                          ? `, hal. ${chunkStats.minPage}${chunkStats.maxPage ? `-${chunkStats.maxPage}` : ""}`
                          : ""
                      }`
                    : "Belum ada - isi masih kosong atau durasinya dibangun ulang saat disimpan"
                }
              />
              <StatusRow
                label="Chunker"
                ok={!chunkerStale}
                value={
                  meta
                    ? `v${meta.chunkerVersion} di database, v${CHUNKER_VERSION} di kode${
                        chunkerStale ? " - potongan lama perlu dibangun ulang" : ""
                      }`
                    : "guide_meta belum ada"
                }
              />
              <StatusRow
                label="Versi korpus"
                ok
                value={meta ? `v${meta.corpusVersion}` : "belum tercatat"}
              />
            </dl>
          </CollapsibleSection>

          {article.parsedMarkdown !== null && (
            <CollapsibleSection
              title={mergeDiffers ? "Versi PDF vs isi live (berbeda)" : "Versi PDF vs isi live (sama)"}
              description="Hasil ekstraksi dokumen sumber dibandingkan dengan yang sudah disunting pengurus."
              defaultOpen={mergeDiffers}
            >
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                      Versi PDF
                    </span>
                    <pre className="mt-1 whitespace-pre-wrap text-xs bg-soft-gray rounded-md p-3 max-h-80 overflow-auto">
                      {article.parsedMarkdown}
                    </pre>
                  </div>
                  <div>
                    <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                      Isi live
                    </span>
                    <pre className="mt-1 whitespace-pre-wrap text-xs bg-soft-gray rounded-md p-3 max-h-80 overflow-auto">
                      {article.content ?? ""}
                    </pre>
                  </div>
                </div>
                {mergeDiffers ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <ConfirmButton
                      action={resolveGuideMerge}
                      payload={{ articleId: article.id, decision: "parsed" }}
                      message="Isi live diganti versi hasil ekstraksi PDF. Suntingan pengurus pada isi live akan hilang (masih bisa dipulihkan dari riwayat)."
                      confirmLabel="Pakai versi PDF"
                      successMessage="Isi live diganti versi PDF."
                      className={ghostBtn}
                    >
                      Pakai versi PDF
                    </ConfirmButton>
                    <ConfirmButton
                      action={resolveGuideMerge}
                      payload={{ articleId: article.id, decision: "live" }}
                      message="Baseline PDF disamakan dengan isi live. Isi artikelnya sendiri tidak berubah - cuma selisih yang ditandai berhenti ditandai."
                      confirmLabel="Pertahankan isi live"
                      successMessage="Baseline PDF disamakan dengan isi live."
                      danger={false}
                      className={ghostBtn}
                    >
                      Pertahankan isi live
                    </ConfirmButton>
                  </div>
                ) : (
                  <p className="text-body-md text-on-surface-variant">
                    Tidak ada selisih yang perlu diputuskan.
                  </p>
                )}
              </div>
            </CollapsibleSection>
          )}

          <CollapsibleSection
            title="Riwayat Perubahan"
            description="10 perubahan terakhir. Memulihkan tidak menghapus riwayatnya."
            defaultOpen={false}
          >
            {history.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Belum ada perubahan tercatat.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {history.map((entry) => {
                  const restorable = Boolean(
                    entry.beforeJson && typeof entry.beforeJson === "object",
                  );
                  return (
                    <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-body-md text-on-surface-variant">
                        {entry.action} · {new Date(entry.createdAt).toLocaleString("id-ID")}
                        {entry.actorName ? ` · ${entry.actorName}` : ""}
                      </span>
                      {restorable && (
                        <ConfirmButton
                          action={restoreHelpArticleVersion}
                          payload={{ articleId: article.id, auditId: entry.id }}
                          message={`Kembalikan isi artikel ke keadaan sebelum ${entry.action} (${new Date(
                            entry.createdAt,
                          ).toLocaleString("id-ID")})? Isi yang sekarang diganti.`}
                          confirmLabel="Pulihkan"
                          successMessage="Artikel dipulihkan ke versi itu."
                          className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary"
                        >
                          Pulihkan
                        </ConfirmButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleSection>
        </div>
      )}

      <div className="print:hidden">
        <CollapsibleSection title="Edit Panduan Ini">
          <ArticleForm
            article={article}
            signature={signature}
            submitLabel="Simpan Perubahan"
            successMessage="Panduan tersimpan."
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}
