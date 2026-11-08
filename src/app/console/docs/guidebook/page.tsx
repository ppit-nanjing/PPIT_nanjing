import { desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { Plus, ThumbsDown, ThumbsUp } from "lucide-react";
import { db } from "@/db";
import { aiQueryLog, guideChunks, guideMeta, helpArticles } from "@/db/schema";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { StatusRow } from "@/components/console/status-row";
import { CHUNKER_VERSION } from "@/lib/guide-chunker";
import { GUIDE_PHASES, expiryStatus } from "@/lib/guidebook-topic";
import { requireModuleAccess } from "@/lib/admin-scope";

const NAME_CAP = 5;
// Berapa suara terakhir yang ditampilkan di panel Suara Pengguna. Cukup untuk
// melihat pola minggu ini tanpa memuat seluruh riwayat pertanyaan ke satu
// halaman; angka agregat di atasnya tetap dihitung dari semua suara.
const VOTE_LIMIT = 50;

/**
 * Papan pemantau guidebook maba: topik per fase plus satu daftar hal yang bikin
 * korpusnya membusuk pelan-pelan - belum ditinjau, lewat masa berlaku, isinya
 * kosong, potongan yatim, dan potongan yang dibangun chunker versi lama.
 * Angka-angka inilah yang dipakai untuk memutuskan apa yang dikerjakan minggu ini.
 */
export default async function GuidebookConsolePage() {
  await requireModuleAccess("guidebook");

  const topics = await db
    .select({
      id: helpArticles.id,
      slug: helpArticles.slug,
      title: helpArticles.title,
      section: helpArticles.section,
      phase: helpArticles.phase,
      sortOrder: helpArticles.sortOrder,
      isPublic: helpArticles.isPublic,
      contentLength: sql<number>`length(coalesce(${helpArticles.content}, ''))::int`,
      reviewedAt: helpArticles.reviewedAt,
      expiresAt: helpArticles.expiresAt,
      sourceLabel: helpArticles.sourceLabel,
    })
    .from(helpArticles)
    .where(isNotNull(helpArticles.phase))
    .orderBy(helpArticles.sortOrder, helpArticles.title);

  const chunkCounts = await db
    .select({ articleId: guideChunks.articleId, count: sql<number>`count(*)::int` })
    .from(guideChunks)
    .groupBy(guideChunks.articleId);
  const chunkByArticle = new Map(chunkCounts.map((c) => [c.articleId, c.count]));

  // Potongan yatim: artikelnya sudah bukan topik, atau isinya dikosongkan tapi
  // potongan lamanya masih ada. Selama masih ada, pencarian bisa menjawab dari
  // topik yang sudah dicabut.
  const [orphans] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(guideChunks)
    .innerJoin(helpArticles, eq(guideChunks.articleId, helpArticles.id))
    .where(sql`${helpArticles.phase} is null or coalesce(${helpArticles.content}, '') = ''`);

  const [meta] = await db
    .select({ corpusVersion: guideMeta.corpusVersion, chunkerVersion: guideMeta.chunkerVersion, aiEnabled: guideMeta.aiEnabled })
    .from(guideMeta)
    .limit(1);

  // Suara 👍/👎 dari widget chat. Satu baris ai_query_log = satu jawaban, jadi
  // suara ini menempel pada pertanyaan dan potongan yang dikutip - inilah bahan
  // untuk menilai apakah isi korpusnya yang kurang atau modelnya yang salah.
  const voteCounts = await db
    .select({ vote: aiQueryLog.feedback, count: sql<number>`count(*)::int` })
    .from(aiQueryLog)
    .where(isNotNull(aiQueryLog.feedback))
    .groupBy(aiQueryLog.feedback);
  const upVotes = voteCounts.find((v) => v.vote === "up")?.count ?? 0;
  const downVotes = voteCounts.find((v) => v.vote === "down")?.count ?? 0;

  const recentVotes = await db
    .select({
      id: aiQueryLog.id,
      vote: aiQueryLog.feedback,
      question: aiQueryLog.questionRedacted,
      chunkIds: aiQueryLog.chunkIds,
      usedLlm: aiQueryLog.usedLlm,
      cacheHit: aiQueryLog.cacheHit,
      degradedReason: aiQueryLog.degradedReason,
      createdAt: aiQueryLog.createdAt,
    })
    .from(aiQueryLog)
    .where(isNotNull(aiQueryLog.feedback))
    // Yang tidak suka di atas: itu yang perlu dibaca duluan.
    .orderBy(sql`(${aiQueryLog.feedback} = 'down') desc`, desc(aiQueryLog.createdAt))
    .limit(VOTE_LIMIT);

  const voteChunkIds = [...new Set(recentVotes.flatMap((v) => v.chunkIds ?? []))];
  const citedChunks =
    voteChunkIds.length > 0
      ? await db
          .select({ id: guideChunks.id, articleId: guideChunks.articleId })
          .from(guideChunks)
          .where(inArray(guideChunks.id, voteChunkIds))
      : [];
  const chunkArticle = new Map(citedChunks.map((c) => [c.id, c.articleId]));
  const citedArticleIds = [...new Set(citedChunks.map((c) => c.articleId))];
  const citedArticles =
    citedArticleIds.length > 0
      ? await db
          .select({ id: helpArticles.id, slug: helpArticles.slug, title: helpArticles.title })
          .from(helpArticles)
          .where(inArray(helpArticles.id, citedArticleIds))
      : [];
  const articleById = new Map(citedArticles.map((a) => [a.id, a]));

  // Artikel yang dikutip satu suara, urut sesuai kemunculan pertama dan tanpa
  // duplikat: satu jawaban biasanya mengutip beberapa potongan dari artikel yang
  // sama.
  const citedBy = (chunkIds: string[] | null): { slug: string; title: string }[] => {
    const seen = new Map<string, { slug: string; title: string }>();
    for (const chunkId of chunkIds ?? []) {
      const articleId = chunkArticle.get(chunkId);
      const article = articleId ? articleById.get(articleId) : undefined;
      if (article && !seen.has(article.slug)) seen.set(article.slug, article);
    }
    return [...seen.values()];
  };

  const downBySlug = new Map<string, number>();
  for (const vote of recentVotes) {
    if (vote.vote !== "down") continue;
    for (const article of citedBy(vote.chunkIds)) {
      downBySlug.set(article.slug, (downBySlug.get(article.slug) ?? 0) + 1);
    }
  }
  const worstTopics = [...downBySlug.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const unreviewed = topics.filter((t) => !t.reviewedAt);
  const expired = topics.filter((t) => expiryStatus(t.expiresAt) === "expired");
  const expiringSoon = topics.filter((t) => expiryStatus(t.expiresAt) === "soon");
  const empty = topics.filter((t) => t.contentLength === 0);
  const staleChunks = topics.filter((t) => (chunkByArticle.get(t.id) ?? 0) === 0 && t.contentLength > 0);
  const chunkerStale = meta !== undefined && meta.chunkerVersion !== CHUNKER_VERSION;
  const orphanCount = orphans?.count ?? 0;
  const hasProblems =
    unreviewed.length > 0 ||
    expired.length > 0 ||
    expiringSoon.length > 0 ||
    empty.length > 0 ||
    staleChunks.length > 0 ||
    chunkerStale ||
    orphanCount > 0;

  const names = (list: { title: string }[]) =>
    list
      .slice(0, NAME_CAP)
      .map((t) => t.title)
      .join(", ") + (list.length > NAME_CAP ? `, +${list.length - NAME_CAP} lagi` : "");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Guidebook Maba</h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            {topics.length} topik dari {GUIDE_PHASES.length} fase. Isi tiap topik disunting di halaman
            artikelnya, dan potongan pencariannya dibangun ulang otomatis saat disimpan.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Link
            href="/console/docs/new"
            className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors"
          >
            <Plus size={14} aria-hidden /> Topik Baru
          </Link>
        </div>
      </div>

      <CollapsibleSection
        title="Diagnostik Korpus"
        description="Yang perlu dikerjakan sebelum topik ini dipakai maba."
        defaultOpen={hasProblems}
        className="mb-8"
      >
        <div className="flex flex-col gap-2 text-body-md">
          <StatusRow
            label="Total topik"
            ok
            value={`${topics.length} topik, ${chunkCounts.reduce((sum, c) => sum + c.count, 0)} potongan pencarian`}
          />
          <StatusRow
            label="Belum ditinjau"
            ok={unreviewed.length === 0}
            value={
              unreviewed.length === 0
                ? "Semua topik sudah ditinjau"
                : `${unreviewed.length}: ${names(unreviewed)}`
            }
          />
          <StatusRow
            label="Kedaluwarsa"
            ok={expired.length === 0}
            value={
              expired.length === 0 ? "Tidak ada yang lewat masa berlaku" : `${expired.length}: ${names(expired)}`
            }
          />
          <StatusRow
            label="Segera kedaluwarsa"
            ok={expiringSoon.length === 0}
            value={
              expiringSoon.length === 0
                ? "Tidak ada yang berakhir dalam 30 hari"
                : `${expiringSoon.length}: ${names(expiringSoon)}`
            }
          />
          <StatusRow
            label="Isi kosong"
            ok={empty.length === 0}
            value={empty.length === 0 ? "Tidak ada" : `${empty.length}: ${names(empty)}`}
          />
          <StatusRow
            label="Belum berpotongan"
            ok={staleChunks.length === 0}
            value={
              staleChunks.length === 0
                ? "Setiap topik punya potongan"
                : `${staleChunks.length}: ${names(staleChunks)} - simpan salah satu untuk membangun ulang`
            }
          />
          <StatusRow
            label="Potongan yatim"
            ok={orphanCount === 0}
            value={
              orphanCount === 0
                ? "Tidak ada"
                : `${orphanCount} potongan dari topik yang sudah dicabut atau dikosongkan`
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
                : "guide_meta belum ada - jalankan migrasi 0046"
            }
          />
          <StatusRow
            label="Versi korpus"
            ok
            value={meta ? `v${meta.corpusVersion}${meta.aiEnabled ? "" : " (chatbot dimatikan)"}` : "belum tercatat"}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title={`Suara Pengguna (${upVotes} suka, ${downVotes} tidak suka)`}
        description="Penilaian dari widget chat, yang tidak suka di atas dan terbaru dulu. Satu suara per jawaban, dan penggunanya boleh menggantinya."
        defaultOpen={downVotes > 0}
        className="mb-8"
      >
        <div className="flex flex-col gap-2 text-body-md mb-4">
          <StatusRow label="Suka" ok value={`${upVotes} suara`} />
          <StatusRow
            label="Tidak suka"
            ok={downVotes === 0}
            value={downVotes === 0 ? "Belum ada" : `${downVotes} suara`}
          />
          <StatusRow
            label="Topik paling sering tidak membantu"
            ok={worstTopics.length === 0}
            value={
              worstTopics.length === 0
                ? "Belum ada suara tidak suka"
                : `${worstTopics.map(([slug, n]) => `${slug} (${n})`).join(", ")} - dari ${recentVotes.length} suara terakhir`
            }
          />
        </div>
        {recentVotes.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">
            Belum ada suara. Tombol 👍/👎 baru muncul setelah pengguna masuk dan bertanya ke chatbot.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentVotes.map((vote) => {
              const cited = citedBy(vote.chunkIds);
              const answered = vote.usedLlm
                ? "dijawab model"
                : vote.cacheHit
                  ? "dari cache"
                  : "tanpa model";
              return (
                <div key={vote.id} className="rounded-md border border-outline-variant px-3 py-2">
                  <div className="flex items-start gap-2">
                    {vote.vote === "down" ? (
                      <ThumbsDown size={15} className="mt-1 shrink-0 text-error" />
                    ) : (
                      <ThumbsUp size={15} className="mt-1 shrink-0 text-primary-container" />
                    )}
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-body-lg break-words text-on-background">
                        {vote.question ?? "Pertanyaan tidak tercatat"}
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        {vote.createdAt.toLocaleDateString("id-ID")} · {answered}
                        {vote.degradedReason ? ` · ${vote.degradedReason}` : ""}
                        {cited.length === 0 ? " · tanpa kutipan artikel" : ""}
                      </span>
                      {cited.length > 0 && (
                        <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          {cited.map((article) => (
                            <Link
                              key={article.slug}
                              href={`/console/docs/${article.slug}`}
                              className="text-primary-container hover:underline"
                            >
                              {article.title}
                            </Link>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      <div className="flex flex-col gap-4">
        {GUIDE_PHASES.map((phase) => {
          const items = topics.filter((t) => t.phase === phase.value);
          return (
            <CollapsibleSection
              key={phase.value}
              title={`${phase.label} (${items.length})`}
              description="Urutan tampil untuk maba mengikuti angka di kolom ini."
              defaultOpen={items.length > 0}
            >
              {items.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">Belum ada topik di fase ini.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {items.map((topic) => {
                    const chunks = chunkByArticle.get(topic.id) ?? 0;
                    const expiredTopic = expiryStatus(topic.expiresAt) === "expired";
                    return (
                      <Link
                        key={topic.id}
                        href={`/console/docs/${topic.slug}`}
                        className="flex flex-col gap-1 rounded-md px-3 py-2 hover:bg-surface-container-low transition-colors"
                      >
                        <span className="text-body-lg text-on-background">
                          {topic.sortOrder}. {topic.title}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {topic.section} · {chunks} potongan
                          {topic.reviewedAt
                            ? ` · ditinjau ${topic.reviewedAt.toLocaleDateString("id-ID")}`
                            : " · belum ditinjau"}
                          {topic.expiresAt
                            ? ` · berlaku sampai ${topic.expiresAt.toLocaleDateString("id-ID")}${
                                expiredTopic ? " (lewat)" : ""
                              }`
                            : ""}
                          {topic.isPublic ? "" : " · belum publik"}
                          {topic.sourceLabel ? ` · ${topic.sourceLabel}` : ""}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CollapsibleSection>
          );
        })}
      </div>
    </div>
  );
}
