import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { managementPeriods, shortLinks } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { deleteShortLink, toggleShortLink, setActivePeriod } from "@/app/actions/short-links";
import { CopyLinkButton } from "@/components/console/copy-link-button";
import { ShortLinkDeleteButton } from "@/components/console/short-link-delete-button";
import { PeriodForm } from "@/components/console/management-period-form";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";

const CATEGORY_LABEL: Record<string, string> = {
  documentation: "Dokumentasi",
  file: "Berkas",
  form: "Formulir",
  other: "Lainnya",
};

const STATUS_CLASS: Record<string, string> = {
  active: "bg-primary-container/40 text-on-primary-container",
  inactive: "bg-outline-variant/40 text-on-surface-variant",
  expired: "bg-error-container/40 text-on-error-container",
};

export default async function ConsoleLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; category?: string; q?: string }>;
}) {
  await requireModuleAccess("links");
  const { period, category, q } = await searchParams;
  const query = q?.trim() ?? "";

  const conditions: SQL[] = [];
  if (period && period !== "all") conditions.push(eq(shortLinks.managementPeriodId, period));
  if (category && category !== "all")
    conditions.push(eq(shortLinks.category, category as "documentation" | "file" | "form" | "other"));
  if (query) conditions.push(ilike(shortLinks.title, `%${query}%`));

  const links = await db
    .select({
      id: shortLinks.id,
      slug: shortLinks.slug,
      title: shortLinks.title,
      category: shortLinks.category,
      isActive: shortLinks.isActive,
      expiresAt: shortLinks.expiresAt,
      clickCount: shortLinks.clickCount,
      createdAt: shortLinks.createdAt,
      periodLabel: managementPeriods.label,
    })
    .from(shortLinks)
    .leftJoin(managementPeriods, eq(shortLinks.managementPeriodId, managementPeriods.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(shortLinks.createdAt));

  const periods = await db
    .select({ id: managementPeriods.id, label: managementPeriods.label, isCurrent: managementPeriods.isCurrent })
    .from(managementPeriods)
    .orderBy(managementPeriods.label);


  const exportParams = new URLSearchParams();
  if (period) exportParams.set("period", period);
  if (category) exportParams.set("category", category);
  if (query) exportParams.set("q", query);
  const exportHref = `/console/links/export?${exportParams.toString()}`;

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const statusOf = (l: (typeof links)[number]) =>
    !l.isActive ? "inactive" : l.expiresAt && l.expiresAt.getTime() <= now ? "expired" : "active";
  const statusLabel: Record<string, string> = { active: "Aktif", inactive: "Nonaktif", expired: "Kedaluwarsa" };
  const guide = await getGuide("tautan");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Tautan</h1>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="tautan" />}
        <Link
          href="/console/links/new"
          className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg hover:opacity-90 transition-colors"
        >
          Buat Tautan
        </Link>
        <a
          href={exportHref}
          className="bg-surface-container-low border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-surface-container-lowest transition-colors"
        >
          Unduh CSV
        </a>
      </div>
      <p className="text-body-md text-on-surface-variant mb-4">
        Tautan pendek <code>nanjing.ppitiongkok.com/l/xxx</code> untuk menyebarkan dokumentasi & berkas.
      </p>

      <form method="get" className="flex flex-wrap items-end gap-3 mb-6">
        <label className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Cari</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="judul tautan..."
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Periode</span>
          <select
            name="period"
            defaultValue={period ?? "all"}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md"
          >
            <option value="all">Semua</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kategori</span>
          <select
            name="category"
            defaultValue={category ?? "all"}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md"
          >
            <option value="all">Semua</option>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="bg-surface-container-low border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-surface-container-lowest transition-colors"
        >
          Filter
        </button>
      </form>

      <details className="mb-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
        <summary className="cursor-pointer text-body-md text-on-background">Kelola periode kepengurusan</summary>
        <PeriodForm />
        {periods.length > 0 && (
          <div className="mt-4 flex flex-col divide-y divide-outline-variant border border-outline-variant rounded-lg overflow-hidden">
            {periods.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface-container-lowest">
                <span className="text-body-md text-on-background">{p.label}</span>
                {p.isCurrent ? (
                  <span className="px-2.5 py-1 rounded-full text-label-caps bg-primary-container/40 text-on-primary-container shrink-0">
                    Aktif
                  </span>
                ) : (
                  <form action={setActivePeriod.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors shrink-0"
                    >
                      Tandai Aktif
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-body-sm text-on-surface-variant mt-3">
          Periode yang ditandai Aktif adalah yang dipakai modul Dokumen untuk menentukan folder mana yang bisa
          dibuka anggota. Cuma satu periode yang bisa aktif sekaligus &mdash; menandai satu otomatis menonaktifkan
          yang lain.
        </p>
      </details>

      <div className="hidden sm:block bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
        <table className="w-full text-body-md min-w-[820px]">
          <thead className="bg-surface-container-low text-label-caps uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="text-left px-5 py-3">Judul</th>
              <th className="text-left px-5 py-3">Slug</th>
              <th className="text-left px-5 py-3">Kategori</th>
              <th className="text-left px-5 py-3">Periode</th>
              <th className="text-left px-5 py-3">Klik</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Dibuat</th>
              <th className="text-left px-5 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-on-surface-variant">
                  Belum ada tautan.
                </td>
              </tr>
            )}
            {links.map((l) => {
              const st = statusOf(l);
              return (
                <tr key={l.id} className="border-t border-outline-variant hover:bg-surface-container-low transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/console/links/${l.id}`} className="font-medium text-primary-container hover:text-primary">
                      {l.title}
                    </Link>
                    <div className="text-label-caps text-on-surface-variant/80 truncate max-w-[260px]">{l.slug}</div>
                  </td>
                  <td className="px-5 py-3">
                    <CopyLinkButton slug={l.slug} />
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">{CATEGORY_LABEL[l.category] ?? l.category}</td>
                  <td className="px-5 py-3 text-on-surface-variant">{l.periodLabel ?? "-"}</td>
                  <td className="px-5 py-3 text-on-surface-variant">{l.clickCount}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-label-caps ${STATUS_CLASS[st]}`}>{statusLabel[st]}</span>
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">
                    {l.createdAt ? new Date(l.createdAt).toLocaleString("id-ID", { dateStyle: "medium" }) : "-"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <a href={`/console/links/${l.id}`} className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary">
                        Edit
                      </a>
                      <form action={toggleShortLink.bind(null, l.id)}>
                        <button
                          type="submit"
                          className="text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background transition-colors"
                        >
                          {l.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </form>
                      <ShortLinkDeleteButton action={deleteShortLink.bind(null, l.id)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden flex flex-col gap-3">
        {links.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Belum ada tautan.</p>
        ) : (
          links.map((l) => {
            const st = statusOf(l);
            return (
              <div key={l.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/console/links/${l.id}`} className="font-medium text-primary-container hover:text-primary">
                    {l.title}
                  </Link>
                  <span className={`px-2.5 py-1 rounded-full text-label-caps ${STATUS_CLASS[st]}`}>{statusLabel[st]}</span>
                </div>
                <div className="flex items-center gap-3 text-label-caps text-on-surface-variant">
                  <code className="text-on-background">{l.slug}</code>
                  <CopyLinkButton slug={l.slug} />
                </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-md">
                  <div>
                    <dt className="text-label-caps text-on-surface-variant">Kategori</dt>
                    <dd className="text-on-background">{CATEGORY_LABEL[l.category] ?? l.category}</dd>
                  </div>
                  <div>
                    <dt className="text-label-caps text-on-surface-variant">Periode</dt>
                    <dd className="text-on-background">{l.periodLabel ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-label-caps text-on-surface-variant">Klik</dt>
                    <dd className="text-on-background">{l.clickCount}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a href={`/console/links/${l.id}`} className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary">
                    Edit
                  </a>
                  <form action={toggleShortLink.bind(null, l.id)}>
                    <button
                      type="submit"
                      className="text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background transition-colors"
                    >
                      {l.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </form>
                  <ShortLinkDeleteButton action={deleteShortLink.bind(null, l.id)} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
